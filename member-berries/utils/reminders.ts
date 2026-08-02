import { run } from "@jxa/run";
import { AppleAccessError } from "./errors";
import {
  filterRemindersByListId,
  filterRemindersDueToday,
} from "./remindersFormat";

export interface ReminderList {
  name: string;
  id: string;
}

export interface Reminder {
  name: string;
  id: string;
  body: string;
  completed: boolean;
  dueDate: string | null;
  listName: string;
  listId: string;
  completionDate?: string | null;
  creationDate?: string | null;
  modificationDate?: string | null;
  remindMeDate?: string | null;
  priority?: number;
}

export { filterRemindersByListId, filterRemindersDueToday };

class ReminderCache {
  private cache: Reminder[] | null = null;
  private cacheTime = 0;
  private readonly cacheDuration = 30000;

  async getAll(): Promise<Reminder[]> {
    const now = Date.now();
    if (!this.cache || now - this.cacheTime > this.cacheDuration) {
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
        const listId = list.id();
        const reminders = list.reminders;

        const names = reminders.name();
        const ids = reminders.id();
        const bodies = reminders.body();
        const completed = reminders.completed();

        let dueDates: any[] = [];
        try {
          dueDates = reminders.dueDate();
        } catch {
          dueDates = new Array(names.length).fill(null);
        }

        for (let j = 0; j < names.length; j++) {
          allReminders.push({
            name: names[j],
            id: ids[j],
            body: bodies[j] || "",
            completed: completed[j],
            dueDate: dueDates[j] ? dueDates[j].toISOString() : null,
            listName: listName,
            listId: listId,
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

const cache = new ReminderCache();

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

async function requireRemindersRunning(): Promise<void> {
  if (!(await isRemindersRunning())) {
    throw new AppleAccessError(
      "Reminders",
      "Reminders app is not running. Please open it first."
    );
  }
}

async function getAllLists(): Promise<ReminderList[]> {
  await requireRemindersRunning();
  try {
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
    throw new AppleAccessError(
      "Reminders",
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function getAllReminders(listName?: string): Promise<Reminder[]> {
  await requireRemindersRunning();
  try {
    const allReminders = await cache.getAll();
    if (listName) {
      return allReminders.filter((r) => r.listName === listName);
    }
    return allReminders;
  } catch (error) {
    if (error instanceof AppleAccessError) throw error;
    throw new AppleAccessError(
      "Reminders",
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function searchReminders(searchText: string): Promise<Reminder[]> {
  await requireRemindersRunning();
  const allReminders = await cache.getAll();
  const lower = searchText.toLowerCase();
  return allReminders.filter(
    (r) =>
      r.name.toLowerCase().includes(lower) ||
      r.body.toLowerCase().includes(lower)
  );
}

async function createReminder(
  name: string,
  listName: string = "Reminders",
  notes?: string,
  dueDate?: string
): Promise<Reminder> {
  await requireRemindersRunning();
  try {
    const result = await run(
      (
        name: string,
        listName: string,
        notes: string | undefined,
        dueDate: string | undefined
      ) => {
        const Reminders = Application("Reminders");
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

        const reminderProps: any = { name: name };
        if (notes) reminderProps.body = notes;
        if (dueDate) reminderProps.dueDate = new Date(dueDate);

        const newReminder = list.make({
          new: "reminder",
          withProperties: reminderProps,
        });

        return {
          name: newReminder.name(),
          id: newReminder.id(),
          body: newReminder.body() || "",
          completed: newReminder.completed(),
          dueDate: newReminder.dueDate()
            ? newReminder.dueDate().toISOString()
            : null,
          listName: list.name(),
          listId: list.id(),
        };
      },
      name,
      listName,
      notes,
      dueDate
    );

    cache.clearCache();
    return result as Reminder;
  } catch (error) {
    console.error("Error creating reminder:", error);
    throw error;
  }
}

async function openReminder(
  searchText: string
): Promise<{ success: boolean; message: string; reminder?: Reminder }> {
  try {
    await requireRemindersRunning();
    const matchingReminders = await searchReminders(searchText);
    if (matchingReminders.length === 0) {
      return { success: false, message: "No matching reminders found" };
    }
    return {
      success: true,
      message: "Found reminder",
      reminder: matchingReminders[0],
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function getRemindersFromListById(
  listId: string,
  _props?: string[]
): Promise<Reminder[]> {
  await requireRemindersRunning();
  try {
    const allReminders = await cache.getAll();
    return filterRemindersByListId(allReminders, listId);
  } catch (error) {
    if (error instanceof AppleAccessError) throw error;
    throw new AppleAccessError(
      "Reminders",
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function completeReminder(
  reminderId: string
): Promise<{ success: boolean; message: string; reminder?: Reminder }> {
  await requireRemindersRunning();
  try {
    const result = await run((reminderId: string) => {
      const Reminders = Application("Reminders");
      const lists = Reminders.lists();
      for (let i = 0; i < lists.length; i++) {
        const list = lists[i];
        const matches = list.reminders.whose({ id: { _equals: reminderId } })();
        if (matches.length > 0) {
          const reminder = matches[0];
          reminder.completed = true;
          return {
            success: true,
            message: `Completed reminder: ${reminder.name()}`,
            reminder: {
              name: reminder.name(),
              id: reminder.id(),
              body: reminder.body() || "",
              completed: true,
              dueDate: reminder.dueDate()
                ? reminder.dueDate().toISOString()
                : null,
              listName: list.name(),
              listId: list.id(),
            },
          };
        }
      }
      return {
        success: false,
        message: `No reminder found with ID: ${reminderId}`,
      };
    }, reminderId);

    cache.clearCache();
    return result as { success: boolean; message: string; reminder?: Reminder };
  } catch (error) {
    return {
      success: false,
      message: `Error completing reminder: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function deleteReminder(
  reminderId: string
): Promise<{ success: boolean; message: string }> {
  await requireRemindersRunning();
  try {
    const result = await run((reminderId: string) => {
      const Reminders = Application("Reminders");
      const lists = Reminders.lists();
      for (let i = 0; i < lists.length; i++) {
        const list = lists[i];
        const matches = list.reminders.whose({ id: { _equals: reminderId } })();
        if (matches.length > 0) {
          const reminder = matches[0];
          const name = reminder.name();
          Reminders.delete(reminder);
          return {
            success: true,
            message: `Deleted reminder: ${name}`,
          };
        }
      }
      return {
        success: false,
        message: `No reminder found with ID: ${reminderId}`,
      };
    }, reminderId);

    cache.clearCache();
    return result as { success: boolean; message: string };
  } catch (error) {
    return {
      success: false,
      message: `Error deleting reminder: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export default {
  getAllLists,
  getAllReminders,
  searchReminders,
  createReminder,
  openReminder,
  getRemindersFromListById,
  completeReminder,
  deleteReminder,
  filterRemindersByListId,
  filterRemindersDueToday,
  isRemindersRunning,
  clearCache: () => cache.clearCache(),
};
