/** Apple app access / availability errors surfaced to MCP clients */
export class AppleAccessError extends Error {
  constructor(app: string, detail?: string) {
    const base =
      `Cannot access ${app}. Open the app and grant access in System Settings > Privacy & Security > Automation / Calendars / Reminders / Notes.`;
    super(detail ? `${base} ${detail}` : base);
    this.name = "AppleAccessError";
  }
}

export function formatAccessFailure(app: string, error: unknown): never {
  const detail = error instanceof Error ? error.message : String(error);
  throw new AppleAccessError(app, detail);
}
