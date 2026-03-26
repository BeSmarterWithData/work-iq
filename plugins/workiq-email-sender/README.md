# WorkIQ Email Sender

> Compose and send emails via Gmail SMTP directly from GitHub Copilot CLI.

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

2. Enable **2-Step Verification** on your Google account if not already enabled.

3. Generate a **Gmail App Password** at https://myaccount.google.com/apppasswords

4. Set the required environment variables:

```bash
export GMAIL_USER="your-email@gmail.com"
export GMAIL_APP_PASS="your-16-char-app-password"
```

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
| `send_email` | Send an email immediately via Gmail SMTP |
| `create_draft` | Save an email draft locally as JSON |
| `send_draft` | Send a previously created draft by ID |

## Environment Variables (Required)

| Variable | Description |
|----------|-------------|
| `GMAIL_USER` | Your Gmail address (e.g. `user@gmail.com`) |
| `GMAIL_APP_PASS` | Gmail App Password (from https://myaccount.google.com/apppasswords) |

## Platform Support

Supported on `win_x64`, `win_arm64`, `linux_x64`, `linux_arm64`, `osx_x64`, and `osx_arm64`.

## License

See the root [LICENSE](../../LICENSE) file.
