---
name: email-sender
description: Compose and send emails or save drafts via Gmail SMTP. USE THIS SKILL when a user asks to send, compose, write, draft, or email someone. Supports To, CC, BCC, and HTML or plain text bodies. Trigger phrases include "send an email", "email John about", "write a message to", "compose an email", "draft an email to", "mail the team about", "send a follow-up", "reply to", "forward to", "notify someone", "send a note to".
---

# Email Sender

Send emails and create drafts directly from Copilot CLI via Gmail SMTP. This skill fills the gap between read-only M365 queries (WorkIQ) and taking action on your email.

## CRITICAL: When to Use This Skill

**USE this skill when the user wants to SEND, COMPOSE, WRITE, or DRAFT an email.**

| User Says | Action |
|-----------|--------|
| "Send an email to John about the deadline" | Compose → confirm → `send_email` |
| "Draft an email to the team about sprint results" | `create_draft` |
| "Email Sarah the meeting notes" | Compose → confirm → `send_email` |
| "Write a follow-up to the budget discussion" | Compose → confirm → `send_email` |
| "Compose a message to my manager" | Compose → confirm → `send_email` |
| "Notify the team about the outage" | Compose → confirm → `send_email` |

## Safety: Always Confirm Before Sending

**NEVER call `send_email` without showing the user what will be sent and getting explicit confirmation.**

Follow this workflow:
1. Compose the email content
2. Show a preview to the user (recipients, subject, body)
3. Ask: "Ready to send this email?"
4. Only call `send_email` after the user confirms

If the user is unsure, use `create_draft` instead — it saves to Outlook Drafts without sending.

## Instructions

### Workflow A: Send Email (most common)

#### Step 1: Gather Information

From the user's request, identify:
- **To**: Recipient email addresses (required)
- **Subject**: Email subject line
- **Body**: Email content
- **CC/BCC**: Additional recipients (optional)
- **Importance**: low, normal, or high (default: normal)

If recipient email addresses are unknown, use `ask_work_iq` to look them up:

```
workiq-ask_work_iq (
  question: "What is John Smith's email address?"
)
```

#### Step 2: Compose and Preview

Write the email body based on the user's intent. Present a preview:

```
📧 EMAIL PREVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━
To:      john.smith@contoso.com
Subject: Pipeline Migration Update
Body:
  Hi John,

  Quick update on the data pipeline migration...

  Best regards
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready to send? (yes / edit / save as draft)
```

#### Step 3: Send or Draft

**If user confirms** → call `send_email`:

```
workiq-email-sender-send_email (
  to: ["john.smith@contoso.com"],
  subject: "Pipeline Migration Update",
  body: "Hi John,\n\nQuick update on the data pipeline migration...\n\nBest regards",
  body_type: "Text",
  importance: "normal"
)
```

**If user wants to review in Outlook** → call `create_draft`:

```
workiq-email-sender-create_draft (
  to: ["john.smith@contoso.com"],
  subject: "Pipeline Migration Update",
  body: "Hi John,\n\nQuick update on the data pipeline migration...\n\nBest regards",
  body_type: "Text"
)
```

### Workflow B: Draft → Review → Send

For sensitive emails where the user wants a two-step process:

#### Step 1: Create Draft
```
workiq-email-sender-create_draft (
  to: ["cfo@contoso.com"],
  subject: "Q1 Budget Proposal",
  body: "<html><body><h2>Q1 Budget Proposal</h2><p>...</p></body></html>",
  body_type: "HTML",
  importance: "high"
)
```

#### Step 2: User Reviews in Outlook

Tell the user: "Draft saved! Open Outlook to review it."

#### Step 3: Send the Draft (if requested)
```
workiq-email-sender-send_draft (
  draft_id: "<the draft ID returned in step 1>"
)
```

## MCP Tools

### send_email

Send an email immediately via Microsoft 365.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string[] | Yes | Recipient email addresses |
| `subject` | string | Yes | Subject line |
| `body` | string | Yes | Email body content |
| `cc` | string[] | No | CC recipients |
| `bcc` | string[] | No | BCC recipients |
| `body_type` | "Text" \| "HTML" | No | Body format (default: Text) |
| `importance` | "low" \| "normal" \| "high" | No | Importance level (default: normal) |

### create_draft

Save an email as a draft in Outlook (not sent).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string[] | Yes | Recipient email addresses |
| `subject` | string | Yes | Subject line |
| `body` | string | Yes | Email body content |
| `cc` | string[] | No | CC recipients |
| `bcc` | string[] | No | BCC recipients |
| `body_type` | "Text" \| "HTML" | No | Body format (default: Text) |
| `importance` | "low" \| "normal" \| "high" | No | Importance level (default: normal) |

### send_draft

Send an existing draft by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `draft_id` | string | Yes | Draft message ID from `create_draft` |

### refresh_auth

Clear cached tokens and re-authenticate with Microsoft 365. Use when other tools fail with `invalid_grant` or expired token errors.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| _(none)_ | — | — | No parameters needed |

## Error Recovery

If `send_email` or `create_draft` fails with `invalid_grant`:
1. Call `refresh_auth` to clear stale tokens and trigger device-code login
2. Follow the authentication instructions printed to stderr
3. Retry the original operation

## Required MCP Tools

| MCP Server | Tool | Purpose |
|---|---|---|
| workiq-email-sender | `send_email` | Send an email immediately |
| workiq-email-sender | `create_draft` | Save email as draft in Outlook |
| workiq-email-sender | `send_draft` | Send a previously created draft |
| workiq-email-sender | `refresh_auth` | Re-authenticate when tokens expire |
| workiq (Local WorkIQ CLI) | `ask_work_iq` | Look up recipient email addresses, reference prior emails for context |

## Examples

### Example 1: Quick email to a colleague

User: "Send John an email about the ETL pipeline being ready for testing"

1. Look up John's email via `ask_work_iq`
2. Compose message
3. Show preview → user confirms
4. `send_email` with to, subject, body

### Example 2: Formal HTML email with high importance

User: "Draft a high-importance email to the data platform team about the schema change"

1. Look up team DL via `ask_work_iq`
2. Compose HTML body with formatting
3. `create_draft` with body_type: "HTML", importance: "high"
4. User reviews in Outlook

### Example 3: Follow-up based on a meeting

User: "Send a follow-up email to everyone from yesterday's sprint planning with the action items"

1. Use `ask_work_iq` to get meeting attendees and discussion
2. Use `ask_work_iq` to get attendee emails
3. Compose follow-up with extracted action items
4. Show preview → user confirms
5. `send_email` to all attendees

## Error Handling

### Authentication or Permission Errors
- **Symptom**: `send_email` returns a 403 or authentication error
- **Cause**: Mail.Send permission not granted or token expired
- **Resolution**: Prompt user to re-authenticate. If persistent, admin consent may be needed for Mail.Send scope. See ADMIN-INSTRUCTIONS.md.

### Invalid Recipient Address
- **Symptom**: Graph API returns 400 with invalid recipient error
- **Resolution**: Verify the email address format. Use `ask_work_iq` to look up the correct address.

### Rate Limiting
- **Symptom**: Graph API returns 429
- **Resolution**: Wait and retry. If sending bulk, space out requests.

### Draft Not Found
- **Symptom**: `send_draft` returns 404
- **Cause**: Draft was already sent, deleted, or ID is stale
- **Resolution**: Create a new draft and try again.

## Tips

- Combine with **workiq** skill to reference prior emails, meetings, or documents when composing
- Use HTML body type for formatted emails with tables, headers, or links
- For sensitive emails, always use the draft → review → send workflow
- The `send_email` tool saves to Sent Items automatically
