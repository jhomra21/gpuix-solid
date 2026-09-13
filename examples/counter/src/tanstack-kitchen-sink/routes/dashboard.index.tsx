import { initialInvoices, palette } from "../native"

export function DashboardIndexRoute() {
  return (
    <div testId="dashboard-summary" style={{ padding: 16, display: "flex", flexDirection: "row", gap: 3 }}>
      <text style={{ color: palette.text, fontSize: 12 }}>Welcome to the dashboard! You have</text>
      <text testId="invoice-count" style={{ color: palette.text, fontSize: 12, fontWeight: 800 }}>{initialInvoices.length} total invoices.</text>
    </div>
  )
}
