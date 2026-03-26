# WorkIQ Email Sender

> Compose and send Outlook emails directly from GitHub Copilot CLI via Microsoft Graph API.

## What It Does

Fills the gap between read-only M365 queries (WorkIQ) and taking action — now you can **send emails** and **create drafts** without leaving Copilot.

## Installation

### Via GitHub Copilot CLI Plugin Marketplace

```bash
/plugin install workiq-email-sender@work-iq
```

### First-Time Setup

1. Install dependencies (one-time):

```bash
cd plugins/workiq-email-sender/server && npm install
```

2. On first use, you'll be prompted to authenticate via device code flow in your browser.

3. **Admin consent** may be required for `Mail.Send` and `Mail.ReadWrite` permissions. See the [Tenant Administrator Enablement Guide](../../ADMIN-INSTRUCTIONS.md).

## Usage

```
# Send an email
"Send an email to John about the pipeline migration"

# Draft for review
"Draft an email to the CFO about Q1 budget"

# Follow-up from a meeting
"Send a follow-up to sprint planning attendees with action items"

# Formatted email
"Compose an HTML email to the data team with a summary table"
```

## Skills

| Skill | Description |
|-------|-------------|
| [**email-sender**](./skills/email-sender/SKILL.md) | Compose and send Outlook emails or save drafts |

## MCP Tools

| Tool | Description |
|------|-------------|
| `send_email` | Send an email immediately via Microsoft 365 |
| `create_draft` | Save an email as draft in Outlook Drafts folder |
| `send_draft` | Send a previously created draft by ID |

## Environment Variables (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `WORKIQ_EMAIL_CLIENT_ID` | Entra app registration Client ID | WorkIQ default app |
| `WORKIQ_EMAIL_TENANT_ID` | Entra tenant ID | `common` |

## Platform Support

Supported on `win_x64`, `win_arm64`, `linux_x64`, `linux_arm64`, `osx_x64`, and `osx_arm64`.

## License

See the root [LICENSE](../../LICENSE) file.
