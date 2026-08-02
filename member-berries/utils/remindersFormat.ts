export interface ReminderLike {
  name: string;
  id: string;
  body: string;
  completed: boolean;
  dueDate: string | null;
  listName: string;
  listId: string;
}

/** Pure filter — unit-tested without Reminders.app */
export function filterRemindersByListId<T extends { listId: string }>(
  reminders: T[],
  listId: string
): T[] {
  return reminders.filter((r) => r.listId === listId);
}

export function filterRemindersDueToday<
  T extends { completed: boolean; dueDate: string | null },
>(reminders: T[], now = new Date()): T[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return reminders.filter((r) => {
    if (r.completed) return false;
    if (!r.dueDate) return false;
    const due = new Date(r.dueDate);
    return due >= start && due <= end;
  });
}
