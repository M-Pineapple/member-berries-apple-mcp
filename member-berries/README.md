# Member Berries Apple MCP 🫐

A friendly, conversational MCP that remembers your activities and creates natural interactions with Claude. Member Berries tracks your calendar events, notes, and reminders to make AI conversations feel more human and contextual.

## What Makes Member Berries Special?

Unlike other MCPs, Member Berries **remembers** what you've done and brings it up naturally in conversation:

- 📅 **"How did your dentist appointment go yesterday?"**
- 🛒 **"Did you manage to get those eggs from the store?"**
- 📝 **"I see you created that project outline - need help expanding it?"**
- ✓ **"Don't forget about that presentation tomorrow at 2pm!"**

## The Vision

'Member when AI assistants felt like helpful friends who knew about your day? Member Berries 'members! 

This MCP creates a memory layer between your Apple apps and Claude, allowing for:
- Natural conversation starters based on your recent activities
- Contextual awareness of completed and upcoming events
- Friendly reminders without being intrusive
- A more human-like interaction pattern

## What Makes Member Berries Different?

### The Sweet Spot

Member Berries hits the perfect balance:
- **Just enough access**: Only Calendar, Notes, and Reminders - the productivity essentials
- **Memory that matters**: Remembers your completed events and brings them up naturally
- **Fun personality**: Based on South Park's nostalgic Member Berries
- **Simple by design**: Stripped down to what actually makes conversations better

### Perfect For

- **Apple ecosystem users** who want their AI to understand their day
- **Anyone tired of repetitive AI conversations** that start from scratch
- **People who appreciate simplicity** over feature bloat
- **South Park fans** who get the reference 😄

## Features

### Core Tools
- **📅 Calendar** - Tracks completed events and upcoming schedule
- **📝 Notes** - Remembers what notes you've created
- **✓ Reminders** - Keeps track of your tasks and todos

### Memory Features
- **🧠 Event Memory** - Remembers when you complete calendar events
- **💬 Conversation Starters** - Generates natural icebreakers
- **📊 Context Tracking** - Categorizes activities (shopping, meetings, health, social)
- **⏰ Smart Timing** - Only brings up relevant recent events

## Installation

### Prerequisites
- macOS (required for Apple app integration)
- [Bun](https://bun.sh) runtime: `brew install bun`
- Claude Desktop app

### Setup

1. Clone and install:
```bash
git clone https://github.com/pineapple/member-berries-apple-mcp.git
cd member-berries-apple-mcp/member-berries
bun install
```

2. Add to Claude Desktop configuration (Settings > Developer > Model Context Protocol):
```json
{
  "mcpServers": {
    "member-berries": {
      "command": "bun",
      "args": ["run", "/path/to/member-berries-apple-mcp/member-berries/index.ts"]
    }
  }
}
```

3. **CRITICAL STEP - Add the Member Berries personality:**
   - Open Claude Desktop
   - Go to Settings → Preferences → Custom Instructions
   - Copy and paste the entire prompt from `CLAUDE_PROMPT_SETUP.md`
   - Without this, Claude won't use the memory features naturally!

4. Restart Claude Desktop

⚠️ **Note**: The custom prompt is what makes Member Berries special. Without it, Claude will have access to your calendar/notes/reminders but won't proactively use them in conversation.

## Usage

Member Berries works best when you let it check your events at the start of each conversation:

```
You: Hi Claude!

Claude: Hey there! Let me check what you've been up to... 
*[Member Berries checks recent events]*
How did the grocery shopping go yesterday? Did you find everything you needed?

You: Yes! Actually got everything on my list for once.

Claude: That's great! I noticed you have that team presentation coming up tomorrow at 2pm. Would you like help preparing for it?
```

## Custom Prompt Setup

For the full experience, add the Member Berries prompt to your Claude preferences. This helps Claude use the memory features naturally. See `CLAUDE_PROMPT_SETUP.md` for the complete prompt.

## How It Works

1. **Event Tracking** - Member Berries monitors your calendar for completed events
2. **Memory Creation** - Creates contextual memories with categories (shopping, meeting, health, etc.)
3. **Conversation Starters** - Generates appropriate icebreakers based on event context
4. **Natural Integration** - Claude uses these memories to make conversations flow naturally

## Examples

### Shopping Context
- Event: "Buy groceries - Whole Foods"
- Memory: "User went grocery shopping at Whole Foods"
- Starter: "How was Whole Foods? Hope it wasn't too crowded!"

### Meeting Context
- Event: "Team Standup - Zoom"
- Memory: "User had team standup meeting"
- Starter: "How did the team standup go? Any interesting updates?"

### Health Context
- Event: "Dentist Appointment"
- Memory: "User had dentist appointment"
- Starter: "Hope the dentist appointment went smoothly! Everything okay?"

## Contributing

We welcome contributions that enhance the conversational experience! Ideas:
- More sophisticated context detection
- Mood-aware conversation starters
- Pattern recognition for regular events
- Integration with more Apple apps (while maintaining security)

## License

MIT License - See LICENSE file

## Acknowledgments

- Original [apple-mcp](https://github.com/dhravya/apple-mcp) by Dhravya Shah - excellent foundation!
- Built with [Model Context Protocol SDK](https://github.com/anthropics/model-context-protocol)
- Powered by [Bun](https://bun.sh) runtime

---

🫐 **'Member when AI assistants felt like friends? Member Berries 'members!**
