# Microsoft Work IQ — Plugin Marketplace

> The official Microsoft Work IQ plugin collection for GitHub Copilot ✨

Extend the power of GitHub Copilot with Work IQ plugins — MCP servers, skills, and tools that connect AI assistants to your Microsoft 365 data.

> ⚠️ **Public Preview:** Features and APIs may change.

---

## 🔌 What's Inside

| Plugin | Description |
|--------|-------------|
| [**workiq**](./plugins/workiq/) | Query Microsoft 365 data with natural language — emails, meetings, documents, Teams messages, and more. |
| [**m365-agents-toolkit**](./plugins/m365-agents-toolkit/) | Toolkit for building M365 Copilot declarative agents — scaffolding, manifest authoring, and capability configuration. |

---

## 🚀 Quick Start with GitHub Copilot CLI

```bash
# 1. Open GitHub Copilot CLI
copilot

# 2. Add this plugin marketplace (one-time setup)
/plugin marketplace add microsoft/work-iq

# 3. Install any plugin
/plugin install workiq@work-iq
/plugin install m365-agents-toolkit@work-iq
```

**That's it!** Restart Copilot CLI and start using the plugin:

```
You: What are my upcoming meetings this week?
You: Summarize emails from Sarah about the budget
You: Find documents I worked on yesterday
```

---

## 📦 Alternative: Standalone MCP Installation

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect/mcp/install?name=workiq&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40microsoft%2Fworkiq%22%2C%22mcp%22%5D%7D)
[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=workiq&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40microsoft%2Fworkiq%22%2C%22mcp%22%5D%7D&quality=insiders)

Each plugin can also be used as a standalone MCP server. See the plugin's own README for configuration:

```json
{
  "workiq": {
    "command": "npx",
    "args": ["-y", "@microsoft/workiq@latest", "mcp"],
    "tools": ["*"]
  }
}
```

---

## 🗂️ Repository Structure

```
work-iq/
├── .github/
│   └── plugin/
│       └── marketplace.json            # Central plugin registry
├── plugins/
│   ├── workiq/                         # Work IQ plugin
│   │   ├── .mcp.json                   # MCP server configuration
│   │   ├── README.md                   # Plugin documentation
│   │   └── skills/
│   │       └── workiq/
│   │           └── SKILL.md            # Skill definition
│   └── m365-agents-toolkit/            # M365 Agents Toolkit plugin
│       ├── README.md                   # Plugin documentation
│       ├── agents/
│       │   └── m365-agents-toolkit.md  # Agent orchestrator
│       └── skills/
│           ├── install-atk/
│           │   └── SKILL.md            # ATK install skill
│           └── m365-agent-developer/
│               ├── SKILL.md            # Developer skill
│               └── references/         # Guides, schemas, examples
├── CONTRIBUTING.md                     # How to add a plugin
├── README.md                           # This file
├── LICENSE
└── SECURITY.md
```

---

## 🤝 Contributing

We welcome new plugins! See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide. In short:

1. Create your plugin under `plugins/{your-plugin}/`
2. Add `.mcp.json`, `README.md`, and `skills/{name}/SKILL.md`
3. Register it in `.github/plugin/marketplace.json`
4. Submit a pull request

---

## 📄 License

By using this package, you accept the license agreement. See [NOTICES.TXT](./NOTICES.TXT) and EULA within the package for legal terms.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general). Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third-party's policies.
