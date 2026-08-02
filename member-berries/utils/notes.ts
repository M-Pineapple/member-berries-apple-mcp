import { run } from "@jxa/run";
import { AppleAccessError } from "./errors";
import {
  filterNotesByFolder,
  formatNoteLine,
  toNoteSummary,
  type NoteRecord,
  type NoteSummary,
} from "./notesFormat";

export type { NoteRecord, NoteSummary };
export { formatNoteLine, toNoteSummary, makeSnippet, filterNotesByFolder } from "./notesFormat";

type CreateNoteResult = {
  success: boolean;
  note?: NoteRecord;
  message?: string;
  folderName?: string;
  usedDefaultFolder?: boolean;
};

async function getAllNotes(folderName?: string): Promise<NoteRecord[]> {
  try {
    const notes: NoteRecord[] = await run(() => {
      const Notes = Application("Notes");
      const notes = Notes.notes();

      // biome-ignore lint/suspicious/noExplicitAny: JXA bridge
      return notes.map((note: any) => {
        let folderName = "";
        try {
          folderName = note.container().name();
        } catch {
          folderName = "";
        }
        let id = "";
        try {
          id = note.id();
        } catch {
          id = `note-${Math.random().toString(36).slice(2)}`;
        }
        return {
          id,
          name: note.name(),
          content: note.plaintext(),
          folderName,
        };
      });
    });

    return filterNotesByFolder(notes, folderName);
  } catch (error) {
    throw new AppleAccessError(
      "Notes",
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function findNote(searchText: string, folderName?: string): Promise<NoteRecord[]> {
  try {
    const notes: NoteRecord[] = await run((searchText: string) => {
      const Notes = Application("Notes");
      const notes = Notes.notes.whose({
        _or: [
          { name: { _contains: searchText } },
          { plaintext: { _contains: searchText } },
        ],
      })();
      // biome-ignore lint/suspicious/noExplicitAny: JXA bridge
      return notes.length > 0
        ? notes.map((note: any) => {
            let folderName = "";
            try {
              folderName = note.container().name();
            } catch {
              folderName = "";
            }
            let id = "";
            try {
              id = note.id();
            } catch {
              id = `note-${Math.random().toString(36).slice(2)}`;
            }
            return {
              id,
              name: note.name(),
              content: note.plaintext(),
              folderName,
            };
          })
        : [];
    }, searchText);

    const scoped = filterNotesByFolder(notes, folderName);
    if (scoped.length > 0) return scoped;

    const allNotes = await getAllNotes(folderName);
    const closestMatch = allNotes.find(({ name }) =>
      name.toLowerCase().includes(searchText.toLowerCase())
    );
    return closestMatch ? [closestMatch] : [];
  } catch (error) {
    if (error instanceof AppleAccessError) throw error;
    throw new AppleAccessError(
      "Notes",
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function getNoteById(noteId: string): Promise<NoteRecord | null> {
  const all = await getAllNotes();
  return all.find((n) => n.id === noteId) ?? null;
}

function summariseNotes(notes: NoteRecord[], includeBody = false): NoteSummary[] {
  return notes.map((n) => toNoteSummary(n, includeBody));
}

async function createNote(
  title: string,
  body: string,
  folderName: string = "Member Berries"
): Promise<CreateNoteResult> {
  try {
    const formattedBody = body
      .replace(/^(#+)\s+(.+)$/gm, "$1 $2\n")
      .replace(/^-\s+(.+)$/gm, "\n- $1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const result = await run(
      (title: string, body: string, folderName: string) => {
        const Notes = Application("Notes");

        let targetFolder;
        let usedDefaultFolder = false;
        let actualFolderName = folderName;

        try {
          const folders = Notes.folders();
          for (let i = 0; i < folders.length; i++) {
            if (folders[i].name() === folderName) {
              targetFolder = folders[i];
              break;
            }
          }

          if (!targetFolder) {
            if (folderName === "Member Berries") {
              Notes.make({ new: "folder", withProperties: { name: "Member Berries" } });
              usedDefaultFolder = true;
              const updatedFolders = Notes.folders();
              for (let i = 0; i < updatedFolders.length; i++) {
                if (updatedFolders[i].name() === "Member Berries") {
                  targetFolder = updatedFolders[i];
                  break;
                }
              }
            } else {
              throw new Error(`Folder "${folderName}" not found`);
            }
          }

          let newNote;
          if (targetFolder) {
            newNote = Notes.make({
              new: "note",
              withProperties: { name: title, body: body },
              at: targetFolder,
            });
            actualFolderName = folderName;
          } else {
            newNote = Notes.make({
              new: "note",
              withProperties: { name: title, body: body },
            });
            actualFolderName = "Default";
          }

          let id = "";
          try {
            id = newNote.id();
          } catch {
            id = `note-${Date.now()}`;
          }

          return {
            success: true,
            note: {
              id,
              name: title,
              content: body,
              folderName: actualFolderName,
            },
            folderName: actualFolderName,
            usedDefaultFolder: usedDefaultFolder,
          };
        } catch (scriptError: any) {
          throw new Error(
            `AppleScript error: ${scriptError.message || String(scriptError)}`
          );
        }
      },
      title,
      formattedBody,
      folderName
    );

    return result;
  } catch (error) {
    return {
      success: false,
      message: `Failed to create note: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export default {
  getAllNotes,
  findNote,
  getNoteById,
  summariseNotes,
  createNote,
};
