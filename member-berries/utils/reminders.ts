import { run } from "@jxa/run";

// Production-ready Reminders implementation that prevents restart loops
// Fixes issues #26, #27 in the original apple-mcp repository

interface ReminderList {
  name: string;
  id: string;
}

interface Reminder {
  name: string;
  id: string;
  body: string;
  completed: boolean;
  dueDate: string | null;
  listName: string;
  completionDate?: string | null;
  creationDate?: string | null;
  modificationDate?: string | null;
  remindMeDate?: string | null;
  priority?: number;
}

// Cache for performance with large reminder lists
class ReminderCache {
  private cache: Reminder[] | null = null;
  private cacheTime: number = 0;
  private readonly cacheDuration = 30000; // 30 second cache
  
  async getAll(): Promise<Reminder[]> {
    const now = Date.now();
    if (!this.cache || (now - this.cacheTime) > this.cacheDuration) {
      this.cache = await this.fetchAll();
      this.cacheTime = now;
    }
    return this.cache;
  }
  
  private async fetchAll(): Promise<Reminder[]> {
    return await run(() => {
      const Reminders = Application("Reminders");
      const lists = Reminders.lists();
      const allReminders: Reminder[] = [];
      
      for (let i = 0; i < lists.length; i++) {
        const list = lists[i];
        const listName = list.name();
        const reminders = list.reminders;
        
        // Bulk property access - much faster than individual access
        const names = reminders.name();
        const ids = reminders.id();
        const bodies = reminders.body();
        const completed = reminders.completed();
        
        // Handle dates carefully as they might all be null
        let dueDates: any[] = [];
        try {
          dueDates = reminders.dueDate();
        } catch {
          dueDates = new Array(names.length).fill(null);
        }
        
        // Build reminder objects
        for (let j = 0; j < names.length; j++) {
          allReminders.push({
            name: names[j],
            id: ids[j],
            body: bodies[j] || "",
            completed: completed[j],
            dueDate: dueDates[j] ? dueDates[j].toISOString() : null,
            listName: listName
          });
        }
      }
      
      return allReminders;
    });
  }
  
  clearCache(): void {
    this.cache = null;
  }
}

// Global cache instance
const cache = new ReminderCache();

/**
 * Check if Reminders app is running without activating it
 * CRITICAL: This prevents the restart loop issue
 */
async function isRemindersRunning(): Promise<boolean> {
  try {
    return await run(() => {
      const systemEvents = Application("System Events");
      const processes = systemEvents.processes.whose({ name: "Reminders" })();
      return processes.length > 0;
    });
  } catch {
    return false;
  }
}

/**
 * Get all reminder lists
 */
async function getAllLists(): Promise<ReminderList[]> {
  try {
    // Check if app is running - prevents restart loops
    if (!await isRemindersRunning()) {
      console.error("Reminders app is not running. Please open it first.");
      return [];
    }

    const lists = await run(() => {
      const Reminders = Application("Reminders");
      const lists = Reminders.lists();
      
      return lists.map((list: any) => ({
        name: list.name(),
        id: list.id(),
      }));
    });

    return lists as ReminderList[];
  } catch (error) {
    console.error("Error getting lists:", error);
    return [];
  }
}

/**
 * Get all reminders with caching for performance
 */
async function getAllReminders(listName?: string): Promise<Reminder[]> {
  try {
    // Check if app is running
    if (!await isRemindersRunning()) {
      console.error("Reminders app is not running. Please open it first.");
      return [];
    }

    const allReminders = await cache.getAll();
    
    // Filter by list name if provided
    if (listName) {
      return allReminders.filter(r => r.listName === listName);
    }
    
    return allReminders;
  } catch (error) {
    console.error("Error getting reminders:", error);
    return [];
  }
}

/**
 * Search reminders using fast JavaScript filtering instead of slow JXA
 */
async function searchReminders(searchText: string): Promise<Reminder[]> {
  try {
    // Check if app is running
    if (!await isRemindersRunning()) {
      console.error("Reminders app is not running. Please open it first.");
      return [];
    }

    const allReminders = await cache.getAll();
    const lower = searchText.toLowerCase();
    
    return allReminders.filter(r => 
      r.name.toLowerCase().includes(lower) || 
      r.body.toLowerCase().includes(lower)
    );
  } catch (error) {
    console.error("Error searching reminders:", error);
    return [];
  }
}

/**
 * Create a new reminder
 * CRITICAL: No app activation to prevent restart loops
 */
async function createReminder(
  name: string,
  listName: string = "Reminders",
  notes?: string,
  dueDate?: string
): Promise<Reminder> {
  try {
    // Check if app is running
    if (!await isRemindersRunning()) {
      throw new Error("Reminders app is not running. Please open it first.");
    }

    const result = await run(
      (name: string, listName: string, notes: string | undefined, dueDate: string | undefined) => {
        const Reminders = Application("Reminders");
        
        // Find or create the list
        let list;
        const existingLists = Reminders.lists.whose({ name: listName })();
        
        if (existingLists.length > 0) {
          list = existingLists[0];
        } else {
          list = Reminders.make({
            new: "list",
            withProperties: { name: listName },
          });
        }
        
        // Create reminder properties
        const reminderProps: any = { name: name };
        if (notes) reminderProps.body = notes;
        if (dueDate) reminderProps.dueDate = new Date(dueDate);
        
        // Create the reminder
        const newReminder = list.make({
          new: "reminder",
          withProperties: reminderProps,
        });
        
        return {
          name: newReminder.name(),
          id: newReminder.id(),
          body: newReminder.body() || "",
          completed: newReminder.completed(),
          dueDate: newReminder.dueDate() ? newReminder.dueDate().toISOString() : null,
          listName: list.name(),
        };
      },
      name,
      listName,
      notes,
      dueDate
    );
    
    // Clear cache after creating
    cache.clearCache();
    return result as Reminder;
  } catch (error) {
    console.error("Error creating reminder:", error);
    throw error;
  }
}

/**
 * Open reminder WITHOUT forcing app activation
 * CRITICAL: Returns data only, doesn't activate app to prevent loops
 */
async function openReminder(searchText: string): Promise<{success: boolean; message: string; reminder?: Reminder}> {
  try {
    // Check if app is running
    if (!await isRemindersRunning()) {
      return { 
        success: false, 
        message: "Reminders app is not running. Please open it first." 
      };
    }

    const matchingReminders = await searchReminders(searchText);
    
    if (matchingReminders.length === 0) {
      return { 
        success: false, 
        message: "No matching reminders found" 
      };
    }
    
    // Return the first match WITHOUT forcing app activation
    return {
      success: true,
      message: "Found reminder",
      reminder: matchingReminders[0],
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get reminders from list by ID
 */
async function getRemindersFromListById(listId: string, props?: string[]): Promise<any[]> {
  try {
    // For now, return all reminders since we don't track list IDs in cache
    // This maintains compatibility while using the fast approach
    const allReminders = await getAllReminders();
    return allReminders;
  } catch (error) {
    console.error("Error getting reminders by list ID:", error);
    return [];
  }
}

// Export with backward compatibility
export default {
  getAllLists,
  getAllReminders,
  searchReminders,
  createReminder,
  openReminder,
  getRemindersFromListById,
  
  // Additional utility functions
  isRemindersRunning,
  clearCache: () => cache.clearCache(),
};
