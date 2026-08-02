/** Pure helpers for note privacy defaults (unit-tested without Notes.app) */

export type NoteRecord = {
  id: string;
  name: string;
  content: string;
  folderName?: string;
};

export type NoteSummary = {
  id: string;
  name: string;
  snippet: string;
  folderName?: string;
  content?: string;
};

const SNIPPET_LEN = 160;

export function makeSnippet(content: string, max = SNIPPET_LEN): string {
  const flat = content.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1)}…`;
}

export function toNoteSummary(note: NoteRecord, includeBody = false): NoteSummary {
  const summary: NoteSummary = {
    id: note.id,
    name: note.name,
    snippet: makeSnippet(note.content || ""),
  };
  if (note.folderName) summary.folderName = note.folderName;
  if (includeBody) summary.content = note.content;
  return summary;
}

export function formatNoteLine(summary: NoteSummary): string {
  const folder = summary.folderName ? ` [${summary.folderName}]` : "";
  const body = summary.content !== undefined
    ? `\n${summary.content}`
    : summary.snippet
      ? `\n${summary.snippet}`
      : "";
  return `${summary.name}${folder} (id: ${summary.id})${body}`;
}

export function filterNotesByFolder(notes: NoteRecord[], folderName?: string): NoteRecord[] {
  if (!folderName) return notes;
  const needle = folderName.toLowerCase();
  return notes.filter((n) => (n.folderName || "").toLowerCase() === needle);
}
