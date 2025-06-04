import { type Tool } from "@modelcontextprotocol/sdk/types.js";

const NOTES_TOOL: Tool = {
  name: "notes", 
  description: "Search, retrieve and create notes in Apple Notes app (Member Berries)",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "Operation to perform: 'search', 'list', or 'create'",
        enum: ["search", "list", "create"]
      },
      searchText: {
        type: "string",
        description: "Text to search for in notes (required for search operation)"
      },
      title: {
        type: "string",
        description: "Title of the note to create (required for create operation)"
      },
      body: {
        type: "string",
        description: "Content of the note to create (required for create operation)"
      },
      folderName: {
        type: "string",
        description: "Name of the folder to create the note in (optional for create operation, defaults to 'Member Berries')"
      }
    },
    required: ["operation"]
  }
};

const REMINDERS_TOOL: Tool = {
  name: "reminders",
  description: "Search, create, and open reminders in Apple Reminders app (Member Berries)",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "Operation to perform: 'list', 'search', 'open', 'create', or 'listById'",
        enum: ["list", "search", "open", "create", "listById"]
      },
      searchText: {
        type: "string",
        description: "Text to search for in reminders (required for search and open operations)"
      },
      name: {
        type: "string",
        description: "Name of the reminder to create (required for create operation)"
      },
      listName: {
        type: "string",
        description: "Name of the list to create the reminder in (optional for create operation)"
      },
      listId: {
        type: "string",
        description: "ID of the list to get reminders from (required for listById operation)"
      },
      props: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Properties to include in the reminders (optional for listById operation)"
      },
      notes: {
        type: "string",
        description: "Additional notes for the reminder (optional for create operation)"
      },
      dueDate: {
        type: "string",
        description: "Due date for the reminder in ISO format (optional for create operation)"
      }
    },
    required: ["operation"]
  }
};

const CALENDAR_TOOL: Tool = {
  name: "calendar",
  description: "Search, create, and open calendar events in Apple Calendar app (Member Berries)",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "Operation to perform: 'search', 'open', 'list', or 'create'",
        enum: ["search", "open", "list", "create"]
      },
      searchText: {
        type: "string",
        description: "Text to search for in event titles, locations, and notes (required for search operation)"
      },
      eventId: {
        type: "string",
        description: "ID of the event to open (required for open operation)"
      },
      limit: {
        type: "number",
        description: "Number of events to retrieve (optional, default 10)"
      },
      fromDate: {
        type: "string",
        description: "Start date for search range in ISO format (optional, default is today)"
      },
      toDate: {
        type: "string",
        description: "End date for search range in ISO format (optional, default is 30 days from now for search, 7 days for list)"
      },
      title: {
        type: "string",
        description: "Title of the event to create (required for create operation)"
      },
      startDate: {
        type: "string",
        description: "Start date/time of the event in ISO format (required for create operation)"
      },
      endDate: {
        type: "string",
        description: "End date/time of the event in ISO format (required for create operation)"
      },
      location: {
        type: "string",
        description: "Location of the event (optional for create operation)"
      },
      notes: {
        type: "string",
        description: "Additional notes for the event (optional for create operation)"
      },
      isAllDay: {
        type: "boolean",
        description: "Whether the event is an all-day event (optional for create operation, default is false)"
      },
      calendarName: {
        type: "string",
        description: "Name of the calendar to create the event in (optional for create operation, uses default calendar if not specified)"
      }
    },
    required: ["operation"]
  }
};

const MEMBER_BERRIES_TOOL: Tool = {
  name: "memberberries",
  description: "Access Member Berries memories - get conversation starters and recent activities to make interactions more natural and friendly",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "Operation to perform: 'get_starters' for conversation starters, 'get_memories' for recent memories, or 'check_events' to update memory with completed events",
        enum: ["get_starters", "get_memories", "check_events"]
      }
    },
    required: ["operation"]
  }
};

// Member Berries exports all tools including the memory tool
const tools = [CALENDAR_TOOL, NOTES_TOOL, REMINDERS_TOOL, MEMBER_BERRIES_TOOL];

export default tools;
