import { For, Match, Switch, createSignal } from "solid-js"
import { Divider, palette, type DashboardTab, type RootPage } from "../native"
import { DashboardRoute } from "./dashboard.route"
import { IndexRoute } from "./index"
import { LoginRoute } from "./login"
import { ExpensiveRoute, PathlessRoute, ProfileRoute } from "./simple"

const rootNav: Array<readonly [RootPage, string]> = [
  ["home", "Home"],
  ["dashboard", "Dashboard"],
  ["expensive", "Expensive"],
  ["route-a", "Pathless Layout A"],
  ["route-b", "Pathless Layout B"],
  ["profile", "Profile"],
  ["login", "Login"],
]

interface DashboardTarget {
  tab: DashboardTab
  invoiceId?: number
}

export function RootRoute() {
  const [page, setPage] = createSignal<RootPage>("home")
  const [username, setUsername] = createSignal<string | null>(null)
  const [profileRedirect, setProfileRedirect] = createSignal(false)
  const [dashboardTarget, setDashboardTarget] = createSignal<DashboardTarget | null>(null)

  const navigate = (value: RootPage): void => {
    setDashboardTarget(null)
    if (value === "profile" && !username()) {
      setProfileRedirect(true)
      setPage("login")
      return
    }
    setProfileRedirect(false)
    setPage(value)
  }

  const openInvoice = (invoiceId: number): void => {
    setDashboardTarget({ tab: "invoices", invoiceId })
    setProfileRedirect(false)
    setPage("dashboard")
  }

  const login = (nextUsername: string): void => {
    setUsername(nextUsername)
    if (profileRedirect()) {
      setProfileRedirect(false)
      setPage("profile")
    }
  }

  return (
    <div testId="tanstack-kitchen-sink" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: palette.app, color: palette.text, fontFamily: "system-ui" }}>
      <div style={{ minHeight: 56, display: "flex", flexDirection: "row", alignItems: "center", paddingLeft: 8, paddingRight: 8 }}>
        <text style={{ color: palette.text, fontSize: 30, fontWeight: 500 }}>Kitchen Sink</text>
      </div>
      <Divider />
      <div style={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "row" }}>
        <div style={{ width: 224, flexShrink: 0, overflowY: "scroll" }}>
          <For each={rootNav}>
            {([value, label]) => (
              <>
                <div testId={`root-nav-${value}`} onClick={() => navigate(value)} style={{ minHeight: 40, paddingLeft: 12, paddingRight: 12, justifyContent: "center", backgroundColor: palette.app, cursor: "pointer", hover: { backgroundColor: palette.panelHover } }}>
                  <text style={{ color: palette.blue, fontSize: 12, fontWeight: page() === value ? 800 : 500 }}>{label}</text>
                </div>
                <Divider />
              </>
            )}
          </For>
        </div>
        <div style={{ width: 1, backgroundColor: palette.border, flexShrink: 0 }} />
        <div style={{ flexGrow: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "row" }}>
          <Switch>
            <Match when={page() === "home"}><IndexRoute onInvoice={() => openInvoice(3)} /></Match>
            <Match when={page() === "dashboard"}>
              <DashboardRoute initialTab={dashboardTarget()?.tab} initialInvoiceId={dashboardTarget()?.invoiceId} />
            </Match>
            <Match when={page() === "expensive"}><ExpensiveRoute /></Match>
            <Match when={page() === "route-a"}><PathlessRoute route="A" /></Match>
            <Match when={page() === "route-b"}><PathlessRoute route="B" /></Match>
            <Match when={page() === "profile"}><ProfileRoute username={username() ?? ""} /></Match>
            <Match when={page() === "login"}>
              <LoginRoute username={username()} onLogin={login} onLogout={() => setUsername(null)} />
            </Match>
          </Switch>
        </div>
      </div>
    </div>
  )
}
