# Member Berries Apple MCP 🫐

A friendly, conversational MCP that remembers your activities and creates natural interactions with Claude.

## What is Member Berries?

Member Berries is a privacy-conscious fork of the excellent [apple-mcp](https://github.com/dhravya/apple-mcp) by Dhravya Shah. We took the original MCP and stripped it down to only the essential productivity tools, giving it a fun twist with the Member Berries theme - because 'member when apps only asked for what they needed? We 'member!

Member Berries is a secure, minimal fork that:
- **Remembers** your calendar events, notes, and reminders
- **Creates** natural conversation starters based on your activities
- **Maintains** context between conversations
- **Protects** your privacy by limiting access to only essential apps

## Quick Start

1. Install Bun: `brew install bun`
2. Clone this repo
3. Run `cd member-berries && bun install`
4. Configure Claude Desktop (see member-berries/README.md)
5. **IMPORTANT**: Add the Member Berries personality prompt to Claude Desktop:
   - Open Claude Desktop → Settings → Preferences → Custom Instructions
   - Copy the prompt from `member-berries/CLAUDE_PROMPT_SETUP.md`
   - This makes Claude actually use the memory features naturally!

## Features

- 📅 Calendar integration with event memory
- 📝 Notes access with creation tracking
- ✓ Reminders management
- 🧠 Conversational memory layer
- 💬 Natural conversation starters
- 🔒 Privacy-first design (no Messages/Mail/Contacts access)

## Documentation

See the `member-berries` folder for full documentation and setup instructions.

## License

MIT - See LICENSE file in member-berries folder

---

🫐 'Member when AI assistants felt like friends? Member Berries 'members!
