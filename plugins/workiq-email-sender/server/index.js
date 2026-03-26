#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as msal from "@azure/msal-node";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// -- Configuration ----------------------------------------------------------

// Uses the same Entra app registration as WorkIQ CLI.
// If you have a different app, update these values or set env vars.
const CLIENT_ID = process.env.WORKIQ_EMAIL_CLIENT_ID || "b8058408-82b2-4b47-b13d-b547be0310d8";
const TENANT_ID = process.env.WORKIQ_EMAIL_TENANT_ID || "common";
const AUTHORITY = `https://login.microsoftonline.com/${TENANT_ID}`;
const SCOPES = ["https://graph.microsoft.com/Mail.Send", "https://graph.microsoft.com/Mail.ReadWrite"];

const TOKEN_CACHE_DIR = path.join(os.homedir(), ".workiq-email-sender");
const TOKEN_CACHE_FILE = path.join(TOKEN_CACHE_DIR, "token-cache.json");

// -- MSAL helpers -----------------------------------------------------------

function buildPca() {
  const config = {
    auth: { clientId: CLIENT_ID, authority: AUTHORITY },
    cache: { cachePlugin: undefined },
  };
  const pca = new msal.PublicClientApplication(config);

  // Restore persisted token cache
  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    try {
      const cacheData = fs.readFileSync(TOKEN_CACHE_FILE, "utf-8");
      pca.getTokenCache().deserialize(cacheData);
    } catch {
      // Corrupted cache – ignore and re-auth
    }
  }
  return pca;
}

function persistCache(pca) {
  try {
    if (!fs.existsSync(TOKEN_CACHE_DIR)) {
      fs.mkdirSync(TOKEN_CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(TOKEN_CACHE_FILE, pca.getTokenCache().serialize());
  } catch {
    // Non-fatal
  }
}

async function getAccessToken(pca) {
  // 1. Try silent (cached token / refresh token)
  const accounts = await pca.getTokenCache().getAllAccounts();
  if (accounts.length > 0) {
    try {
      const silent = await pca.acquireTokenSilent({
        account: accounts[0],
        scopes: SCOPES,
      });
      persistCache(pca);
      return silent.accessToken;
    } catch {
      // Fall through to interactive
    }
  }

  // 2. Device-code flow (user authenticates in browser)
  const deviceCodeRequest = {
    scopes: SCOPES,
    deviceCodeCallback: (response) => {
      // Print to stderr so it doesn't interfere with MCP stdio
      process.stderr.write(`\n🔑 AUTH REQUIRED: ${response.message}\n\n`);
    },
  };
  const result = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
  persistCache(pca);
  return result.accessToken;
}

// -- Graph API helpers ------------------------------------------------------

function graphRequest(method, urlPath, accessToken, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "graph.microsoft.com",
      path: `/v1.0${urlPath}`,
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : {});
        } else {
          reject(new Error(`Graph API ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function buildMessage({ to, cc, bcc, subject, body, bodyType, importance }) {
  const toRecipients = to.map((addr) => ({
    emailAddress: { address: addr.trim() },
  }));

  const ccRecipients = (cc || []).map((addr) => ({
    emailAddress: { address: addr.trim() },
  }));

  const bccRecipients = (bcc || []).map((addr) => ({
    emailAddress: { address: addr.trim() },
  }));

  return {
    subject,
    body: { contentType: bodyType || "Text", content: body },
    toRecipients,
    ...(ccRecipients.length > 0 && { ccRecipients }),
    ...(bccRecipients.length > 0 && { bccRecipients }),
    ...(importance && { importance }),
  };
}

// -- MCP Server -------------------------------------------------------------

const pca = buildPca();

const server = new McpServer({
  name: "workiq-email-sender",
  version: "1.0.0",
});

// Tool: send_email
server.tool(
  "send_email",
  "Send an email via Outlook/Microsoft 365. Requires Mail.Send permission. IMPORTANT: Always confirm with the user before calling this tool.",
  {
    to: z.array(z.string()).describe("Recipient email addresses"),
    subject: z.string().describe("Email subject line"),
    body: z.string().describe("Email body content"),
    cc: z.array(z.string()).optional().describe("CC email addresses"),
    bcc: z.array(z.string()).optional().describe("BCC email addresses"),
    body_type: z.enum(["Text", "HTML"]).optional().default("Text").describe("Body format: Text or HTML"),
    importance: z.enum(["low", "normal", "high"]).optional().default("normal").describe("Email importance level"),
  },
  async ({ to, subject, body, cc, bcc, body_type, importance }) => {
    try {
      const accessToken = await getAccessToken(pca);
      const message = buildMessage({ to, cc, bcc, subject, body, bodyType: body_type, importance });

      await graphRequest("POST", "/me/sendMail", accessToken, {
        message,
        saveToSentItems: true,
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ Email sent successfully!\n\n📧 To: ${to.join(", ")}\n📋 Subject: ${subject}${cc?.length ? `\nCC: ${cc.join(", ")}` : ""}${bcc?.length ? `\nBCC: ${bcc.join(", ")}` : ""}\n📌 Importance: ${importance || "normal"}\n📁 Saved to Sent Items`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to send email: ${error.message}\n\nTroubleshooting:\n• Ensure Mail.Send permission is granted\n• Check the recipient addresses are valid\n• Re-authenticate if the token expired`,
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
  "Create a draft email in Outlook (saved to Drafts folder, not sent). Useful for composing emails the user wants to review before sending.",
  {
    to: z.array(z.string()).describe("Recipient email addresses"),
    subject: z.string().describe("Email subject line"),
    body: z.string().describe("Email body content"),
    cc: z.array(z.string()).optional().describe("CC email addresses"),
    bcc: z.array(z.string()).optional().describe("BCC email addresses"),
    body_type: z.enum(["Text", "HTML"]).optional().default("Text").describe("Body format: Text or HTML"),
    importance: z.enum(["low", "normal", "high"]).optional().default("normal").describe("Email importance level"),
  },
  async ({ to, subject, body, cc, bcc, body_type, importance }) => {
    try {
      const accessToken = await getAccessToken(pca);
      const message = buildMessage({ to, cc, bcc, subject, body, bodyType: body_type, importance });

      const draft = await graphRequest("POST", "/me/messages", accessToken, message);

      return {
        content: [
          {
            type: "text",
            text: `📝 Draft created successfully!\n\n📧 To: ${to.join(", ")}\n📋 Subject: ${subject}${cc?.length ? `\nCC: ${cc.join(", ")}` : ""}${bcc?.length ? `\nBCC: ${bcc.join(", ")}` : ""}\n📌 Importance: ${importance || "normal"}\n📂 Saved to Drafts folder\n🔗 Draft ID: ${draft.id}\n\nOpen Outlook to review and send the draft.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to create draft: ${error.message}\n\nTroubleshooting:\n• Ensure Mail.ReadWrite permission is granted\n• Check the recipient addresses are valid\n• Re-authenticate if the token expired`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: send_draft
server.tool(
  "send_draft",
  "Send an existing draft email by its draft ID. Use create_draft first, then send_draft after user confirms.",
  {
    draft_id: z.string().describe("The draft message ID returned by create_draft"),
  },
  async ({ draft_id }) => {
    try {
      const accessToken = await getAccessToken(pca);
      await graphRequest("POST", `/me/messages/${draft_id}/send`, accessToken, null);

      return {
        content: [
          {
            type: "text",
            text: `✅ Draft sent successfully! The email has been sent and moved to Sent Items.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to send draft: ${error.message}\n\nTroubleshooting:\n• Ensure the draft ID is valid and hasn't already been sent\n• Re-authenticate if the token expired`,
          },
        ],
        isError: true,
      };
    }
  }
);

// -- Start server -----------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
