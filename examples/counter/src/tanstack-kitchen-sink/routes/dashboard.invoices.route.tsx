import { For, Show, createMemo, createSignal } from "solid-js"
import { Divider, initialInvoices, palette, type Invoice } from "../native"
import { InvoiceRoute } from "./dashboard.invoices.$invoiceId"
import { InvoicesIndexRoute } from "./dashboard.invoices.index"

export function InvoicesRoute() {
  const [invoices, setInvoices] = createSignal<Invoice[]>(initialInvoices)
  const [selectedId, setSelectedId] = createSignal<number | null>(null)
  const [newTitle, setNewTitle] = createSignal("")
  const [newBody, setNewBody] = createSignal("")
  const [created, setCreated] = createSignal(false)
  const [editTitle, setEditTitle] = createSignal("")
  const [editBody, setEditBody] = createSignal("")
  const [notesOpen, setNotesOpen] = createSignal(false)
  const [notes, setNotes] = createSignal("")
  const [saved, setSaved] = createSignal(false)

  const selected = createMemo(() => invoices().find((invoice) => invoice.id === selectedId()))

  const chooseInvoice = (invoice: Invoice) => {
    setCreated(false)
    setSaved(false)
    setSelectedId(invoice.id)
    setEditTitle(invoice.title)
    setEditBody(invoice.body)
  }

  const createInvoice = () => {
    const title = newTitle().trim()
    if (!title) return
    const nextId = invoices().reduce((max, invoice) => Math.max(max, invoice.id), 0) + 1
    setInvoices((current) => [...current, { id: nextId, title, body: newBody().trim() || "New invoice body" }])
    setNewTitle("")
    setNewBody("")
    setCreated(true)
  }

  const saveInvoice = () => {
    const id = selectedId()
    if (id === null) return
    setInvoices((current) => current.map((invoice) => invoice.id === id ? { ...invoice, title: editTitle(), body: editBody() } : invoice))
    setSaved(true)
  }

  return (
    <div testId="invoice-workspace" style={{ flexGrow: 1, minHeight: 0, display: "flex" }}>
      <div style={{ width: 192, flexShrink: 0, overflowY: "scroll" }}>
        <For each={invoices()}>
          {(invoice) => (
            <>
              <div testId={`invoice-row-${invoice.id}`} onClick={() => chooseInvoice(invoice)} style={{ minHeight: 38, paddingLeft: 12, paddingRight: 8, justifyContent: "center", backgroundColor: selectedId() === invoice.id ? palette.panelSoft : palette.app, cursor: "pointer", hover: { backgroundColor: palette.panelHover } }}>
                <text style={{ color: palette.blue, fontSize: 11, fontWeight: selectedId() === invoice.id ? 800 : 500 }}>#{invoice.id} - {invoice.title.slice(0, 10)}</text>
              </div>
              <Divider />
            </>
          )}
        </For>
      </div>
      <div style={{ width: 1, backgroundColor: palette.border, flexShrink: 0 }} />
      <div style={{ flexGrow: 1, minWidth: 0, padding: 8, overflowY: "scroll" }}>
        <Show when={selected()} fallback={
          <InvoicesIndexRoute title={newTitle()} body={newBody()} created={created()} onTitle={setNewTitle} onBody={setNewBody} onCreate={createInvoice} />
        }>
          {(invoice) => (
            <InvoiceRoute
              invoice={invoice()}
              title={editTitle()}
              body={editBody()}
              notesOpen={notesOpen()}
              notes={notes()}
              saved={saved()}
              onTitle={(value) => { setEditTitle(value); setSaved(false) }}
              onBody={(value) => { setEditBody(value); setSaved(false) }}
              onToggleNotes={() => setNotesOpen((open) => !open)}
              onNotes={setNotes}
              onSave={saveInvoice}
            />
          )}
        </Show>
      </div>
    </div>
  )
}
