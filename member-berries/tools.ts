import { type Tool } from "@modelcontextprotocol/sdk/types.js";

const NOTES_TOOL: Tool = {
  name: "notes",
  description:
    "Search, retrieve and create notes in Apple Notes (Member Berries). List/search return title + snippet by default; set includeBody=true or use get for full text.",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description:
          "Operation: 'search', 'list', 'get', or 'create'",
        enum: ["search", "list", "get", "create"],
      },
      searchText: {
        type: "string",
        description: "Text to search for (required for search)",
      },
      noteId: {
        type: "string",
        description: "Note id (required for get)",
      },
      title: {
        type: "string",
        description: "Title of the note to create (required for create)",
      },
      body: {
        type: "string",
        description: "Content of the note to create (required for create)",
      },
      folderName: {
        type: "string",
        description:
          "Folder name: scope list/search, or target for create (default 'Member Berries')",
      },
      includeBody: {
        type: "boolean",
        description:
          "Include full note body (default false — returns title + snippet only)",
      },
    },
    required: ["operation"],
  },
};

const REMINDERS_TOOL: Tool = {
  name: "reminders",
  description:
    "Search, create, complete, delete, and open reminders in Apple Reminders (Member Berries)",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description:
          "Operation: 'list', 'search', 'open', 'create', 'listById', 'complete', or 'delete'",
        enum: [
          "list",
          "search",
          "open",
          "create",
          "listById",
          "complete",
          "delete",
        ],
      },
      searchText: {
        type: "string",
        description: "Text to search (required for search and open)",
      },
      name: {
        type: "string",
        description: "Name of the reminder to create (required for create)",
      },
      listName: {
        type: "string",
        description: "List name for create (optional)",
      },
      listId: {
        type: "string",
        description: "List ID for listById (required)",
      },
      reminderId: {
        type: "string",
        description: "Reminder ID for complete/delete (required)",
      },
      props: {
        type: "array",
        items: { type: "string" },
        description: "Properties to include (optional for listById)",
      },
      notes: {
        type: "string",
        description: "Additional notes for create (optional)",
      },
      dueDate: {
        type: "string",
        description: "Due date ISO for create (optional)",
      },
    },
    required: ["operation"],
  },
};

const CALENDAR_TOOL: Tool = {
  name: "calendar",
  description:
    "Search, create, and open calendar events in Apple Calendar (Member Berries)",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "Operation: 'search', 'open', 'list', or 'create'",
        enum: ["search", "open", "list", "create"],
      },
      searchText: {
        type: "string",
        description: "Search text (required for search)",
      },
      eventId: {
        type: "string",
        description: "Event ID (required for open)",
      },
      limit: {
        type: "number",
        description: "Max events to retrieve (optional, default 10)",
      },
      fromDate: {
        type: "string",
        description: "Start date ISO (optional)",
      },
      toDate: {
        type: "string",
        description: "End date ISO (optional)",
      },
      title: {
        type: "string",
        description: "Event title (required for create)",
      },
      startDate: {
        type: "string",
        description: "Start ISO (required for create)",
      },
      endDate: {
        type: "string",
        description: "End ISO (required for create)",
      },
      location: {
        type: "string",
        description: "Location (optional for create)",
      },
      notes: {
        type: "string",
        description: "Notes (optional for create)",
      },
      isAllDay: {
        type: "boolean",
        description: "All-day flag (optional for create)",
      },
      calendarName: {
        type: "string",
        description: "Calendar name (optional for create)",
      },
    },
    required: ["operation"],
  },
};

const MEMBER_BERRIES_TOOL: Tool = {
  name: "memberberries",
  description:
    "Access Member Berries memories — conversation starters and recent activities. Built-in starters work without a custom host prompt.",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description:
          "'get_starters', 'get_memories', or 'check_events'",
        enum: ["get_starters", "get_memories", "check_events"],
      },
    },
    required: ["operation"],
  },
};

const BRIEFING_TOOL: Tool = {
  name: "briefing",
  description:
    "One-shot day briefing: today's calendar, due reminders, recent note titles, and conversation starters",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "Operation: 'today' (default)",
        enum: ["today"],
      },
    },
    required: [],
  },
};

const tools = [
  BRIEFING_TOOL,
  CALENDAR_TOOL,
  NOTES_TOOL,
  REMINDERS_TOOL,
  MEMBER_BERRIES_TOOL,
];

export default tools;
