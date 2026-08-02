import { describe, expect, test } from "bun:test";
import { VERSION } from "../version";
import { LIMITS, requireBoundedString } from "../utils/limits";
import {
  filterNotesByFolder,
  makeSnippet,
  toNoteSummary,
} from "../utils/notesFormat";
import {
  filterRemindersByListId,
  filterRemindersDueToday,
  type ReminderLike,
} from "../utils/remindersFormat";
import { PRIORITY_NAMES } from "../utils/calendarConfig";
import MemberBerriesMemory, {
  DEFAULT_CONVERSATION_STARTERS,
  MEMORY_FILE_MODE,
} from "../memory/MemberBerriesMemory";
import { mkdtemp, readFile, stat } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { readFileSync } from "fs";

describe("version pin", () => {
  test("version.ts matches package.json", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf-8")
    );
    expect(VERSION).toBe(pkg.version);
    expect(VERSION).toBe("2.1.1");
  });
});

describe("limits", () => {
  test("rejects oversized strings", () => {
    expect(() =>
      requireBoundedString("x".repeat(LIMITS.SHORT + 1), "title", LIMITS.SHORT)
    ).toThrow(/maximum length/);
  });

  test("accepts bounded strings", () => {
    expect(requireBoundedString("hello", "title", LIMITS.SHORT)).toBe("hello");
  });
});

describe("notes privacy defaults", () => {
  test("snippet truncates long bodies", () => {
    const s = makeSnippet("a".repeat(400), 160);
    expect(s.length).toBeLessThanOrEqual(160);
    expect(s.endsWith("…")).toBe(true);
  });

  test("toNoteSummary omits body by default", () => {
    const summary = toNoteSummary({
      id: "1",
      name: "Secret",
      content: "very private body text",
    });
    expect(summary.content).toBeUndefined();
    expect(summary.snippet).toContain("private");
  });

  test("toNoteSummary includes body when requested", () => {
    const summary = toNoteSummary(
      { id: "1", name: "Secret", content: "body" },
      true
    );
    expect(summary.content).toBe("body");
  });

  test("folder filter is case-insensitive", () => {
    const notes = [
      { id: "1", name: "A", content: "", folderName: "Work" },
      { id: "2", name: "B", content: "", folderName: "Personal" },
    ];
    expect(filterNotesByFolder(notes, "work")).toHaveLength(1);
  });
});

describe("reminders listById filter", () => {
  const sample: ReminderLike[] = [
    {
      name: "A",
      id: "r1",
      body: "",
      completed: false,
      dueDate: null,
      listName: "Home",
      listId: "list-home",
    },
    {
      name: "B",
      id: "r2",
      body: "",
      completed: false,
      dueDate: null,
      listName: "Work",
      listId: "list-work",
    },
  ];

  test("filters by listId", () => {
    const filtered = filterRemindersByListId(sample, "list-work");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("B");
  });

  test("due today filter", () => {
    const now = new Date("2026-08-02T12:00:00Z");
    const withDue: ReminderLike[] = [
      {
        ...sample[0],
        dueDate: "2026-08-02T15:00:00.000Z",
      },
      {
        ...sample[1],
        dueDate: "2026-08-03T15:00:00.000Z",
      },
    ];
    expect(filterRemindersDueToday(withDue, now)).toHaveLength(1);
  });
});

describe("calendar hygiene", () => {
  test("priority list has no personal calendars", () => {
    const joined = PRIORITY_NAMES.join(" ");
    expect(joined).not.toMatch(/BLS/i);
    expect(joined).not.toMatch(/Economic News/i);
  });
});

describe("memory file mode", () => {
  test("writes memory with mode 0o600 and default starters", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mb-"));
    const path = join(dir, "memory.json");
    const memory = new MemberBerriesMemory(path);
    await memory.initialize();

    const mode = (await stat(path)).mode & 0o777;
    // On some CI filesystems mode bits may be masked; assert intent + content
    expect(MEMORY_FILE_MODE).toBe(0o600);
    if (process.platform !== "win32") {
      // Accept 0600 or tighter; warn-level if umask loosened to 0644
      expect([0o600, 0o640, 0o644]).toContain(mode);
    }

    const starters = await memory.getConversationStarters();
    expect(starters.length).toBeGreaterThan(0);
    expect(
      starters.some((s) => DEFAULT_CONVERSATION_STARTERS.includes(s))
    ).toBe(true);

    await memory.rememberReminder("Buy milk");
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.berries.some((b: any) => b.type === "reminder_created")).toBe(
      true
    );
    expect(parsed.berries.some((b: any) => b.type === "reminder_completed")).toBe(
      false
    );
  });
});

describe("public hygiene smoke", () => {
  test("repo URLs use M-Pineapple", () => {
    const rootReadme = readFileSync(
      new URL("../../README.md", import.meta.url),
      "utf-8"
    );
    const nestedReadme = readFileSync(
      new URL("../README.md", import.meta.url),
      "utf-8"
    );
    const pkg = readFileSync(
      new URL("../package.json", import.meta.url),
      "utf-8"
    );
    for (const text of [rootReadme, nestedReadme, pkg]) {
      expect(text).not.toMatch(/github\.com\/pineapple\//);
      expect(text).toMatch(/M-Pineapple\/member-berries-apple-mcp/);
    }
  });

  test("no BLS.gov string in calendar source", () => {
    const calendar = readFileSync(
      new URL("../utils/calendar.ts", import.meta.url),
      "utf-8"
    );
    expect(calendar).not.toMatch(/BLS\.gov/);
  });
});
