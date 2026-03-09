# MCP Server Plugin Integration

This guide explains how to integrate Model Context Protocol (MCP) servers as actions in your Microsoft 365 Copilot agent using JSON manifests.

## ⚠️ CRITICAL: Two Files Required

MCP plugin integration requires **TWO separate files**. Both are MANDATORY:

1. **`{name}-plugin.json`** - The plugin manifest (references the tools file)
2. **`{name}-mcp-tools.json`** - The MCP tools description file (generated from MCP server)

🚨 **YOU MUST CREATE BOTH FILES.** The plugin will NOT work without the tools file.

## Overview

MCP servers expose tools that can be consumed by your agent. Unlike OpenAPI-based plugins, MCP plugins use a `RemoteMCPServer` runtime type and require a tools description file.

> **⚠️ IMPORTANT:** `atk add action` does NOT support MCP servers — it only supports `--api-plugin-type api-spec` for OpenAPI plugins. MCP plugins MUST be created manually following the steps below. This is NOT a violation of the "Always Use `atk add action`" rule — that rule applies only to OpenAPI/REST API plugins.

## Prerequisites

- MCP server URL (must be accessible via HTTP/HTTPS)
- Node.js installed (for MCP Inspector)

---

## Step-by-Step Integration

### Step 1: Get MCP Server URL

Ask the user for the MCP server URL. Example: `https://learn.microsoft.com/api/mcp`

### Step 2: Generate the MCP Tools File (MANDATORY)

🚨 **THIS STEP IS MANDATORY - DO NOT SKIP**

Run the MCP Inspector to discover and save the tools:

```bash
npx --yes @modelcontextprotocol/inspector --cli {MCP_SERVER_URL} --transport http --method tools/list
```

**Example:**
```bash
npx --yes @modelcontextprotocol/inspector --cli https://learn.microsoft.com/api/mcp --transport http --method tools/list
```

**⚠️ IMPORTANT:** You MUST run this command and save the output to create the tools file. The plugin manifest references this file and will fail without it.

Save the output as `appPackage/{name}-mcp-tools.json`.

**Expected output file structure (`{name}-mcp-tools.json`):**
```json
{
  "tools": [
    {
      "name": "tool_name",
      "description": "Tool description",
      "inputSchema": {
        "type": "object",
        "properties": { ... },
        "required": [...]
      }
    }
  ]
}
```

### Step 3: Create the Plugin Manifest

Create `{name}-plugin.json` in the `appPackage` folder:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/copilot/plugin/v2.4/schema.json",
  "schema_version": "v2.4",
  "name_for_human": "{NAME-FOR-HUMAN}",
  "description_for_human": "{DESCRIPTION-FOR-HUMAN}",
  "contact_email": "publisher-email@example.com",
  "namespace": "simplename",
  "functions": [],
  "runtimes": []
}
```

**Required fields:**
| Field | Description |
|-------|-------------|
| `name_for_human` | Display name shown to users (max 20 characters) |
| `description_for_human` | Brief description of the plugin (max 100 characters) |
| `namespace` | Unique identifier, lowercase alphanumeric only |
| `contact_email` | Publisher contact email |

### Step 4: Add Functions from Tools File

Read the `{name}-mcp-tools.json` file you created in Step 2. For EACH tool in the `tools` array, add a corresponding function entry that preserves **ALL** tool properties:

```json
{
  "functions": [
    {
      "name": "microsoft_docs_search",
      "description": "Search official Microsoft/Azure documentation to find the most relevant content for a user's query.",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "A query or topic about Microsoft/Azure products"
          }
        },
        "required": ["query"]
      }
    },
    {
      "name": "microsoft_docs_fetch",
      "description": "Fetch and convert a Microsoft Learn documentation page to markdown format.",
      "parameters": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string",
            "description": "URL of the Microsoft documentation page to read"
          }
        },
        "required": ["url"]
      }
    }
  ]
}
```

**🚨 CRITICAL: Preserve ALL tool properties when mapping from the tools file:**

| MCP Tools File (`inputSchema`) | Plugin Manifest (`functions[]`) |
|-------------------------------|-------------------------------|
| `name` | `name` — copy EXACTLY, do not rename |
| `description` | `description` — use the **full** description text, do NOT abbreviate or summarize |
| `inputSchema` | `parameters` — copy the entire `inputSchema` object as the `parameters` value |
| `inputSchema.properties` | `parameters.properties` — include ALL properties with their `type`, `description`, and any `enum` values |
| `inputSchema.required` | `parameters.required` — include the full required array |

**Why this matters:** The model uses `description` and `parameters` from the plugin manifest to decide when and how to invoke each tool. If descriptions are shortened or parameters are omitted, the model loses context about what each tool does and what inputs it accepts, leading to incorrect or failed tool calls.

### Step 5: Configure the Runtime

Add the `RemoteMCPServer` runtime that references the tools file:

```json
{
  "runtimes": [
    {
      "type": "RemoteMCPServer",
      "spec": {
        "url": "{MCP_SERVER_URL}",
        "mcp_tool_description": {
          "file": "{name}-mcp-tools.json"
        }
      },
      "run_for_functions": [
        "function_name_1",
        "function_name_2"
      ]
    }
  ]
}
```

**⚠️ The `file` field MUST point to the tools file created in Step 2.**

### Step 6: Register Plugin in Agent Manifest

Add the plugin to your `declarative-agent.json`:

```json
{
  "actions": [
    {
      "id": "mcpPlugin",
      "file": "{name}-plugin.json"
    }
  ]
}
```

---

## Complete Workflow Checklist

```
□ Step 1: Get MCP server URL from user
□ Step 2: Run MCP Inspector and CREATE {name}-mcp-tools.json file  ← MANDATORY
□ Step 3: Create {name}-plugin.json with basic structure
□ Step 4: Add functions array (one entry per tool from tools file)
□ Step 5: Add runtime with RemoteMCPServer type
□ Step 6: Verify BOTH files exist in appPackage folder
□ Step 7: Register plugin in declarative-agent.json
□ Step 8: Run atk provision
```

---

## Complete Example

For the Microsoft Learn MCP server at `https://learn.microsoft.com/api/mcp`:

### File 1: `appPackage/docs-mcp-tools.json` (MANDATORY - CREATE THIS FIRST)

```json
{
  "tools": [
    {
      "name": "microsoft_docs_search",
      "description": "Search official Microsoft/Azure documentation to find the most relevant content for a user's query.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "A query or topic about Microsoft/Azure products"
          }
        },
        "required": ["query"]
      }
    },
    {
      "name": "microsoft_docs_fetch",
      "description": "Fetch and convert a Microsoft Learn documentation page to markdown format.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string",
            "description": "URL of the Microsoft documentation page to read"
          }
        },
        "required": ["url"]
      }
    },
    {
      "name": "microsoft_code_sample_search",
      "description": "Search for code snippets and examples in official Microsoft Learn documentation.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "A descriptive query, SDK name, method name or code snippet"
          },
          "language": {
            "type": "string",
            "description": "Programming language filter"
          }
        },
        "required": ["query"]
      }
    }
  ]
}
```

### File 2: `appPackage/docs-plugin.json`

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/copilot/plugin/v2.4/schema.json",
  "schema_version": "v2.4",
  "name_for_human": "Microsoft Docs",
  "description_for_human": "Search and fetch Microsoft Learn documentation",
  "contact_email": "publisher@example.com",
  "namespace": "msdocs",
  "functions": [
    {
      "name": "microsoft_docs_search",
      "description": "Search official Microsoft/Azure documentation to find the most relevant content for a user's query.",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "A query or topic about Microsoft/Azure products"
          }
        },
        "required": ["query"]
      }
    },
    {
      "name": "microsoft_docs_fetch",
      "description": "Fetch and convert a Microsoft Learn documentation page to markdown format.",
      "parameters": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string",
            "description": "URL of the Microsoft documentation page to read"
          }
        },
        "required": ["url"]
      }
    },
    {
      "name": "microsoft_code_sample_search",
      "description": "Search for code snippets and examples in official Microsoft Learn documentation.",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "A descriptive query, SDK name, method name or code snippet"
          },
          "language": {
            "type": "string",
            "description": "Programming language filter"
          }
        },
        "required": ["query"]
      }
    }
  ],
  "runtimes": [
    {
      "type": "RemoteMCPServer",
      "spec": {
        "url": "https://learn.microsoft.com/api/mcp",
        "mcp_tool_description": {
          "file": "docs-mcp-tools.json"
        }
      },
      "run_for_functions": [
        "microsoft_docs_search",
        "microsoft_docs_fetch",
        "microsoft_code_sample_search"
      ]
    }
  ]
}
```

### Register in `declarative-agent.json`

```json
{
  "actions": [
    {
      "id": "docsPlugin",
      "file": "docs-plugin.json"
    }
  ]
}
```

---

## MCP Inspector Commands

### List available tools
```bash
npx --yes @modelcontextprotocol/inspector --cli {MCP_URL} --transport http --method tools/list
```

### Test a specific tool
```bash
npx --yes @modelcontextprotocol/inspector --cli {MCP_URL} --transport http --method tools/call --tool-name {TOOL_NAME} --tool-arg key=value
```

### Get server info
```bash
npx --yes @modelcontextprotocol/inspector --cli {MCP_URL} --transport http --method initialize
```

---

## Multiple MCP Servers

You can integrate multiple MCP servers by adding multiple runtimes. Each server needs its own tools file:

```json
{
  "functions": [
    {
      "name": "docs_search",
      "description": "Search official Microsoft/Azure documentation to find the most relevant content for a user's query.",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "A query or topic about Microsoft/Azure products"
          }
        },
        "required": ["query"]
      }
    },
    {
      "name": "github_search",
      "description": "Search GitHub repositories, issues, and pull requests for relevant results.",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Search query for GitHub"
          }
        },
        "required": ["query"]
      }
    }
  ],
  "runtimes": [
    {
      "type": "RemoteMCPServer",
      "spec": {
        "url": "https://learn.microsoft.com/api/mcp",
        "mcp_tool_description": { "file": "docs-mcp-tools.json" }
      },
      "run_for_functions": ["docs_search"]
    },
    {
      "type": "RemoteMCPServer",
      "spec": {
        "url": "https://api.github.com/mcp",
        "mcp_tool_description": { "file": "github-mcp-tools.json" }
      },
      "run_for_functions": ["github_search"]
    }
  ]
}
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Plugin fails to load | Verify BOTH files exist: `{name}-plugin.json` AND `{name}-mcp-tools.json` |
| MCP Inspector fails | Ensure the server URL is correct and accessible |
| Tools not recognized | Verify function names match exactly between manifest and tools file |
| Runtime errors | Check that `run_for_functions` includes all functions using that runtime |
| Missing tools file | Run MCP Inspector and save output to `{name}-mcp-tools.json` |

---

## Best Practices

1. **Always create the tools file first** - Generate it from MCP Inspector before writing the plugin manifest
2. **Preserve ALL tool properties** - Copy the full `description` and complete `inputSchema` → `parameters` for every function; never abbreviate or omit fields
3. **Version control both files** - Keep both `{name}-plugin.json` and `{name}-mcp-tools.json` in source control
4. **Match function names exactly** - Copy tool names directly from the tools file
5. **Test locally first** - Use MCP Inspector to verify tools work before integration
6. **Selective tool exposure** - Only include tools relevant to your agent's purpose, but for included tools always keep the full description and parameters
