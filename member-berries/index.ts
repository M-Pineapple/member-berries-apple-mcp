#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import tools from "./tools";
import MemberBerriesMemory from "./memory/MemberBerriesMemory";
import { VERSION } from "./version";
import { LIMITS, requireBoundedString } from "./utils/limits";
import { formatNoteLine } from "./utils/notesFormat";
import { filterRemindersDueToday } from "./utils/remindersFormat";

// Member Berries — friendly, contextual Apple MCP
console.error("Starting Member Berries Apple MCP server...");
console.error("'Member when AI assistants felt like friends? We 'member!");

let notes: typeof import("./utils/notes").default | null = null;
let reminders: typeof import("./utils/reminders").default | null = null;
let calendar: typeof import("./utils/calendar").default | null = null;
let memberBerriesMemory: MemberBerriesMemory | null = null;

type ModuleMap = {
  notes: typeof import("./utils/notes").default;
  reminders: typeof import("./utils/reminders").default;
  calendar: typeof import("./utils/calendar").default;
};

async function loadModule<T extends "notes" | "reminders" | "calendar">(
  moduleName: T
): Promise<ModuleMap[T]> {
  console.error(`Loading ${moduleName} module on demand...`);

  try {
    switch (moduleName) {
      case "notes":
        if (!notes) notes = (await import("./utils/notes")).default;
        return notes as ModuleMap[T];
      case "reminders":
        if (!reminders) reminders = (await import("./utils/reminders")).default;
        return reminders as ModuleMap[T];
      case "calendar":
        if (!calendar) calendar = (await import("./utils/calendar")).default;
        return calendar as ModuleMap[T];
      default:
        throw new Error(`Unknown module: ${moduleName}`);
    }
  } catch (e) {
    console.error(`Error loading module ${moduleName}:`, e);
    throw e;
  }
}

async function initializeMemory(): Promise<MemberBerriesMemory> {
  if (!memberBerriesMemory) {
    memberBerriesMemory = new MemberBerriesMemory();
    await memberBerriesMemory.initialize();
    console.error("Member Berries memory initialized!");
  }
  return memberBerriesMemory;
}

const server = new Server(
  {
    name: "Member Berries Apple MCP",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

console.error(`Initializing Member Berries server v${VERSION}...`);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("No arguments provided");
    }

    switch (name) {
      case "briefing": {
        try {
          const calendarModule = await loadModule("calendar");
          const remindersModule = await loadModule("reminders");
          const notesModule = await loadModule("notes");
          const memory = await initializeMemory();

          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setHours(23, 59, 59, 999);

          const events = await calendarModule.getEvents(
            20,
            start.toISOString(),
            end.toISOString()
          );

          let dueReminders: Awaited<
            ReturnType<typeof remindersModule.getAllReminders>
          > = [];
          try {
            const all = await remindersModule.getAllReminders();
            dueReminders = filterRemindersDueToday(all);
          } catch (e) {
            console.error("briefing: reminders unavailable:", e);
          }

          let noteTitles: string[] = [];
          try {
            const recentNotes = await notesModule.getAllNotes();
            noteTitles = recentNotes.slice(0, 8).map((n) => n.name);
          } catch (e) {
            console.error("briefing: notes unavailable:", e);
          }

          const starters = await memory.getConversationStarters();

          const lines: string[] = [
            `# Day briefing (${start.toLocaleDateString()})`,
            "",
            "## Calendar today",
            events.length
              ? events
                  .map(
                    (e) =>
                      `- ${e.title} (${e.startDate ? new Date(e.startDate).toLocaleTimeString() : "?"}${e.location ? ` @ ${e.location}` : ""})`
                  )
                  .join("\n")
              : "- No events found for today",
            "",
            "## Reminders due today",
            dueReminders.length
              ? dueReminders
                  .map((r) => `- ${r.name}${r.listName ? ` [${r.listName}]` : ""}`)
                  .join("\n")
              : "- None due (or Reminders unavailable)",
            "",
            "## Recent note titles",
            noteTitles.length
              ? noteTitles.map((t) => `- ${t}`).join("\n")
              : "- None (or Notes unavailable)",
            "",
            "## Conversation starters",
            starters
              .slice(0, 3)
              .map((s) => `- ${s}`)
              .join("\n"),
          ];

          return {
            content: [{ type: "text", text: lines.join("\n") }],
            isError: false,
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error building briefing: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "notes": {
        if (!isNotesArgs(args)) {
          throw new Error("Invalid arguments for notes tool");
        }

        try {
          const notesModule = await loadModule("notes");
          const memory = await initializeMemory();
          const { operation } = args;
          const includeBody = Boolean(args.includeBody);

          switch (operation) {
            case "search": {
              const searchText = requireBoundedString(
                args.searchText,
                "searchText",
                LIMITS.MEDIUM
              );
              const foundNotes = await notesModule.findNote(
                searchText,
                args.folderName
              );
              const summaries = notesModule.summariseNotes(
                foundNotes,
                includeBody
              );
              return {
                content: [
                  {
                    type: "text",
                    text: summaries.length
                      ? summaries.map(formatNoteLine).join("\n\n")
                      : `No notes found for "${searchText}"`,
                  },
                ],
                isError: false,
              };
            }

            case "list": {
              const allNotes = await notesModule.getAllNotes(args.folderName);
              const summaries = notesModule.summariseNotes(
                allNotes,
                includeBody
              );
              return {
                content: [
                  {
                    type: "text",
                    text: summaries.length
                      ? summaries.map(formatNoteLine).join("\n\n")
                      : "No notes exist.",
                  },
                ],
                isError: false,
              };
            }

            case "get": {
              const noteId = requireBoundedString(
                args.noteId,
                "noteId",
                LIMITS.MEDIUM
              );
              const note = await notesModule.getNoteById(noteId);
              if (!note) {
                return {
                  content: [
                    { type: "text", text: `No note found with id "${noteId}"` },
                  ],
                  isError: true,
                };
              }
              const summary = notesModule.summariseNotes([note], true)[0];
              return {
                content: [{ type: "text", text: formatNoteLine(summary) }],
                isError: false,
              };
            }

            case "create": {
              const title = requireBoundedString(
                args.title,
                "title",
                LIMITS.SHORT
              );
              const body = requireBoundedString(
                args.body,
                "body",
                LIMITS.BODY,
                { allowEmpty: true }
              );
              const folderName = args.folderName
                ? requireBoundedString(
                    args.folderName,
                    "folderName",
                    LIMITS.SHORT
                  )
                : undefined;

              const result = await notesModule.createNote(
                title,
                body,
                folderName
              );

              if (result.success) {
                await memory.rememberNote(title, body);
              }

              return {
                content: [
                  {
                    type: "text",
                    text: result.success
                      ? `Created note "${title}" in folder "${result.folderName}"${result.usedDefaultFolder ? " (created new folder)" : ""}.`
                      : `Failed to create note: ${result.message}`,
                  },
                ],
                isError: !result.success,
              };
            }

            default:
              throw new Error(`Unknown operation: ${operation}`);
          }
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error accessing notes: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "reminders": {
        if (!isRemindersArgs(args)) {
          throw new Error("Invalid arguments for reminders tool");
        }

        try {
          const remindersModule = await loadModule("reminders");
          const memory = await initializeMemory();
          const { operation } = args;

          if (operation === "list") {
            const lists = await remindersModule.getAllLists();
            const allReminders = await remindersModule.getAllReminders();
            return {
              content: [
                {
                  type: "text",
                  text: `Found ${lists.length} lists and ${allReminders.length} reminders.`,
                },
              ],
              lists,
              reminders: allReminders,
              isError: false,
            };
          } else if (operation === "search") {
            const searchText = requireBoundedString(
              args.searchText,
              "searchText",
              LIMITS.MEDIUM
            );
            const results = await remindersModule.searchReminders(searchText);
            return {
              content: [
                {
                  type: "text",
                  text:
                    results.length > 0
                      ? `Found ${results.length} reminders matching "${searchText}".`
                      : `No reminders found matching "${searchText}".`,
                },
              ],
              reminders: results,
              isError: false,
            };
          } else if (operation === "open") {
            const searchText = requireBoundedString(
              args.searchText,
              "searchText",
              LIMITS.MEDIUM
            );
            const result = await remindersModule.openReminder(searchText);
            return {
              content: [
                {
                  type: "text",
                  text: result.success
                    ? `Opened Reminders app. Found reminder: ${result.reminder?.name}`
                    : result.message,
                },
              ],
              ...result,
              isError: !result.success,
            };
          } else if (operation === "create") {
            const name = requireBoundedString(args.name, "name", LIMITS.SHORT);
            const listName = args.listName
              ? requireBoundedString(args.listName, "listName", LIMITS.SHORT)
              : undefined;
            const notes = args.notes
              ? requireBoundedString(args.notes, "notes", LIMITS.LONG, {
                  allowEmpty: true,
                })
              : undefined;
            const dueDate = args.dueDate
              ? requireBoundedString(args.dueDate, "dueDate", LIMITS.SHORT)
              : undefined;

            const result = await remindersModule.createReminder(
              name,
              listName,
              notes,
              dueDate
            );
            await memory.rememberReminder(name, dueDate);

            return {
              content: [
                {
                  type: "text",
                  text: `Created reminder "${result.name}" ${listName ? `in list "${listName}"` : ""}.`,
                },
              ],
              success: true,
              reminder: result,
              isError: false,
            };
          } else if (operation === "listById") {
            const listId = requireBoundedString(
              args.listId,
              "listId",
              LIMITS.MEDIUM
            );
            const results = await remindersModule.getRemindersFromListById(
              listId,
              args.props
            );
            return {
              content: [
                {
                  type: "text",
                  text:
                    results.length > 0
                      ? `Found ${results.length} reminders in list with ID "${listId}".`
                      : `No reminders found in list with ID "${listId}".`,
                },
              ],
              reminders: results,
              isError: false,
            };
          } else if (operation === "complete") {
            const reminderId = requireBoundedString(
              args.reminderId,
              "reminderId",
              LIMITS.MEDIUM
            );
            const result =
              await remindersModule.completeReminder(reminderId);
            if (result.success && result.reminder) {
              await memory.rememberReminderCompleted(result.reminder.name);
            }
            return {
              content: [{ type: "text", text: result.message }],
              ...result,
              isError: !result.success,
            };
          } else if (operation === "delete") {
            const reminderId = requireBoundedString(
              args.reminderId,
              "reminderId",
              LIMITS.MEDIUM
            );
            const result = await remindersModule.deleteReminder(reminderId);
            return {
              content: [{ type: "text", text: result.message }],
              ...result,
              isError: !result.success,
            };
          }

          return {
            content: [{ type: "text", text: "Unknown operation" }],
            isError: true,
          };
        } catch (error) {
          console.error("Error in reminders tool:", error);
          return {
            content: [
              {
                type: "text",
                text: `Error in reminders tool: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
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
              const searchText = requireBoundedString(
                args.searchText,
                "searchText",
                LIMITS.MEDIUM
              );
              const events = await calendarModule.searchEvents(
                searchText,
                args.limit,
                args.fromDate,
                args.toDate
              );

              return {
                content: [
                  {
                    type: "text",
                    text:
                      events.length > 0
                        ? `Found ${events.length} events matching "${searchText}":\n\n${events
                            .map(
                              (event) =>
                                `${event.title} (${new Date(event.startDate!).toLocaleString()} - ${new Date(event.endDate!).toLocaleString()})\n` +
                                `Location: ${event.location || "Not specified"}\n` +
                                `Calendar: ${event.calendarName}\n` +
                                `ID: ${event.id}\n` +
                                `${event.notes ? `Notes: ${event.notes}\n` : ""}`
                            )
                            .join("\n\n")}`
                        : `No events found matching "${searchText}".`,
                  },
                ],
                isError: false,
              };
            }

            case "open": {
              const eventId = requireBoundedString(
                args.eventId,
                "eventId",
                LIMITS.MEDIUM
              );
              const result = await calendarModule.openEvent(eventId);
              return {
                content: [
                  {
                    type: "text",
                    text: result.success
                      ? result.message
                      : `Error opening event: ${result.message}`,
                  },
                ],
                isError: !result.success,
              };
            }

            case "list": {
              const { limit, fromDate, toDate } = args;
              const events = await calendarModule.getEvents(
                limit,
                fromDate,
                toDate
              );
              const startDateText = fromDate
                ? new Date(fromDate).toLocaleDateString()
                : "today";
              const endDateText = toDate
                ? new Date(toDate).toLocaleDateString()
                : "next 7 days";

              return {
                content: [
                  {
                    type: "text",
                    text:
                      events.length > 0
                        ? `Found ${events.length} events from ${startDateText} to ${endDateText}:\n\n${events
                            .map(
                              (event) =>
                                `${event.title} (${new Date(event.startDate!).toLocaleString()} - ${new Date(event.endDate!).toLocaleString()})\n` +
                                `Location: ${event.location || "Not specified"}\n` +
                                `Calendar: ${event.calendarName}\n` +
                                `ID: ${event.id}`
                            )
                            .join("\n\n")}`
                        : `No events found from ${startDateText} to ${endDateText}.`,
                  },
                ],
                isError: false,
              };
            }

            case "create": {
              const title = requireBoundedString(
                args.title,
                "title",
                LIMITS.SHORT
              );
              const startDate = requireBoundedString(
                args.startDate,
                "startDate",
                LIMITS.SHORT
              );
              const endDate = requireBoundedString(
                args.endDate,
                "endDate",
                LIMITS.SHORT
              );
              const result = await calendarModule.createEvent(
                title,
                startDate,
                endDate,
                args.location,
                args.notes,
                args.isAllDay,
                args.calendarName
              );
              return {
                content: [
                  {
                    type: "text",
                    text: result.success
                      ? `${result.message} Event scheduled from ${new Date(startDate).toLocaleString()} to ${new Date(endDate).toLocaleString()}${result.eventId ? `\nEvent ID: ${result.eventId}` : ""}`
                      : `Error creating event: ${result.message}`,
                  },
                ],
                isError: !result.success,
              };
            }

            default:
              throw new Error(`Unknown calendar operation: ${operation}`);
          }
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error in calendar tool: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
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
                content: [
                  {
                    type: "text",
                    text:
                      starters.length > 0
                        ? `Conversation starters:\n${starters.map((s) => `- ${s}`).join("\n")}`
                        : "No conversation starters available.",
                  },
                ],
                isError: false,
              };
            }

            case "get_memories": {
              const memories = await memory.getRecentMemories();
              return {
                content: [
                  {
                    type: "text",
                    text:
                      memories.length > 0
                        ? `Recent memories:\n${memories
                            .map(
                              (m) =>
                                `- ${m.content} (${new Date(m.timestamp).toLocaleString()})`
                            )
                            .join("\n")}`
                        : "No recent memories found.",
                  },
                ],
                isError: false,
              };
            }

            case "check_events": {
              const calendarModule = await loadModule("calendar");
              await memory.checkCompletedEvents(calendarModule);
              await memory.checkUpcomingEvents(calendarModule);

              const starters = await memory.getConversationStarters();
              return {
                content: [
                  {
                    type: "text",
                    text:
                      "Memory updated with recent events! " +
                      (starters.length > 0
                        ? `\nSuggested conversation starter: ${starters[0]}`
                        : ""),
                  },
                ],
                isError: false,
              };
            }

            default:
              throw new Error(`Unknown operation: ${operation}`);
          }
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error in Member Berries memory: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
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

console.error("Setting up Member Berries MCP server transport...");

(async () => {
  try {
    console.error("Initializing transport...");
    const transport = new StdioServerTransport();

    console.error("Setting up stdout filter...");
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any, encoding?: any, callback?: any) => {
      if (typeof chunk === "string" && !chunk.startsWith("{")) {
        console.error("Filtering non-JSON stdout message");
        return true;
      }
      return originalStdoutWrite(chunk, encoding, callback);
    };

    console.error("Connecting transport to server...");
    await server.connect(transport);
    console.error(`Member Berries server v${VERSION} connected successfully!`);
    console.error(
      "Ready to remember your activities and make conversations more natural!"
    );
  } catch (error) {
    console.error("Failed to initialize Member Berries MCP server:", error);
    process.exit(1);
  }
})();

function boundedOptional(
  value: unknown,
  max: number
): value is string | undefined {
  if (value === undefined) return true;
  return typeof value === "string" && value.length <= max;
}

function isNotesArgs(args: unknown): args is {
  operation: "search" | "list" | "get" | "create";
  searchText?: string;
  noteId?: string;
  title?: string;
  body?: string;
  folderName?: string;
  includeBody?: boolean;
} {
  if (typeof args !== "object" || args === null) return false;
  const { operation } = args as { operation?: unknown };
  if (typeof operation !== "string") return false;
  if (!["search", "list", "get", "create"].includes(operation)) return false;

  if (operation === "search") {
    const { searchText } = args as { searchText?: unknown };
    if (typeof searchText !== "string" || searchText === "") return false;
    if (searchText.length > LIMITS.MEDIUM) return false;
  }

  if (operation === "get") {
    const { noteId } = args as { noteId?: unknown };
    if (typeof noteId !== "string" || noteId === "") return false;
  }

  if (operation === "create") {
    const { title, body } = args as { title?: unknown; body?: unknown };
    if (typeof title !== "string" || title === "" || typeof body !== "string") {
      return false;
    }
    if (title.length > LIMITS.SHORT || body.length > LIMITS.BODY) return false;
    const { folderName } = args as { folderName?: unknown };
    if (
      folderName !== undefined &&
      (typeof folderName !== "string" || folderName === "")
    ) {
      return false;
    }
  }

  const { folderName, includeBody } = args as {
    folderName?: unknown;
    includeBody?: unknown;
  };
  if (!boundedOptional(folderName, LIMITS.SHORT)) return false;
  if (includeBody !== undefined && typeof includeBody !== "boolean") {
    return false;
  }

  return true;
}

function isRemindersArgs(args: unknown): args is {
  operation:
    | "list"
    | "search"
    | "open"
    | "create"
    | "listById"
    | "complete"
    | "delete";
  searchText?: string;
  name?: string;
  listName?: string;
  listId?: string;
  reminderId?: string;
  props?: string[];
  notes?: string;
  dueDate?: string;
} {
  if (typeof args !== "object" || args === null) return false;
  const a = args as any;
  if (typeof a.operation !== "string") return false;
  if (
    ![
      "list",
      "search",
      "open",
      "create",
      "listById",
      "complete",
      "delete",
    ].includes(a.operation)
  ) {
    return false;
  }

  if (
    (a.operation === "search" || a.operation === "open") &&
    (typeof a.searchText !== "string" ||
      a.searchText === "" ||
      a.searchText.length > LIMITS.MEDIUM)
  ) {
    return false;
  }

  if (
    a.operation === "create" &&
    (typeof a.name !== "string" ||
      a.name === "" ||
      a.name.length > LIMITS.SHORT)
  ) {
    return false;
  }

  if (
    a.operation === "listById" &&
    (typeof a.listId !== "string" || a.listId === "")
  ) {
    return false;
  }

  if (
    (a.operation === "complete" || a.operation === "delete") &&
    (typeof a.reminderId !== "string" || a.reminderId === "")
  ) {
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
  if (typeof args !== "object" || args === null) return false;
  const { operation } = args as { operation?: unknown };
  if (typeof operation !== "string") return false;
  if (!["search", "open", "list", "create"].includes(operation)) return false;

  if (operation === "search") {
    const { searchText } = args as { searchText?: unknown };
    if (typeof searchText !== "string" || searchText.length > LIMITS.MEDIUM) {
      return false;
    }
  }

  if (operation === "open") {
    const { eventId } = args as { eventId?: unknown };
    if (typeof eventId !== "string") return false;
  }

  if (operation === "create") {
    const { title, startDate, endDate } = args as {
      title?: unknown;
      startDate?: unknown;
      endDate?: unknown;
    };
    if (
      typeof title !== "string" ||
      typeof startDate !== "string" ||
      typeof endDate !== "string"
    ) {
      return false;
    }
  }

  return true;
}

function isMemberBerriesArgs(args: unknown): args is {
  operation: "get_starters" | "get_memories" | "check_events";
} {
  if (typeof args !== "object" || args === null) return false;
  const { operation } = args as { operation?: unknown };
  if (typeof operation !== "string") return false;
  return ["get_starters", "get_memories", "check_events"].includes(operation);
}
