import fs from "fs/promises";
import path from "path";

// Member Berries Memory Layer
// Stores contextual memories from calendar events, notes, and reminders

export interface MemberBerry {
  id: string;
  type:
    | "event_completed"
    | "reminder_completed"
    | "reminder_created"
    | "note_created"
    | "upcoming_event";
  timestamp: string;
  content: string;
  context: string;
  metadata?: {
    originalTitle?: string;
    location?: string;
    participants?: string[];
    category?: string;
  };
}

interface MemoryStore {
  berries: MemberBerry[];
  lastCheck: string;
  conversationStarters: string[];
}

const MEMORY_FILE = path.join(
  process.env.HOME || "",
  ".member-berries-memory.json"
);
const MAX_BERRIES = 50;
const MEMORY_RETENTION_DAYS = 7;
const FILE_MODE = 0o600;

/** Built-in starters so the product works without a pasted host prompt */
export const DEFAULT_CONVERSATION_STARTERS = [
  "Anything on your calendar I should know about today?",
  "Want me to check what's due in Reminders?",
  "How did things go earlier — anything worth noting?",
  "Shall I pull a quick day briefing?",
  "Any notes you want me to find or file?",
];

class MemberBerriesMemory {
  private memoryStore: MemoryStore;
  private memoryPath: string;

  constructor(memoryPath: string = MEMORY_FILE) {
    this.memoryPath = memoryPath;
    this.memoryStore = {
      berries: [],
      lastCheck: new Date().toISOString(),
      conversationStarters: [...DEFAULT_CONVERSATION_STARTERS],
    };
  }

  async initialize() {
    try {
      const data = await fs.readFile(this.memoryPath, "utf-8");
      this.memoryStore = JSON.parse(data);
      this.cleanOldMemories();
      if (
        !this.memoryStore.conversationStarters ||
        this.memoryStore.conversationStarters.length === 0
      ) {
        this.memoryStore.conversationStarters = [
          ...DEFAULT_CONVERSATION_STARTERS,
        ];
      }
      await this.save();
    } catch {
      await this.save();
    }
  }

  private async save() {
    await fs.writeFile(
      this.memoryPath,
      JSON.stringify(this.memoryStore, null, 2),
      { mode: FILE_MODE }
    );
    try {
      await fs.chmod(this.memoryPath, FILE_MODE);
    } catch {
      /* best-effort on platforms that ignore mode */
    }
  }

  /** Exposed for tests */
  getMemoryPath(): string {
    return this.memoryPath;
  }

  private cleanOldMemories() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MEMORY_RETENTION_DAYS);

    this.memoryStore.berries = this.memoryStore.berries
      .filter((berry) => new Date(berry.timestamp) > cutoffDate)
      .slice(-MAX_BERRIES);
  }

  private generateContext(title: string, _location?: string): string {
    const lowerTitle = title.toLowerCase();

    if (
      lowerTitle.includes("shop") ||
      lowerTitle.includes("buy") ||
      lowerTitle.includes("store")
    ) {
      return "shopping";
    }
    if (
      lowerTitle.includes("meeting") ||
      lowerTitle.includes("call") ||
      lowerTitle.includes("interview")
    ) {
      return "meeting";
    }
    if (
      lowerTitle.includes("doctor") ||
      lowerTitle.includes("dentist") ||
      lowerTitle.includes("gym")
    ) {
      return "health";
    }
    if (
      lowerTitle.includes("dinner") ||
      lowerTitle.includes("lunch") ||
      lowerTitle.includes("coffee")
    ) {
      return "social";
    }
    if (
      lowerTitle.includes("deadline") ||
      lowerTitle.includes("project") ||
      lowerTitle.includes("presentation")
    ) {
      return "work";
    }

    return "general";
  }

  async checkCompletedEvents(calendarModule: any) {
    const now = new Date();
    const lastCheck = new Date(this.memoryStore.lastCheck);

    const events = await calendarModule.getEvents(
      100,
      lastCheck.toISOString(),
      now.toISOString()
    );

    for (const event of events) {
      const eventEnd = new Date(event.endDate);
      if (eventEnd < now && eventEnd > lastCheck) {
        const berry: MemberBerry = {
          id: `event_${Date.now()}_${Math.random()}`,
          type: "event_completed",
          timestamp: event.endDate,
          content: `Completed: ${event.title}`,
          context: this.generateContext(event.title, event.location),
          metadata: {
            originalTitle: event.title,
            location: event.location || undefined,
            category: event.calendarName,
          },
        };

        this.memoryStore.berries.push(berry);
        this.generateConversationStarter(berry);
      }
    }

    this.memoryStore.lastCheck = now.toISOString();
    await this.save();
  }

  async checkUpcomingEvents(calendarModule: any) {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events = await calendarModule.getEvents(
      10,
      now.toISOString(),
      tomorrow.toISOString()
    );

    for (const event of events) {
      const berry: MemberBerry = {
        id: `upcoming_${Date.now()}_${Math.random()}`,
        type: "upcoming_event",
        timestamp: event.startDate,
        content: `Upcoming: ${event.title}`,
        context: this.generateContext(event.title, event.location),
        metadata: {
          originalTitle: event.title,
          location: event.location || undefined,
        },
      };

      const exists = this.memoryStore.berries.some(
        (b) =>
          b.type === "upcoming_event" &&
          b.metadata?.originalTitle === event.title &&
          b.timestamp === event.startDate
      );

      if (!exists) {
        this.memoryStore.berries.push(berry);
      }
    }

    await this.save();
  }

  private generateConversationStarter(berry: MemberBerry) {
    const starters: string[] = [];

    switch (berry.context) {
      case "shopping":
        starters.push(
          `How did the shopping trip go? Did you find everything you needed?`,
          `I hope the ${berry.metadata?.location || "store"} wasn't too crowded!`,
          `Did you remember to get everything on your list?`
        );
        break;
      case "meeting":
        starters.push(
          `How did your meeting go? Hope it was productive!`,
          `Was the ${berry.metadata?.originalTitle} meeting helpful?`,
          `Hope your meeting went well earlier!`
        );
        break;
      case "health":
        starters.push(
          `How did your appointment go? Everything okay?`,
          `Hope your visit went smoothly!`,
          `Feeling good after your appointment?`
        );
        break;
      case "social":
        starters.push(
          `How was ${berry.metadata?.originalTitle}? Have a good time?`,
          `Did you enjoy your outing?`,
          `Hope you had a nice time!`
        );
        break;
      case "work":
        starters.push(
          `How did the ${berry.metadata?.originalTitle} go?`,
          `Did you manage to complete everything?`,
          `Hope the deadline wasn't too stressful!`
        );
        break;
      default:
        starters.push(
          `How did "${berry.metadata?.originalTitle}" go?`,
          `Everything work out with your plans earlier?`
        );
    }

    const starter = starters[Math.floor(Math.random() * starters.length)];
    this.memoryStore.conversationStarters = [
      starter,
      ...this.memoryStore.conversationStarters.filter(
        (s) => !DEFAULT_CONVERSATION_STARTERS.includes(s)
      ),
      ...DEFAULT_CONVERSATION_STARTERS,
    ].slice(0, 8);
  }

  async getRecentMemories(): Promise<MemberBerry[]> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    return this.memoryStore.berries
      .filter((berry) => new Date(berry.timestamp) > cutoff)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }

  async getConversationStarters(): Promise<string[]> {
    if (this.memoryStore.conversationStarters.length === 0) {
      return [...DEFAULT_CONVERSATION_STARTERS];
    }
    return this.memoryStore.conversationStarters;
  }

  async rememberNote(noteTitle: string, _noteContent: string) {
    const berry: MemberBerry = {
      id: `note_${Date.now()}_${Math.random()}`,
      type: "note_created",
      timestamp: new Date().toISOString(),
      content: `Created note: ${noteTitle}`,
      context: "notes",
      metadata: {
        originalTitle: noteTitle,
      },
    };

    this.memoryStore.berries.push(berry);
    await this.save();
  }

  async rememberReminder(reminderName: string, dueDate?: string) {
    const berry: MemberBerry = {
      id: `reminder_${Date.now()}_${Math.random()}`,
      type: "reminder_created",
      timestamp: new Date().toISOString(),
      content: dueDate
        ? `Reminder set: ${reminderName} (due ${dueDate})`
        : `Reminder set: ${reminderName}`,
      context: "tasks",
      metadata: {
        originalTitle: reminderName,
      },
    };

    this.memoryStore.berries.push(berry);
    await this.save();
  }

  async rememberReminderCompleted(reminderName: string) {
    const berry: MemberBerry = {
      id: `reminder_done_${Date.now()}_${Math.random()}`,
      type: "reminder_completed",
      timestamp: new Date().toISOString(),
      content: `Completed reminder: ${reminderName}`,
      context: "tasks",
      metadata: {
        originalTitle: reminderName,
      },
    };
    this.memoryStore.berries.push(berry);
    this.generateConversationStarter(berry);
    await this.save();
  }
}

export { FILE_MODE as MEMORY_FILE_MODE, MEMORY_FILE };
export default MemberBerriesMemory;
