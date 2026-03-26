#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import nodemailer from "nodemailer";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// -- Configuration ----------------------------------------------------------
// Credentials are read from Windows Credential Manager (target: WorkIQ-Gmail).
// Store them once with:
//   cmdkey /generic:WorkIQ-Gmail /user:your-email@gmail.com /pass:your-app-password
// Falls back to GMAIL_USER / GMAIL_APP_PASS env vars if Credential Manager is unavailable.

function getCredentials() {
  // Try Windows Credential Manager via a helper PowerShell script
  try {
    const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "get-cred.ps1");
    const out = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, {
      encoding: "utf-8",
      timeout: 10000,
    }).trim();
    const sep = out.indexOf("|");
    if (sep > 0) return { user: out.slice(0, sep), pass: out.slice(sep + 1) };
  } catch {
    // Fall through to env vars
  }

  // Fallback to env vars
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASS;
  if (user && pass) return { user, pass };

  throw new Error(
    "No Gmail credentials found. Either:\n" +
    "  1. Store in Windows Credential Manager: cmdkey /generic:WorkIQ-Gmail /user:you@gmail.com /pass:your-app-password\n" +
    "  2. Set env vars: GMAIL_USER and GMAIL_APP_PASS"
  );
}

function getTransporter() {
  const { user, pass } = getCredentials();
  return { transporter: nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  }), user };
}

// -- MCP Server -------------------------------------------------------------

const server = new McpServer({
  name: "workiq-email-sender",
  version: "2.0.0",
});

// Tool: send_email
server.tool(
  "send_email",
  "Send an email via Gmail SMTP. IMPORTANT: Always confirm with the user before calling this tool.",
  {
    to: z.array(z.string()).describe("Recipient email addresses"),
    subject: z.string().describe("Email subject line"),
    body: z.string().describe("Email body content"),
    cc: z.array(z.string()).optional().describe("CC email addresses"),
    bcc: z.array(z.string()).optional().describe("BCC email addresses"),
    body_type: z.enum(["Text", "HTML"]).optional().default("Text").describe("Body format: Text or HTML"),
  },
  async ({ to, subject, body, cc, bcc, body_type }) => {
    try {
      const { transporter, user } = getTransporter();
      const mailOptions = {
        from: user,
        to: to.join(", "),
        subject,
        ...(cc?.length && { cc: cc.join(", ") }),
        ...(bcc?.length && { bcc: bcc.join(", ") }),
        ...(body_type === "HTML" ? { html: body } : { text: body }),
      };

      const info = await transporter.sendMail(mailOptions);

      return {
        content: [
          {
            type: "text",
            text: `✅ Email sent successfully!\n\n📧 From: ${user}\n📧 To: ${to.join(", ")}\n📋 Subject: ${subject}${cc?.length ? `\nCC: ${cc.join(", ")}` : ""}${bcc?.length ? `\nBCC: ${bcc.join(", ")}` : ""}\n🆔 Message ID: ${info.messageId}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to send email: ${error.message}\n\nTroubleshooting:\n• Store credentials: cmdkey /generic:WorkIQ-Gmail /user:you@gmail.com /pass:your-app-password\n• Or set env vars: GMAIL_USER and GMAIL_APP_PASS\n• Verify the App Password is correct (https://myaccount.google.com/apppasswords)`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: create_draft
server.tool(
  "create_draft",
  "Create a draft email saved locally as a JSON file. Use this when the user wants to review before sending.",
  {
    to: z.array(z.string()).describe("Recipient email addresses"),
    subject: z.string().describe("Email subject line"),
    body: z.string().describe("Email body content"),
    cc: z.array(z.string()).optional().describe("CC email addresses"),
    bcc: z.array(z.string()).optional().describe("BCC email addresses"),
    body_type: z.enum(["Text", "HTML"]).optional().default("Text").describe("Body format: Text or HTML"),
  },
  async ({ to, subject, body, cc, bcc, body_type }) => {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const os = await import("os");

      const draftDir = path.join(os.homedir(), ".workiq-email-sender", "drafts");
      if (!fs.existsSync(draftDir)) fs.mkdirSync(draftDir, { recursive: true });

      const { user } = getCredentials();
      const draftId = `draft-${Date.now()}`;
      const draft = { id: draftId, from: user, to, cc, bcc, subject, body, body_type, created: new Date().toISOString() };
      const draftPath = path.join(draftDir, `${draftId}.json`);
      fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2));

      return {
        content: [
          {
            type: "text",
            text: `📝 Draft saved!\n\n📧 To: ${to.join(", ")}\n📋 Subject: ${subject}\n🆔 Draft ID: ${draftId}\n📂 Saved to: ${draftPath}\n\nUse send_draft with this ID to send it.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Failed to create draft: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: send_draft
server.tool(
  "send_draft",
  "Send a previously saved draft email by its draft ID.",
  {
    draft_id: z.string().describe("The draft ID returned by create_draft"),
  },
  async ({ draft_id }) => {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const os = await import("os");

      const draftPath = path.join(os.homedir(), ".workiq-email-sender", "drafts", `${draft_id}.json`);
      if (!fs.existsSync(draftPath)) throw new Error(`Draft not found: ${draft_id}`);

      const draft = JSON.parse(fs.readFileSync(draftPath, "utf-8"));
      const { transporter } = getTransporter();
      const mailOptions = {
        from: draft.from,
        to: draft.to.join(", "),
        subject: draft.subject,
        ...(draft.cc?.length && { cc: draft.cc.join(", ") }),
        ...(draft.bcc?.length && { bcc: draft.bcc.join(", ") }),
        ...(draft.body_type === "HTML" ? { html: draft.body } : { text: draft.body }),
      };

      const info = await transporter.sendMail(mailOptions);
      fs.unlinkSync(draftPath);

      return {
        content: [
          {
            type: "text",
            text: `✅ Draft sent successfully!\n\n📧 To: ${draft.to.join(", ")}\n📋 Subject: ${draft.subject}\n🆔 Message ID: ${info.messageId}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Failed to send draft: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// -- Start server -----------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
