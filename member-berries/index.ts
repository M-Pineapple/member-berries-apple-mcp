#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { runAppleScript } from "run-applescript";
import tools from "./tools";
import MemberBerriesMemory from "./memory/MemberBerriesMemory";

// Member Berries 🫐 - A friendly, contextual Apple MCP
// Remembers your activities and creates natural conversations

console.error("Starting Member Berries Apple MCP server... 🫐");
console.error("'Member when AI assistants felt like friends? We 'member!");

// Placeholders for modules - lazy loading
let notes: typeof import('./utils/notes').default | null = null;
let reminders: typeof import('./utils/reminders').default | null = null;
let calendar: typeof import('./utils/calendar').default | null = null;
let memberBerriesMemory: MemberBerriesMemory | null = null;

// Type map for module names to their types
type ModuleMap = {
  notes: typeof import('./utils/notes').default;
  reminders: typeof import('./utils/reminders').default;
  calendar: typeof import('./utils/calendar').default;
};

// Helper function for lazy module loading
async function loadModule<T extends 'notes' | 'reminders' | 'calendar'>(moduleName: T): Promise<ModuleMap[T]> {
  console.error(`Loading ${moduleName} module on demand...`);
  
  try {
    switch (moduleName) {
      case 'notes':
        if (!notes) notes = (await import('./utils/notes')).default;
        return notes as ModuleMap[T];
      case 'reminders':
        if (!reminders) reminders = (await import('./utils/reminders')).default;
        return reminders as ModuleMap[T];
      case 'calendar':
        if (!calendar) calendar = (await import('./utils/calendar')).default;
        return calendar as ModuleMap[T];
      default:
        throw new Error(`Unknown module: ${moduleName}`);
    }
  } catch (e) {
    console.error(`Error loading module ${moduleName}:`, e);
    throw e;
  }
}

// Initialize Member Berries Memory
async function initializeMemory(): Promise<MemberBerriesMemory> {
  if (!memberBerriesMemory) {
    memberBerriesMemory = new MemberBerriesMemory();
    await memberBerriesMemory.initialize();
    console.error("🫐 Member Berries memory initialized!");
  }
  return memberBerriesMemory;
}

// Main server object
const server = new Server(
  {
    name: "Member Berries Apple MCP",
    version: "2.0.0", // Version 2 with memory!
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize the server and set up handlers
console.error("Initializing Member Berries server...");

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("No arguments provided");
    }

    switch (name) {
      case "notes": {
        if (!isNotesArgs(args)) {
          throw new Error("Invalid arguments for notes tool");
        }

        try {
          const notesModule = await loadModule('notes');
          const memory = await initializeMemory();
          const { operation } = args;
          
          switch (operation) {
            case "search": {
              if (!args.searchText) {
                throw new Error("Search text is required for search operation");
              }
              
              const foundNotes = await notesModule.findNote(args.searchText);
              return {
                content: [{
                  type: "text",
                  text: foundNotes.length ?
                    foundNotes.map(note => `${note.name}:\n${note.content}`).join("\n\n") :
                    `No notes found for "${args.searchText}"`
                }],
                isError: false
              };
            }
            
            case "list": {
              const allNotes = await notesModule.getAllNotes();
              return {
                content: [{
                  type: "text",
                  text: allNotes.length ?
                    allNotes.map((note) => `${note.name}:\n${note.content}`)
                    .join("\n\n") : 
                    "No notes exist."
                }],
                isError: false
              };
            }
            
            case "create": {
              if (!args.title || !args.body) {
                throw new Error("Title and body are required for create operation");
              }
              
              const result = await notesModule.createNote(args.title, args.body, args.folderName);
              
              // Remember this note creation
              if (result.success) {
                await memory.rememberNote(args.title, args.body);
              }
              
              return {
                content: [{
                  type: "text",
                  text: result.success ?
                    `Created note "${args.title}" in folder "${result.folderName}"${result.usedDefaultFolder ? ' (created new folder)' : ''}.` :
                    `Failed to create note: ${result.message}`
                }],
                isError: !result.success
              };
            }
            
            default:
              throw new Error(`Unknown operation: ${operation}`);
          }
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error accessing notes: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }

      case "reminders": {
        if (!isRemindersArgs(args)) {
          throw new Error("Invalid arguments for reminders tool");
        }

        try {
          const remindersModule = await loadModule('reminders');
          const memory = await initializeMemory();
          
          const { operation } = args;

          if (operation === "list") {
            // List all reminders
            const lists = await remindersModule.getAllLists();
            const allReminders = await remindersModule.getAllReminders();
            return {
              content: [{
                type: "text",
                text: `Found ${lists.length} lists and ${allReminders.length} reminders.`
              }],
              lists,
              reminders: allReminders,
              isError: false
            };
          } 
          else if (operation === "search") {
            // Search for reminders
            const { searchText } = args;
            const results = await remindersModule.searchReminders(searchText!);
            return {
              content: [{
                type: "text",
                text: results.length > 0 
                  ? `Found ${results.length} reminders matching "${searchText}".` 
                  : `No reminders found matching "${searchText}".`
              }],
              reminders: results,
              isError: false
            };
          } 
          else if (operation === "open") {
            // Open a reminder
            const { searchText } = args;
            const result = await remindersModule.openReminder(searchText!);
            return {
              content: [{
                type: "text",
                text: result.success 
                  ? `Opened Reminders app. Found reminder: ${result.reminder?.name}` 
                  : result.message
              }],
              ...result,
              isError: !result.success
            };
          } 
          else if (operation === "create") {
            // Create a reminder
            const { name, listName, notes, dueDate } = args;
            const result = await remindersModule.createReminder(name!, listName, notes, dueDate);
            
            // Remember this reminder
            await memory.rememberReminder(name!, dueDate);
            
            return {
              content: [{
                type: "text",
                text: `Created reminder "${result.name}" ${listName ? `in list "${listName}"` : ''}.`
              }],
              success: true,
              reminder: result,
              isError: false
            };
          }
          else if (operation === "listById") {
            // Get reminders from a specific list by ID
            const { listId, props } = args;
            const results = await remindersModule.getRemindersFromListById(listId!, props);
            return {
              content: [{
                type: "text",
                text: results.length > 0 
                  ? `Found ${results.length} reminders in list with ID "${listId}".` 
                  : `No reminders found in list with ID "${listId}".`
              }],
              reminders: results,
              isError: false
            };
          }

          return {
            content: [{
              type: "text",
              text: "Unknown operation"
            }],
            isError: true
          };
        } catch (error) {
          console.error("Error in reminders tool:", error);
          return {
            content: [{
              type: "text",
              text: `Error in reminders tool: ${error}`
            }],
            isError: true
          };
        }
      }

      case "calendar": {
        if (!isCalendarArgs(args)) {
          throw new Error("Invalid arguments for calendar tool");
        }
        
        try {
          const calendarModule = await loadModule("calendar");
          const { operation } = args;
          
          
          switch (operation) {
            case "search": {
              const { searchText, limit, fromDate, toDate } = args;
              const events = await calendarModule.searchEvents(searchText!, limit, fromDate, toDate);
              
              return {
                content: [{
                  type: "text",
                  text: events.length > 0 ? 
                    `Found ${events.length} events matching "${searchText}":\n\n${events.map(event => 
                      `${event.title} (${new Date(event.startDate!).toLocaleString()} - ${new Date(event.endDate!).toLocaleString()})\n` +
                      `Location: ${event.location || 'Not specified'}\n` +
                      `Calendar: ${event.calendarName}\n` +
                      `ID: ${event.id}\n` +
                      `${event.notes ? `Notes: ${event.notes}\n` : ''}`
                    ).join("\n\n")}` : 
                    `No events found matching "${searchText}".`
                }],
                isError: false
              };
            }
            
            case "open": {
              const { eventId } = args;
              const result = await calendarModule.openEvent(eventId!);
              
              return {
                content: [{
                  type: "text",
                  text: result.success ? 
                    result.message : 
                    `Error opening event: ${result.message}`
                }],
                isError: !result.success
              };
            }
            
            case "list": {
              const { limit, fromDate, toDate } = args;
              const events = await calendarModule.getEvents(limit, fromDate, toDate);
              
              const startDateText = fromDate ? new Date(fromDate).toLocaleDateString() : 'today';
              const endDateText = toDate ? new Date(toDate).toLocaleDateString() : 'next 7 days';
              
              return {
                content: [{
                  type: "text",
                  text: events.length > 0 ? 
                    `Found ${events.length} events from ${startDateText} to ${endDateText}:\n\n${events.map(event => 
                      `${event.title} (${new Date(event.startDate!).toLocaleString()} - ${new Date(event.endDate!).toLocaleString()})\n` +
                      `Location: ${event.location || 'Not specified'}\n` +
                      `Calendar: ${event.calendarName}\n` +
                      `ID: ${event.id}`
                    ).join("\n\n")}` : 
                    `No events found from ${startDateText} to ${endDateText}.`
                }],
                isError: false
              };
            }
            
            case "create": {
              const { title, startDate, endDate, location, notes, isAllDay, calendarName } = args;
              const result = await calendarModule.createEvent(title!, startDate!, endDate!, location, notes, isAllDay, calendarName);
              return {
                content: [{
                  type: "text",
                  text: result.success ? 
                    `${result.message} Event scheduled from ${new Date(startDate!).toLocaleString()} to ${new Date(endDate!).toLocaleString()}${result.eventId ? `\nEvent ID: ${result.eventId}` : ''}` : 
                    `Error creating event: ${result.message}`
                }],
                isError: !result.success
              };
            }
            
            default:
              throw new Error(`Unknown calendar operation: ${operation}`);
          }
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error in calendar tool: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }

      case "memberberries": {
        if (!isMemberBerriesArgs(args)) {
          throw new Error("Invalid arguments for memberberries tool");
        }

        try {
          const memory = await initializeMemory();
          const { operation } = args;

          switch (operation) {
            case "get_starters": {
              const starters = await memory.getConversationStarters();
              return {
                content: [{
                  type: "text",
                  text: starters.length > 0 ?
                    `Recent conversation starters:\n${starters.join('\n')}` :
                    "No recent conversation starters. Check for completed events first!"
                }],
                isError: false
              };
            }

            case "get_memories": {
              const memories = await memory.getRecentMemories();
              return {
                content: [{
                  type: "text",
                  text: memories.length > 0 ?
                    `Recent memories:\n${memories.map(m => 
                      `- ${m.content} (${new Date(m.timestamp).toLocaleString()})`
                    ).join('\n')}` :
                    "No recent memories found."
                }],
                isError: false
              };
            }

            case "check_events": {
              const calendarModule = await loadModule("calendar");
              await memory.checkCompletedEvents(calendarModule);
              await memory.checkUpcomingEvents(calendarModule);
              
              const starters = await memory.getConversationStarters();
              return {
                content: [{
                  type: "text",
                  text: "Memory updated with recent events! " +
                    (starters.length > 0 ? 
                      `\nSuggested conversation starter: ${starters[0]}` : 
                      "")
                }],
                isError: false
              };
            }

            default:
              throw new Error(`Unknown operation: ${operation}`);
          }
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error in Member Berries memory: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server transport
console.error("Setting up Member Berries MCP server transport...");

(async () => {
  try {
    console.error("Initializing transport...");
    const transport = new StdioServerTransport();

    // Ensure stdout is only used for JSON messages
    console.error("Setting up stdout filter...");
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any, encoding?: any, callback?: any) => {
      // Only allow JSON messages to pass through
      if (typeof chunk === "string" && !chunk.startsWith("{")) {
        console.error("Filtering non-JSON stdout message");
        return true; // Silently skip non-JSON messages
      }
      return originalStdoutWrite(chunk, encoding, callback);
    };

    console.error("Connecting transport to server...");
    await server.connect(transport);
    console.error("Member Berries server connected successfully! 🫐");
    console.error("Ready to remember your activities and make conversations more natural!");
  } catch (error) {
    console.error("Failed to initialize Member Berries MCP server:", error);
    process.exit(1);
  }
})();

// Helper functions for argument type checking
function isNotesArgs(args: unknown): args is { 
  operation: "search" | "list" | "create";
  searchText?: string;
  title?: string;
  body?: string;
  folderName?: string;
} {
  if (typeof args !== "object" || args === null) {
    return false;
  }
  
  const { operation } = args as { operation?: unknown };
  if (typeof operation !== "string") {
    return false;
  }
  
  if (!["search", "list", "create"].includes(operation)) {
    return false;
  }
  
  // Validate fields based on operation
  if (operation === "search") {
    const { searchText } = args as { searchText?: unknown };
    if (typeof searchText !== "string" || searchText === "") {
      return false;
    }
  }
  
  if (operation === "create") {
    const { title, body } = args as { title?: unknown, body?: unknown };
    if (typeof title !== "string" || title === "" || 
        typeof body !== "string") {
      return false;
    }
    
    // Check folderName if provided
    const { folderName } = args as { folderName?: unknown };
    if (folderName !== undefined && (typeof folderName !== "string" || folderName === "")) {
      return false;
    }
  }
  
  return true;
}

function isRemindersArgs(args: unknown): args is {
  operation: "list" | "search" | "open" | "create" | "listById";
  searchText?: string;
  name?: string;
  listName?: string;
  listId?: string;
  props?: string[];
  notes?: string;
  dueDate?: string;
} {
  if (typeof args !== "object" || args === null) {
    return false;
  }

  const { operation } = args as any;
  if (typeof operation !== "string") {
    return false;
  }

  if (!["list", "search", "open", "create", "listById"].includes(operation)) {
    return false;
  }

  // For search and open operations, searchText is required
  if ((operation === "search" || operation === "open") && 
      (typeof (args as any).searchText !== "string" || (args as any).searchText === "")) {
    return false;
  }

  // For create operation, name is required
  if (operation === "create" && 
      (typeof (args as any).name !== "string" || (args as any).name === "")) {
    return false;
  }
  
  // For listById operation, listId is required
  if (operation === "listById" && 
      (typeof (args as any).listId !== "string" || (args as any).listId === "")) {
    return false;
  }

  return true;
}

function isCalendarArgs(args: unknown): args is {
  operation: "search" | "open" | "list" | "create";
  searchText?: string;
  eventId?: string;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  notes?: string;
  isAllDay?: boolean;
  calendarName?: string;
} {
  if (typeof args !== "object" || args === null) {
    return false;
  }

  const { operation } = args as { operation?: unknown };
  if (typeof operation !== "string") {
    return false;
  }

  if (!["search", "open", "list", "create"].includes(operation)) {
    return false;
  }

  // Check that required parameters are present for each operation
  if (operation === "search") {
    const { searchText } = args as { searchText?: unknown };
    if (typeof searchText !== "string") {
      return false;
    }
  }

  if (operation === "open") {
    const { eventId } = args as { eventId?: unknown };
    if (typeof eventId !== "string") {
      return false;
    }
  }

  if (operation === "create") {
    const { title, startDate, endDate } = args as { 
      title?: unknown; 
      startDate?: unknown; 
      endDate?: unknown;
    };
    
    if (typeof title !== "string" || typeof startDate !== "string" || typeof endDate !== "string") {
      return false;
    }
  }

  return true;
}

function isMemberBerriesArgs(args: unknown): args is {
  operation: "get_starters" | "get_memories" | "check_events";
} {
  if (typeof args !== "object" || args === null) {
    return false;
  }

  const { operation } = args as { operation?: unknown };
  if (typeof operation !== "string") {
    return false;
  }

  if (!["get_starters", "get_memories", "check_events"].includes(operation)) {
    return false;
  }

  return true;
}
