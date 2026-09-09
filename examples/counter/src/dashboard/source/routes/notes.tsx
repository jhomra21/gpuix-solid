import { For, Match, Show, Switch, createMemo, createSignal, type Element as SolidElement } from "solid-js"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type EventPayload,
} from "gpuix-solid"
import { Button, Card, DialogSurface, initialNotes, inputStyle, palette, type Note, type NoteFilter } from "../native"

const filters: NoteFilter[] = ["all", "active", "archived"]
const fixtureMutationTime = "2025-06-03T12:00:00.000Z"

type NoteIconName = "plus" | "file" | "archive" | "archive-restore" | "calendar" | "file-clock" | "gear" | "x"

function NoteIcon(props: { name: NoteIconName; size?: number; color?: string }): SolidElement {
  const size = props.size ?? 16
  const color = props.color ?? palette.secondary
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      style={{ width: size, height: size, flexShrink: 0, pointerEvents: "none" }}
    >
      <Switch>
        <Match when={props.name === "plus"}>
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </Match>
        <Match when={props.name === "file"}>
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </Match>
        <Match when={props.name === "archive"}>
          <rect width="20" height="5" x="2" y="3" rx="1" />
          <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
          <path d="M10 12h4" />
        </Match>
        <Match when={props.name === "archive-restore"}>
          <rect width="20" height="5" x="2" y="3" rx="1" />
          <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
          <path d="M9 13h6" />
          <path d="M12 10v6" />
        </Match>
        <Match when={props.name === "calendar"}>
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </Match>
        <Match when={props.name === "file-clock"}>
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h6.5" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <circle cx="16" cy="16" r="6" />
          <path d="M16 13.5V16l1.5 1.5" />
        </Match>
        <Match when={props.name === "gear"}>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </Match>
        <Match when={props.name === "x"}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </Match>
      </Switch>
    </svg>
  )
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function NoteAction(props: { testId: string; label: string; icon: NoteIconName; destructive?: boolean; onClick(): void }): SolidElement {
  return (
    <div
      testId={props.testId}
      aria-label={props.label}
      onClick={props.onClick}
      style={{
        flexGrow: 1,
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        hover: { backgroundColor: palette.muted },
      }}
    >
      <NoteIcon name={props.icon} color={props.destructive ? palette.destructive : palette.secondary} />
    </div>
  )
}

function NoteCard(props: { note: Note; onEdit(note: Note): void; onArchive(note: Note): void; onDelete(note: Note): void }): SolidElement {
  return (
    <Card style={{ width: 280, minHeight: 220, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ flexGrow: 1, paddingTop: 20, paddingBottom: 12, paddingLeft: 20, paddingRight: 20, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
          <text style={{ color: palette.text, fontSize: 17, fontWeight: 500, flexGrow: 1 }}>{props.note.title}</text>
          <Show when={props.note.status === "archived"}>
            <div testId={`note-archived-badge-${props.note.id}`} style={{ paddingTop: 4, paddingBottom: 4, paddingLeft: 8, paddingRight: 8, borderRadius: 999, backgroundColor: palette.muted }}>
              <text style={{ color: palette.secondary, fontSize: 10, fontWeight: 500 }}>Archived</text>
            </div>
          </Show>
        </div>
        <text style={{ color: palette.secondary, fontSize: 12, lineHeight: 18, flexGrow: 1 }}>{props.note.content || "No content"}</text>
        <div style={{ marginTop: 16, paddingTop: 8, borderTopWidth: 1, borderColor: palette.border, display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div testId={`note-created-${props.note.id}`} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4 }}>
            <NoteIcon name="calendar" size={14} />
            <text style={{ color: palette.secondary, fontSize: 10 }}>{formatDate(props.note.createdAt)}</text>
          </div>
          <div testId={`note-updated-${props.note.id}`} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4 }}>
            <NoteIcon name="file-clock" size={14} />
            <text style={{ color: palette.secondary, fontSize: 10 }}>{formatDate(props.note.updatedAt)}</text>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch", borderTopWidth: 1, borderColor: palette.border }}>
        <NoteAction testId={`note-edit-${props.note.id}`} label="Edit Note" icon="gear" onClick={() => props.onEdit(props.note)} />
        <div style={{ width: 1, backgroundColor: palette.border }} />
        <NoteAction testId={`note-archive-${props.note.id}`} label={props.note.status === "active" ? "Archive Note" : "Unarchive Note"} icon={props.note.status === "active" ? "archive" : "archive-restore"} onClick={() => props.onArchive(props.note)} />
        <div style={{ width: 1, backgroundColor: palette.border }} />
        <NoteAction testId={`note-delete-${props.note.id}`} label="Delete Note" icon="x" destructive onClick={() => props.onDelete(props.note)} />
      </div>
    </Card>
  )
}

export function NotesRoute(): SolidElement {
  const [notes, setNotes] = createSignal<Note[]>(initialNotes)
  const [filter, setFilter] = createSignal<NoteFilter>("all")
  const [editorOpen, setEditorOpen] = createSignal(false)
  const [editingId, setEditingId] = createSignal<number | null>(null)
  const [title, setTitle] = createSignal("")
  const [content, setContent] = createSignal("")
  const [status, setStatus] = createSignal<Note["status"]>("active")
  const [noteToDelete, setNoteToDelete] = createSignal<Note | null>(null)

  const filteredNotes = createMemo(() => {
    if (filter() === "active") return notes().filter((note) => note.status === "active")
    if (filter() === "archived") return notes().filter((note) => note.status === "archived")
    return notes()
  })

  const newNote = (): void => {
    setEditingId(null)
    setTitle("")
    setContent("")
    setStatus("active")
    setEditorOpen(true)
  }

  const editNote = (note: Note): void => {
    setEditingId(note.id)
    setTitle(note.title)
    setContent(note.content)
    setStatus(note.status)
    setEditorOpen(true)
  }

  const closeEditor = (): void => {
    setEditorOpen(false)
    setEditingId(null)
  }

  const saveNote = (): void => {
    const nextTitle = title().trim()
    if (!nextTitle) return
    if (editingId() !== null) {
      const id = editingId()!
      setNotes((current) => current.map((note) => note.id === id ? {
        ...note,
        title: nextTitle,
        content: content(),
        status: status(),
        updatedAt: fixtureMutationTime,
      } : note))
    } else {
      const id = notes().reduce((max, note) => Math.max(max, note.id), 0) + 1
      setNotes((current) => [...current, {
        id,
        title: nextTitle,
        content: content(),
        status: "active",
        createdAt: fixtureMutationTime,
        updatedAt: fixtureMutationTime,
      }])
    }
    closeEditor()
  }

  const toggleArchive = (noteToArchive: Note): void => {
    setNotes((current) => current.map((note) => note.id === noteToArchive.id ? {
      ...note,
      status: note.status === "active" ? "archived" : "active",
      updatedAt: fixtureMutationTime,
    } : note))
  }

  const confirmDelete = (): void => {
    const note = noteToDelete()
    if (!note) return
    setNotes((current) => current.filter((candidate) => candidate.id !== note.id))
    setNoteToDelete(null)
  }

  return (
    <div testId="page-notes" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <text style={{ color: palette.text, fontSize: 24, fontWeight: 600 }}>My Notes</text>
          <text style={{ color: palette.secondary, fontSize: 12 }}>Create, edit and manage your notes</text>
        </div>
        <Button testId="note-new" active onClick={newNote}>
          <NoteIcon name="plus" color={palette.white} />
          <text style={{ color: palette.white, fontSize: 12 }}>New Note</text>
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 16 }}>
        <For each={filters}>
          {(value) => (
            <Button testId={`notes-filter-${value}`} active={filter() === value} onClick={() => setFilter(value)}>
              <Show when={value === "active"}><NoteIcon name="file" color={filter() === value ? palette.white : palette.text} /></Show>
              <Show when={value === "archived"}><NoteIcon name="archive" color={filter() === value ? palette.white : palette.text} /></Show>
              <text style={{ color: filter() === value ? palette.white : palette.text, fontSize: 12 }}>
                {value === "all" ? "All" : value === "active" ? "Active" : "Archived"}
              </text>
            </Button>
          )}
        </For>
      </div>

      <Show when={filteredNotes().length > 0} fallback={
        <div testId="notes-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 48, paddingBottom: 48 }}>
          <NoteIcon name="file" size={48} color={palette.secondary} />
          <text style={{ color: palette.text, fontSize: 17, fontWeight: 500, marginTop: 8 }}>No notes found</text>
          <text style={{ color: palette.secondary, fontSize: 12 }}>Get started by creating a new note</text>
          <div style={{ marginTop: 16 }}>
            <Button testId="note-empty-new" active onClick={newNote}>
              <NoteIcon name="plus" color={palette.white} />
              <text style={{ color: palette.white, fontSize: 12 }}>New Note</text>
            </Button>
          </div>
        </div>
      }>
        <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          <For each={filteredNotes()}>
            {(note) => <NoteCard note={note} onEdit={editNote} onArchive={toggleArchive} onDelete={setNoteToDelete} />}
          </For>
        </div>
      </Show>

      <Show when={editorOpen()}>
        <DialogSurface testId="note-editor-dialog" width={448}>
          <text testId="note-editor-title" style={{ color: palette.text, fontSize: 16, fontWeight: 600 }}>
            {editingId() === null ? "Create New Note" : "Edit Note"}
          </text>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <text style={{ color: palette.text, fontSize: 12, fontWeight: 500 }}>Title</text>
            <input testId="note-title" value={title()} placeholder="Note title" onChange={(event: EventPayload) => setTitle(event.value ?? "")} style={inputStyle({ width: "100%" })} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <text style={{ color: palette.text, fontSize: 12, fontWeight: 500 }}>Content</text>
            <textarea testId="note-body" value={content()} placeholder="Write your note content here..." minRows={6} maxRows={6} onChange={(event: EventPayload) => setContent(event.value ?? "")} style={inputStyle({ width: "100%", minHeight: 144, paddingTop: 8, paddingBottom: 8 })} />
          </div>
          <Show when={editingId() !== null}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <text style={{ color: palette.text, fontSize: 12, fontWeight: 500 }}>Status:</text>
              <Select value={status()} onValueChange={(value) => setStatus(value as Note["status"])}>
                <SelectTrigger testId="note-status" style={inputStyle({ width: 160, minHeight: 36, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" })}>
                  <SelectValue placeholder="Status">
                    <text testId="note-status-value" style={{ color: palette.text, fontSize: 12 }}>{status() === "active" ? "Active" : "Archived"}</text>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent style={{ width: 160, padding: 4, borderWidth: 1, borderColor: palette.border, borderRadius: 6, backgroundColor: palette.background }}>
                  <SelectItem value="active" testId="note-status-active"><text style={{ color: palette.text, fontSize: 12 }}>Active</text></SelectItem>
                  <SelectItem value="archived" testId="note-status-archived"><text style={{ color: palette.text, fontSize: 12 }}>Archived</text></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Show>
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-end", gap: 8, paddingTop: 8 }}>
            <Button testId="note-cancel" onClick={closeEditor}><text style={{ color: palette.text, fontSize: 12 }}>Cancel</text></Button>
            <Button testId="note-save" active onClick={saveNote}><text style={{ color: palette.white, fontSize: 12 }}>{editingId() === null ? "Create" : "Save"}</text></Button>
          </div>
        </DialogSurface>
      </Show>

      <Show when={noteToDelete()} keyed>
        {(note) => (
          <DialogSurface testId="note-delete-dialog">
            <text style={{ color: palette.text, fontSize: 16, fontWeight: 600 }}>Delete Note?</text>
            <text testId="note-delete-message" style={{ color: palette.secondary, fontSize: 12, lineHeight: 18 }}>
              Are you sure you want to delete the note &quot;{note.title}&quot;? This action cannot be undone.
            </text>
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-end", gap: 8, paddingTop: 8 }}>
              <Button testId="note-delete-cancel" onClick={() => setNoteToDelete(null)}><text style={{ color: palette.text, fontSize: 12 }}>Cancel</text></Button>
              <Button testId="note-delete-confirm" onClick={confirmDelete}><text style={{ color: palette.destructive, fontSize: 12 }}>Delete</text></Button>
            </div>
          </DialogSurface>
        )}
      </Show>
    </div>
  )
}
