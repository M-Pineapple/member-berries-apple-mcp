# Member Berries — package docs

Runnable package for the Member Berries Apple MCP server. Install with Bun from a clone, or with npm.

Named in homage to South Park’s Member Berries — a fun, personality-first day-memory layer on Calendar / Notes / Reminders. Not affiliated with South Park or Comedy Central.

## Install

### Bun

```bash
bun install
./install.sh   # prints Claude Desktop config with absolute path
```

Or run directly:

```bash
bun run index.ts
```

### npm

Node.js 18 or later is enough. The package on npm is [`member-berries-apple-mcp`](https://www.npmjs.com/package/member-berries-apple-mcp) (current release 2.1.4). The bin is `member-berries-mcp`.

```bash
npm install -g member-berries-apple-mcp
```

`npx` can fetch and run that same bin. It starts the stdio server, which is what an MCP host does:

```bash
npx -y member-berries-apple-mcp
```

MCP client config (Claude Desktop, and the same `npx` command in ChatGPT, Cursor, Claude Code or any other MCP host):

```json
{
  "mcpServers": {
    "member-berries": {
      "command": "npx",
      "args": ["-y", "member-berries-apple-mcp"]
    }
  }
}
```

`npx -y member-berries-apple-mcp` runs the `member-berries-mcp` bin. Restart the host after saving. When `member-berries-mcp` is on your PATH, set `command` to `member-berries-mcp` and `args` to `[]`.

## Tools

### `briefing`

- `today` (default) — today’s calendar, due reminders, recent note titles, conversation starters

### `calendar`

- `search`, `list`, `open`, `create`

### `notes`

- `search` / `list` — title + snippet by default; set `includeBody: true` for full text
- `get` — full note by `noteId`
- `create` — optional `folderName` (default `Member Berries`)
- `folderName` also scopes list/search

### `reminders`

- `list`, `search`, `open`, `create`, `listById`
- `complete` / `delete` — require `reminderId`
- Reminders.app must be running (avoids restart loops)

### `memberberries`

- `get_starters` — built-in starters always available
- `get_memories` — last 24h berries
- `check_events` — refresh from calendar

## Memory file

`~/.member-berries-memory.json` written with mode `0600`. Do not commit it.

## Personality prompt (optional)

See [CLAUDE_PROMPT_SETUP.md](./CLAUDE_PROMPT_SETUP.md). Optional from v2.1.0 — the server ships default starters.

## Development

```bash
bun test
```

Unit tests cover privacy defaults, listById filtering, version pin, and hygiene greps. They do not require Calendar.app (Linux CI friendly).

## Clone URL

```bash
git clone https://github.com/M-Pineapple/member-berries-apple-mcp.git
```
