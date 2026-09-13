import { Show } from "solid-js"
import { InvoiceFields, StatusBadge, blueButtonStyle, palette } from "../native"

export interface InvoicesIndexRouteProps {
  title: string
  body: string
  created: boolean
  onTitle(value: string): void
  onBody(value: string): void
  onCreate(): void
}

export function InvoicesIndexRoute(props: InvoicesIndexRouteProps) {
  return (
    <div testId="invoice-create-panel" style={{ gap: 8 }}>
      <text style={{ color: palette.text, fontSize: 13 }}>Create a new Invoice:</text>
      <InvoiceFields title={props.title} body={props.body} titleTestId="create-title" bodyTestId="create-body" onTitle={props.onTitle} onBody={props.onBody} />
      <div testId="create-invoice-submit" onClick={props.onCreate} style={{ ...blueButtonStyle(!props.title.trim()), alignSelf: "flex-start" }}>
        <text style={{ color: palette.white, fontSize: 11, fontWeight: 800 }}>CREATE</text>
      </div>
      <Show when={props.created}><StatusBadge text="Created!" tone="success" /></Show>
    </div>
  )
}
