<div align="center">

<img src="assets/logo.svg" alt="Member Berries logo" width="240"/>

# Member Berries

**Your friendly Apple day-memory for Claude.** Calendar, Notes, and Reminders — with a local memory layer that makes conversations feel natural.

</div>

Member Berries is a macOS MCP server. It gives Claude (or Cursor / Claude Code) focused access to Apple Calendar, Notes, and Reminders, plus a small on-disk memory of what you did today. Data stays on your machine.

**v2.1.0** · [MCP](https://modelcontextprotocol.io) · MIT · Bun

---

## Who is this for?

| You are… | Start here |
|---|---|
| A macOS Claude Desktop user who wants an assistant that remembers the day | Install below, then ask: *“What’s on today?”* |
| On Cursor or Claude Code | Same Bun server — see install JSON for each host |
| Privacy-first | Local `~/.member-berries-memory.json` (mode 600). No cloud sync from this server |
| Already using Memory Service / other Apple MCPs | Member Berries is **behavioural day-memory** on Calendar/Notes/Reminders — not general conversation memory |

### Positioning

- **Member Berries** — personality + day briefing on Calendar / Notes / Reminders
- **apple-reminders / Notes MCPs** — deeper single-app CRUD if you need it
- **Memory Service** — long-lived conversational context across projects

---

## Features

- **Briefing** — one `briefing` / `today` call for calendar, due reminders, note titles, starters
- **Calendar** — search, list, open, create
- **Notes** — list/search return title + snippet by default; full body on demand
- **Reminders** — list, search, create, complete, delete, listById (real list filter)
- **Member Berries memory** — conversation starters work out of the box (custom prompt optional)

---

## Quick start

```bash
brew install bun
git clone https://github.com/M-Pineapple/member-berries-apple-mcp.git
cd member-berries-apple-mcp/member-berries
bun install
```

### Claude Desktop

Add to your MCP config:

```json
{
  "mcpServers": {
    "member-berries": {
      "command": "bun",
      "args": ["run", "/ABSOLUTE/PATH/member-berries-apple-mcp/member-berries/index.ts"]
    }
  }
}
```

### Cursor / Claude Code

Point an MCP server entry at the same `bun run …/index.ts` command. Restart the host after saving.

Optional: paste [`member-berries/CLAUDE_PROMPT_SETUP.md`](member-berries/CLAUDE_PROMPT_SETUP.md) into custom instructions for a stronger personality. Built-in starters work without it.

Grant macOS automation / Calendar / Reminders / Notes access when prompted. Keep Reminders open for reminder tools.

---

## MCP tools

| Tool | Operations |
|---|---|
| `briefing` | `today` — day summary |
| `calendar` | `search`, `list`, `open`, `create` |
| `notes` | `search`, `list`, `get`, `create` (`includeBody`, `folderName`) |
| `reminders` | `list`, `search`, `open`, `create`, `listById`, `complete`, `delete` |
| `memberberries` | `get_starters`, `get_memories`, `check_events` |

More detail: [`member-berries/README.md`](member-berries/README.md).

---

## Support this project

If Member Berries has made Claude feel more like a helpful friend who remembers your day, consider buying me a coffee:

<a href="https://www.buymeacoffee.com/mpineapple" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

---

## License

MIT — see [LICENSE](./LICENSE). Fork lineage: [apple-mcp](https://github.com/dhravya/apple-mcp).

*Member when AI assistants felt like friends? Member Berries 'members.*
