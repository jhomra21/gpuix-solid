import { For, Match, Show, Switch, createSignal } from "solid-js"
import { Divider, palette, type DashboardTab } from "../native"
import { DashboardIndexRoute } from "./dashboard.index"
import { InvoicesRoute } from "./dashboard.invoices.route"
import { UsersRoute } from "./dashboard.users.route"

const dashboardTabs: Array<readonly [DashboardTab, string]> = [
  ["summary", "Summary"],
  ["invoices", "Invoices"],
  ["users", "Users"],
]

export function DashboardRoute() {
  const [tab, setTab] = createSignal<DashboardTab>("summary")

  return (
    <div testId="page-dashboard" style={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ minHeight: 40, paddingLeft: 8, paddingRight: 8, justifyContent: "center" }}>
        <text style={{ color: palette.text, fontSize: 20 }}>Dashboard</text>
      </div>
      <Divider />
      <div style={{ minHeight: 40, display: "flex", alignItems: "stretch" }}>
        <For each={dashboardTabs}>
          {([value, label], index) => (
            <>
              <div testId={`dashboard-tab-${value}`} onClick={() => setTab(value)} style={{ paddingLeft: 8, paddingRight: 8, alignItems: "center", justifyContent: "center", backgroundColor: palette.app, cursor: "pointer" }}>
                <text style={{ color: palette.text, fontSize: 12, fontWeight: tab() === value ? 800 : 400 }}>{label}</text>
              </div>
              <Show when={index() < dashboardTabs.length - 1}><div style={{ width: 1, backgroundColor: palette.borderSoft }} /></Show>
            </>
          )}
        </For>
      </div>
      <Divider />
      <div style={{ flexGrow: 1, minHeight: 0, display: "flex" }}>
        <Switch>
          <Match when={tab() === "summary"}><DashboardIndexRoute /></Match>
          <Match when={tab() === "invoices"}><InvoicesRoute /></Match>
          <Match when={tab() === "users"}><UsersRoute /></Match>
        </Switch>
      </div>
    </div>
  )
}
