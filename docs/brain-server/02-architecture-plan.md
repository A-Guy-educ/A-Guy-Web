# Brain Server — Architecture Plan

Detailed plan for setting up Context+ as a persistent brain server for the Cody pipeline.

---

## Overview

A persistent Context+ MCP server on a Hetzner VPS provides code intelligence (AST, semantic search, memory graph) to the Cody pipeline. The architect stage (Claude Opus) connects as an MCP client to explore the codebase intelligently. Executor stages (OpenCode) also connect for context during build/review.

## Architecture

```
+----------------------------------------+
|     Architect (Remote Brain)            |
|     Claude Opus (Anthropic SDK)         |
|     MCP Client (@modelcontextprotocol)  |
|                                         |
|  Replaces: taskify + gap + architect    |
|  Outputs:  task.json + plan.md          |
+----------+-------------+---------------+
           |             |
      MCP/SSE       Claude API
           |             |
           v             |
+------------------+     |
|  supergateway    |     |
|  (HTTP/SSE proxy)|     |
+--------+---------+     |
         | stdio         |
         v               |
+------------------+     |
|  Context+        |     |
|  (Read-only)     |     |
|  + Ollama        |     |
|                  |     |
|  Hetzner CX32    |     |
|  Tailscale       |     |
+------------------+     |
         ^               |
         | MCP/SSE       |
         |               |
+--------+---------------+---------------+
|     Cody Pipeline Engine (Executor)     |
|     OpenCode: build -> review -> verify |
|     -> commit -> pr                     |
|                                         |
|  Fallback: if brain down, run current   |
|  taskify + gap + architect stages       |
+-----------------------------------------+
```

## Decisions Made

| Decision         | Choice                                 | Reasoning                                  |
| ---------------- | -------------------------------------- | ------------------------------------------ |
| MCP transport    | supergateway (stdio -> HTTP/SSE proxy) | Zero effort, no fork needed                |
| CI access        | Tailscale on GitHub Actions runners    | Already use Tailscale for remote-agent     |
| Repo sync        | GitHub webhook -> git pull             | Real-time sync on push                     |
| Architect client | Anthropic SDK + MCP SDK                | MCP for tools, Anthropic for reasoning     |
| Fallback         | Fall back to current 3-stage flow      | Pipeline must not break if VPS is down     |
| Embeddings       | Ollama nomic-embed-text on VPS         | No fork needed, lightweight on CPU         |
| Write tools      | Disabled on brain                      | Read-only brain, executor handles writes   |
| VPS              | Hetzner CX32 (4 vCPU, 8GB RAM, $7/mo)  | Sufficient for Node.js + Ollama embeddings |

## Context+ (Open Source)

- Repository: https://github.com/ForLoopCodes/contextplus
- License: MIT (free, no restrictions)
- Language: TypeScript
- 1.5k stars, actively maintained

### Tools Available (17 total)

#### Discovery (used by architect)

- `get_context_tree` — Project structure with AST symbols and line ranges
- `get_file_skeleton` — Function signatures without full bodies
- `semantic_code_search` — Search by meaning using embeddings
- `semantic_identifier_search` — Find functions/classes by semantic intent
- `semantic_navigate` — Browse codebase by meaning (spectral clustering)

#### Analysis (used by architect + executor)

- `get_blast_radius` — Trace every file where a symbol is used
- `run_static_analysis` — Native linter/compiler for type errors, dead code

#### Memory (persistent across runs)

- `upsert_memory_node` — Create/update knowledge nodes
- `create_relation` — Link nodes with typed edges
- `search_memory_graph` — Semantic search + graph traversal
- `prune_stale_links` — Remove decayed edges
- `add_interlinked_context` — Bulk-add with auto-similarity linking
- `retrieve_with_traversal` — Walk graph from a starting node

#### Code Ops (DISABLED on brain — read-only)

- `propose_commit` — DISABLED
- `undo_change` — DISABLED
- `list_restore_points` — DISABLED

#### Navigation

- `get_feature_hub` — Obsidian-style feature hub with wikilinks

## Phase 1: VPS Setup (~1-2 hours)

Prerequisite: Complete requirements setup (01-requirements-setup.md)

| Step | Action                                        | Verify                           |
| ---- | --------------------------------------------- | -------------------------------- |
| 1.1  | Provision Hetzner CX32, Ubuntu 24.04, SSH key | SSH in works                     |
| 1.2  | Install Docker + Docker Compose               | `docker run hello-world`         |
| 1.3  | Install Tailscale, join tailnet               | `ping` from Mac via Tailscale IP |
| 1.4  | Firewall: SSH only public, rest via Tailscale | `ufw status` shows only SSH      |

## Phase 2: Docker Stack (~2-3 hours)

### docker-compose.yml

```yaml
version: "3.8"
services:
  contextplus:
    image: node:22-slim
    working_dir: /repo
    command: npx contextplus /repo
    volumes:
      - /opt/repo:/repo:ro
      - mcp-data:/repo/.mcp_data
    environment:
      - OLLAMA_EMBED_MODEL=nomic-embed-text
      - OLLAMA_HOST=http://ollama:11434
      - OLLAMA_CHAT_MODEL=gemma2:2b
      - CONTEXTPLUS_EMBED_TRACKER=true
    depends_on:
      - ollama
    restart: always

  supergateway:
    image: node:22-slim
    command: npx supergateway --stdio "npx contextplus /repo" --port 4097 --host 0.0.0.0
    ports:
      - "4097:4097"
    volumes:
      - /opt/repo:/repo:ro
      - mcp-data:/repo/.mcp_data
    environment:
      - OLLAMA_EMBED_MODEL=nomic-embed-text
      - OLLAMA_HOST=http://ollama:11434
      - OLLAMA_CHAT_MODEL=gemma2:2b
    depends_on:
      - ollama
    restart: always

  ollama:
    image: ollama/ollama
    volumes:
      - ollama-data:/root/.ollama
    restart: always

  webhook:
    image: node:22-slim
    working_dir: /app
    command: node webhook-server.js
    ports:
      - "9000:9000"
    volumes:
      - /opt/repo:/repo
      - ./webhook-server.js:/app/webhook-server.js:ro
    environment:
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
      - REPO_DIR=/repo
    restart: always

volumes:
  ollama-data:
  mcp-data:
```

Note: The supergateway + contextplus may need to be combined into a single container or use a different approach. The exact supergateway invocation needs testing.

| Step | Action                                                                  | Verify                                |
| ---- | ----------------------------------------------------------------------- | ------------------------------------- |
| 2.1  | Create docker-compose.yml on VPS                                        | File exists at /opt/brain-server/     |
| 2.2  | `docker compose up -d ollama`                                           | Ollama running                        |
| 2.3  | Pull embedding model: `docker exec ollama ollama pull nomic-embed-text` | Model downloaded                      |
| 2.4  | Pull chat model: `docker exec ollama ollama pull gemma2:2b`             | Model downloaded                      |
| 2.5  | `docker compose up -d`                                                  | All services running                  |
| 2.6  | Verify Context+ indexes repo                                            | Check logs for "running on stdio"     |
| 2.7  | Verify supergateway exposes HTTP/SSE                                    | `curl http://localhost:4097` responds |

## Phase 3: Network & CI Access (~1 hour)

| Step | Action                                              | Verify                         |
| ---- | --------------------------------------------------- | ------------------------------ |
| 3.1  | Context+ accessible at `http://<tailscale-ip>:4097` | curl from Mac works            |
| 3.2  | Add `tailscale/github-action` to CI workflows       | Action runs, gets Tailscale IP |
| 3.3  | Test CI can reach VPS                               | curl from CI runner works      |

### GitHub Actions Tailscale Setup

```yaml
- name: Setup Tailscale
  uses: tailscale/github-action@v2
  with:
    authkey: ${{ secrets.TAILSCALE_AUTHKEY }}
    version: latest
```

## Phase 4: OpenCode Integration (~2-4 hours)

Add Context+ as MCP server in opencode.json:

```json
{
  "mcp": {
    "contextplus": {
      "type": "remote",
      "url": "http://<tailscale-ip>:4097/sse"
    }
  }
}
```

Note: Exact config format depends on how supergateway exposes the SSE endpoint and how OpenCode consumes remote MCP servers. This needs testing.

| Step | Action                                   | Verify                |
| ---- | ---------------------------------------- | --------------------- |
| 4.1  | Add Context+ MCP config to opencode.json | Config valid          |
| 4.2  | Run OpenCode build stage                 | Tools appear in agent |
| 4.3  | Agent calls `semantic_code_search`       | Returns results       |
| 4.4  | Agent calls `get_blast_radius`           | Returns results       |
| 4.5  | Agent calls `get_context_tree`           | Returns project tree  |

## Phase 5: Architect Brain (~4-6 hours)

Create a standalone architect that replaces taskify + gap + architect.

### File: scripts/cody/architect-brain.ts

```typescript
// Pseudocode — actual implementation will be more detailed

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import Anthropic from "@anthropic-ai/sdk";

interface ArchitectResult {
  taskJson: object;
  planMd: string;
}

export async function runArchitectBrain(
  taskMd: string,
  serverUrl: string,
): Promise<ArchitectResult> {
  // 1. Connect to Context+ via MCP
  const transport = new SSEClientTransport(new URL(serverUrl));
  const mcpClient = new Client({ name: "cody-architect" });
  await mcpClient.connect(transport);

  // 2. Get available tools from Context+
  const tools = await mcpClient.listTools();

  // 3. Call Claude with task + available tools
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: "claude-opus-4-20250514",
    max_tokens: 8192,
    system: ARCHITECT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: taskMd }],
    tools: tools.map(convertMcpToolToAnthropicTool),
  });

  // 4. Handle tool calls — route to Context+ MCP
  // Loop: Claude requests tool -> execute via MCP -> return result -> Claude continues
  // Until Claude produces final task.json + plan.md

  // 5. Return results
  return { taskJson, planMd };
}
```

### Integration with entry.ts

```typescript
// In entry.ts, new routing:
if (brainAvailable) {
  // Use architect brain (replaces taskify + gap + architect)
  const result = await runArchitectBrain(taskMd, brainServerUrl);
  writeTaskJson(result.taskJson);
  writePlanMd(result.planMd);
  // Continue with build stage
} else {
  // Fallback: current 3-stage flow
  await runSpecMode(ctx); // taskify + gap + architect
}
```

| Step | Action                                      | Verify                                 |
| ---- | ------------------------------------------- | -------------------------------------- |
| 5.1  | Create `scripts/cody/architect-brain.ts`    | TypeScript compiles                    |
| 5.2  | Connect to Context+ via SSE transport       | Connection established                 |
| 5.3  | Call Claude with task + MCP tools           | Claude responds with tool calls        |
| 5.4  | Execute tool calls against Context+         | Tools return results                   |
| 5.5  | Claude produces task.json + plan.md         | Valid outputs                          |
| 5.6  | Modify entry.ts to route to architect-brain | Pipeline uses brain                    |
| 5.7  | Add fallback detection                      | If brain unreachable, use current flow |

## Phase 6: Memory & Knowledge (~2-3 hours)

Load project-specific knowledge into Context+ memory graph.

### Script: scripts/cody/brain-knowledge-sync.ts

Loads:

- `.ai-docs/knowledge/index.json` -> memory nodes (type: "concept")
- `.ai-docs/indexes/pattern-index.json` -> memory nodes (type: "concept")
- Collection schemas -> memory nodes (type: "symbol")

| Step | Action                                            | Verify                                                     |
| ---- | ------------------------------------------------- | ---------------------------------------------------------- |
| 6.1  | Create knowledge sync script                      | Script runs without errors                                 |
| 6.2  | Load knowledge index                              | `search_memory_graph("access control")` returns results    |
| 6.3  | Load pattern index                                | `search_memory_graph("published content")` returns results |
| 6.4  | Add to webhook: re-sync on knowledge file changes | Auto-updates on push                                       |

## Phase 7: Test & Measure (~2-3 hours)

| Step | Action                                     | Verify                     |
| ---- | ------------------------------------------ | -------------------------- |
| 7.1  | Run full pipeline WITH brain               | Measure total time         |
| 7.2  | Run full pipeline WITHOUT brain (fallback) | Measure total time         |
| 7.3  | Compare: time delta, plan quality          | Document results           |
| 7.4  | Run all 7 CLI test scenarios               | All pass                   |
| 7.5  | Test fallback: kill VPS, run pipeline      | Completes via current flow |
| 7.6  | Test concurrent runs against same brain    | No session leaks           |

## Resource Summary

| Resource                        | Cost                        |
| ------------------------------- | --------------------------- |
| Hetzner CX32                    | ~$7/mo                      |
| Ollama (self-hosted)            | $0                          |
| Context+ (MIT license)          | $0                          |
| Anthropic API (architect calls) | Per-token (existing budget) |
| Tailscale                       | Free tier                   |
| **Total**                       | **~$7/mo**                  |

## Estimated Timeline

| Phase                         | Effort           | Dependencies                   |
| ----------------------------- | ---------------- | ------------------------------ |
| Phase 1: VPS Setup            | 1-2 hours        | Hetzner account (requirements) |
| Phase 2: Docker Stack         | 2-3 hours        | Phase 1                        |
| Phase 3: Network              | 1 hour           | Phase 2, Tailscale             |
| Phase 4: OpenCode Integration | 2-4 hours        | Phase 3                        |
| Phase 5: Architect Brain      | 4-6 hours        | Phase 4                        |
| Phase 6: Memory & Knowledge   | 2-3 hours        | Phase 4                        |
| Phase 7: Test & Measure       | 2-3 hours        | Phase 5                        |
| **Total**                     | **~15-22 hours** |                                |
