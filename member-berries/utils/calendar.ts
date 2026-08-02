import { run } from "@jxa/run";
import { AppleAccessError } from "./errors";
import { CONFIG, PRIORITY_NAMES } from "./calendarConfig";

export interface CalendarEvent {
  id: string;
  title: string;
  location: string | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  calendarName: string;
  isAllDay: boolean;
  url: string | null;
}

type EventArgs = {
  limit: number;
  fromDate?: string;
  toDate?: string;
  maxEventsPerCalendar: number;
  maxCalendars: number;
  pastDays: number;
  futureDays: number;
  searchText?: string;
  priorityNames: string[];
};

async function checkCalendarAccess(): Promise<boolean> {
  try {
    const result = (await run(() => {
      try {
        const Calendar = Application("Calendar");
        Calendar.name();
        return true;
      } catch {
        throw new Error("Cannot access Calendar app");
      }
    })) as boolean;
    return result;
  } catch (error) {
    console.error(
      `Cannot access Calendar app: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

async function requireCalendarAccess(): Promise<void> {
  if (!(await checkCalendarAccess())) {
    throw new AppleAccessError("Calendar");
  }
}

/**
 * Shared JXA walker used by getEvents and searchEvents.
 * Priority calendars first, then the rest, up to maxCalendars.
 */
async function collectEvents(args: EventArgs): Promise<CalendarEvent[]> {
  return (await run((args: EventArgs) => {
    try {
      const Calendar = Application("Calendar");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const defaultStart = new Date(today);
      defaultStart.setDate(today.getDate() - args.pastDays);
      const defaultEnd = new Date(today);
      defaultEnd.setDate(today.getDate() + args.futureDays);
      const startDate = args.fromDate ? new Date(args.fromDate) : defaultStart;
      const endDate = args.toDate ? new Date(args.toDate) : defaultEnd;

      const calendars = Calendar.calendars();
      const events: CalendarEvent[] = [];
      let calendarsProcessed = 0;

      const readEvent = (event: any, calName: string): CalendarEvent | null => {
        try {
          const eventStartDate = new Date(event.startDate());
          const eventEndDate = new Date(event.endDate());
          if (eventEndDate < startDate || eventStartDate > endDate) return null;

          let title = "Unknown Title";
          let location: string | null = null;
          let notes: string | null = null;
          try {
            title = event.summary();
          } catch {
            /* keep default */
          }
          try {
            location = event.location();
          } catch {
            /* null */
          }
          try {
            notes = event.description();
          } catch {
            /* null */
          }

          if (args.searchText) {
            const needle = args.searchText.toLowerCase();
            const hay = `${title} ${location || ""} ${notes || ""}`.toLowerCase();
            if (!hay.includes(needle)) return null;
          }

          const eventData: CalendarEvent = {
            id: "",
            title,
            location,
            notes,
            startDate: null,
            endDate: null,
            calendarName: calName,
            isAllDay: false,
            url: null,
          };
          try {
            eventData.id = event.uid();
          } catch {
            eventData.id = `unknown-${Date.now()}-${Math.random()}`;
          }
          try {
            eventData.startDate = eventStartDate.toISOString();
          } catch {
            /* null */
          }
          try {
            eventData.endDate = eventEndDate.toISOString();
          } catch {
            /* null */
          }
          try {
            eventData.isAllDay = event.alldayEvent();
          } catch {
            /* false */
          }
          try {
            eventData.url = event.url();
          } catch {
            /* null */
          }
          return eventData;
        } catch {
          return null;
        }
      };

      const processCalendar = (calendar: any, onlyPriority: boolean) => {
        if (events.length >= args.limit || calendarsProcessed >= args.maxCalendars) {
          return;
        }
        try {
          const calName = calendar.name();
          const isPriority = args.priorityNames.includes(calName);
          if (onlyPriority && !isPriority) return;
          if (!onlyPriority && isPriority) return;

          calendarsProcessed++;
          const calendarEvents = calendar.events.whose({
            _and: [
              { startDate: { _greaterThan: startDate } },
              { endDate: { _lessThan: endDate } },
            ],
          });
          const convertedEvents = calendarEvents();
          const eventCount = Math.min(
            convertedEvents.length,
            args.maxEventsPerCalendar
          );

          for (let i = 0; i < eventCount && events.length < args.limit; i++) {
            const eventData = readEvent(convertedEvents[i], calName);
            if (eventData) events.push(eventData);
          }
        } catch {
          /* skip inaccessible calendars */
        }
      };

      for (const calendar of calendars) processCalendar(calendar, true);
      if (events.length < args.limit) {
        for (const calendar of calendars) processCalendar(calendar, false);
      }

      return events;
    } catch {
      return [];
    }
  }, args)) as CalendarEvent[];
}

async function getEvents(
  limit = 10,
  fromDate?: string,
  toDate?: string
): Promise<CalendarEvent[]> {
  await requireCalendarAccess();
  console.error("getEvents - Starting to fetch calendar events");
  const events = await collectEvents({
    limit,
    fromDate,
    toDate,
    maxEventsPerCalendar: CONFIG.MAX_EVENTS_PER_CALENDAR,
    maxCalendars: CONFIG.MAX_CALENDARS,
    pastDays: CONFIG.PAST_DAYS,
    futureDays: CONFIG.FUTURE_DAYS,
    priorityNames: PRIORITY_NAMES,
  });
  if (events.length === 0) {
    console.error("getEvents - No events found");
  }
  return events;
}

async function searchEvents(
  searchText: string,
  limit = 10,
  fromDate?: string,
  toDate?: string
): Promise<CalendarEvent[]> {
  await requireCalendarAccess();
  console.error(`searchEvents - Processing calendars for search: "${searchText}"`);
  const events = await collectEvents({
    limit,
    fromDate,
    toDate,
    maxEventsPerCalendar: CONFIG.MAX_EVENTS_PER_CALENDAR,
    maxCalendars: CONFIG.MAX_CALENDARS,
    pastDays: CONFIG.PAST_DAYS,
    futureDays: CONFIG.FUTURE_DAYS,
    searchText,
    priorityNames: PRIORITY_NAMES,
  });
  if (events.length === 0) {
    console.error("searchEvents - No events found");
  }
  return events;
}

async function openEvent(
  eventId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireCalendarAccess();
    console.error(`openEvent - Attempting to open event with ID: ${eventId}`);

    return (await run(
      (args: { eventId: string }) => {
        try {
          const Calendar = Application("Calendar");
          const allCalendars = Calendar.calendars();
          for (let i = 0; i < allCalendars.length; i++) {
            try {
              const calendar = allCalendars[i];
              const events = calendar.events.whose({
                uid: { _equals: args.eventId },
              });
              const event = events[0];
              if (event.uid() === args.eventId) {
                Calendar.activate();
                event.show();
                return {
                  success: true,
                  message: `Successfully opened event: ${event.summary()}`,
                };
              }
            } catch {
              /* skip */
            }
          }
          return {
            success: false,
            message: `No event found with ID: ${args.eventId}`,
          };
        } catch {
          return { success: false, message: "Error opening event" };
        }
      },
      { eventId }
    )) as { success: boolean; message: string };
  } catch (error) {
    return {
      success: false,
      message: `Error opening event: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function createEvent(
  title: string,
  startDate: string,
  endDate: string,
  location?: string,
  notes?: string,
  isAllDay = false,
  calendarName?: string
): Promise<{ success: boolean; message: string; eventId?: string }> {
  try {
    await requireCalendarAccess();
    console.error(`createEvent - Attempting to create event: "${title}"`);

    return (await run(
      (args: {
        title: string;
        startDate: string;
        endDate: string;
        location?: string;
        notes?: string;
        isAllDay: boolean;
        calendarName?: string;
      }) => {
        try {
          const Calendar = Application("Calendar");
          const startDateTime = new Date(args.startDate);
          const endDateTime = new Date(args.endDate);

          let targetCalendar: any;
          if (args.calendarName) {
            const calendars = Calendar.calendars.whose({
              name: { _equals: args.calendarName },
            });
            if (calendars.length > 0) {
              targetCalendar = calendars[0];
            } else {
              return {
                success: false,
                message: `Calendar "${args.calendarName}" not found.`,
              };
            }
          } else {
            const allCalendars = Calendar.calendars();
            if (allCalendars.length === 0) {
              return {
                success: false,
                message: "No calendars found in Calendar app.",
              };
            }
            targetCalendar = allCalendars[0];
          }

          const newEvent = Calendar.Event({
            summary: args.title,
            startDate: startDateTime,
            endDate: endDateTime,
            location: args.location || "",
            description: args.notes || "",
            alldayEvent: args.isAllDay,
          });
          targetCalendar.events.push(newEvent);

          return {
            success: true,
            message: `Event "${args.title}" created successfully.`,
            eventId: newEvent.uid(),
          };
        } catch (e) {
          return {
            success: false,
            message: `Error creating event: ${e instanceof Error ? e.message : String(e)}`,
          };
        }
      },
      {
        title,
        startDate,
        endDate,
        location,
        notes,
        isAllDay,
        calendarName,
      }
    )) as { success: boolean; message: string; eventId?: string };
  } catch (error) {
    return {
      success: false,
      message: `Error creating event: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export { PRIORITY_NAMES, CONFIG } from "./calendarConfig";

export default {
  searchEvents,
  openEvent,
  getEvents,
  createEvent,
};
