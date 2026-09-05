import { For, Show, createMemo, createSignal, type Element as SolidElement } from "solid-js"
import type { EventPayload } from "gpuix-solid"
import { Button, Card, initialNotes, inputStyle, palette, type Note, type NoteFilter } from "../native"

const filters: NoteFilter[] = ["all", "active", "archived"]

export function NotesRoute(): SolidElement {
  const [notes, setNotes] = createSignal<Note[]>(initialNotes)
  const [filter, setFilter] = createSignal<NoteFilter>("all")
  const [editorOpen, setEditorOpen] = createSignal(false)
  const [editingId, setEditingId] = createSignal<number | null>(null)
  const [title, setTitle] = createSignal("")
  const [content, setContent] = createSignal("")
  const [deleteId, setDeleteId] = createSignal<number | null>(null)

  const filteredNotes = createMemo(() => {
    if (filter() === "active") return notes().filter((note) => note.status === "active")
    if (filter() === "archived") return notes().filter((note) => note.status === "archived")
    return notes()
  })

  const newNote = (): void => {
    setEditingId(null)
    setTitle("")
    setContent("")
    setEditorOpen(true)
  }

  const editNote = (note: Note): void => {
    setEditingId(note.id)
    setTitle(note.title)
    setContent(note.content)
    setEditorOpen(true)
  }

  const saveNote = (): void => {
    const nextTitle = title().trim()
    if (!nextTitle) return
    if (editingId() !== null) {
      const id = editingId()!
      setNotes((current) => current.map((note) => note.id === id ? { ...note, title: nextTitle, content: content() } : note))
    } else {
      const id = notes().reduce((max, note) => Math.max(max, note.id), 0) + 1
      setNotes((current) => [...current, { id, title: nextTitle, content: content(), status: "active" }])
    }
    setEditorOpen(false)
  }

  const toggleArchive = (id: number): void => {
    setNotes((current) => current.map((note) => note.id === id ? { ...note, status: note.status === "active" ? "archived" : "active" } : note))
  }

  const deleteNote = (id: number): void => {
    setNotes((current) => current.filter((note) => note.id !== id))
    setDeleteId(null)
  }

  return (
    <div testId="page-notes" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <text style={{ color: palette.text, fontSize: 24, fontWeight: 600 }}>My Notes</text>
          <text style={{ color: palette.secondary, fontSize: 12 }}>Create, edit and manage your notes</text>
        </div>
        <Button testId="note-new" active onClick={newNote}><text style={{ color: palette.white, fontSize: 12 }}>+ New Note</text></Button>
      </div>

      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <For each={filters}>{(value) => <Button testId={`notes-filter-${value}`} active={filter() === value} onClick={() => setFilter(value)}><text style={{ color: filter() === value ? palette.white : palette.text, fontSize: 12 }}>{value === "all" ? "All" : value === "active" ? "Active" : "Archived"}</text></Button>}</For>
      </div>

      <Show when={editorOpen()}>
        <Card style={{ backgroundColor: palette.muted }}>
          <text testId="note-editor" style={{ color: palette.text, fontSize: 15, fontWeight: 600 }}>{editingId() === null ? "New Note" : "Edit Note"}</text>
          <input testId="note-title" value={title()} placeholder="Note title" onChange={(event: EventPayload) => setTitle(event.value ?? "")} style={inputStyle({ width: "100%" })} />
          <textarea testId="note-body" value={content()} placeholder="Write your note..." minRows={5} maxRows={5} onChange={(event: EventPayload) => setContent(event.value ?? "")} style={inputStyle({ width: "100%", minHeight: 120, paddingTop: 8, paddingBottom: 8 })} />
          <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
            <Button testId="note-save" active={Boolean(title().trim())} onClick={saveNote}><text style={{ color: title().trim() ? palette.white : palette.text, fontSize: 12 }}>Save</text></Button>
            <Button onClick={() => setEditorOpen(false)}><text style={{ color: palette.text, fontSize: 12 }}>Cancel</text></Button>
          </div>
        </Card>
      </Show>

      <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <For each={filteredNotes()} fallback={<text style={{ color: palette.secondary, fontSize: 12 }}>No notes found</text>}>
          {(note) => (
            <Card style={{ width: 280, opacity: note.status === "archived" ? 0.7 : 1 }}>
              <text style={{ color: palette.text, fontSize: 15, fontWeight: 600 }}>{note.title}</text>
              <text style={{ color: palette.secondary, fontSize: 12, lineHeight: 18 }}>{note.content}</text>
              <div style={{ display: "flex", flexDirection: "row", gap: 6 }}>
                <Button testId={`note-edit-${note.id}`} onClick={() => editNote(note)}><text style={{ color: palette.text, fontSize: 11 }}>Edit</text></Button>
                <Button testId={`note-archive-${note.id}`} onClick={() => toggleArchive(note.id)}><text style={{ color: palette.text, fontSize: 11 }}>{note.status === "active" ? "Archive" : "Unarchive"}</text></Button>
                <Show when={deleteId() === note.id} fallback={<Button testId={`note-delete-${note.id}`} onClick={() => setDeleteId(note.id)}><text style={{ color: palette.destructive, fontSize: 11 }}>Delete</text></Button>}>
                  <Button testId={`note-confirm-${note.id}`} onClick={() => deleteNote(note.id)}><text style={{ color: palette.destructive, fontSize: 11 }}>Delete</text></Button>
                  <Button onClick={() => setDeleteId(null)}><text style={{ color: palette.text, fontSize: 11 }}>Cancel</text></Button>
                </Show>
              </div>
            </Card>
          )}
        </For>
      </div>
    </div>
  )
}
