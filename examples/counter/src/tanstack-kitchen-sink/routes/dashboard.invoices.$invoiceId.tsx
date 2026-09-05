import { Show } from "solid-js"
import type { EventPayload } from "gpuix-solid"
import { InvoiceFields, StatusBadge, blueButtonStyle, nativeInputStyle, palette, type Invoice } from "../native"

export interface InvoiceRouteProps {
  invoice: Invoice
  title: string
  body: string
  notesOpen: boolean
  notes: string
  saved: boolean
  onTitle(value: string): void
  onBody(value: string): void
  onToggleNotes(): void
  onNotes(value: string): void
  onSave(): void
}

export function InvoiceRoute(props: InvoiceRouteProps) {
  return (
    <div testId="invoice-detail-panel" style={{ gap: 8 }}>
      <InvoiceFields title={props.title} body={props.body} titleTestId="edit-title" bodyTestId="edit-body" onTitle={props.onTitle} onBody={props.onBody} />
      <div testId="toggle-invoice-notes" onClick={props.onToggleNotes} style={{ alignSelf: "flex-start", cursor: "pointer" }}>
        <text style={{ color: palette.blue, fontSize: 12 }}>{props.notesOpen ? "Close Notes" : "Show Notes"}</text>
      </div>
      <Show when={props.notesOpen}>
        <textarea testId="invoice-notes" value={props.notes} placeholder="Write some notes here..." minRows={5} maxRows={5} onChange={(event: EventPayload) => props.onNotes(event.value ?? "")} style={nativeInputStyle({ width: "100%", minHeight: 120, paddingTop: 8, paddingBottom: 8 })} />
        <text style={{ color: palette.muted, fontSize: 10 }}>Notes are stored in the URL. Try copying the URL into a new tab!</text>
      </Show>
      <div testId="save-invoice" onClick={props.onSave} style={{ ...blueButtonStyle(false), alignSelf: "flex-start" }}>
        <text style={{ color: palette.white, fontSize: 11, fontWeight: 800 }}>SAVE</text>
      </div>
      <Show when={props.saved}><StatusBadge text="Saved!" tone="success" /></Show>
      <text testId="invoice-id" style={{ color: palette.faint, fontSize: 10 }}>Invoice #{props.invoice.id}</text>
    </div>
  )
}
