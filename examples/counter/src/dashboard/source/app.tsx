import { Match, Switch, createSignal, type Element as SolidElement } from "solid-js"
import { AccountRoute } from "./routes/account"
import { HomeRoute } from "./routes/home"
import { NotesRoute } from "./routes/notes"
import { TasksRoute } from "./routes/tasks"
import { WeatherRoute } from "./routes/weather"
import { Button, Divider, palette, type DashboardRoute } from "./native"

const navRoutes: Array<{ route: DashboardRoute; name: string; icon: string }> = [
  { route: "home", name: "Home", icon: "⌂" },
  { route: "account", name: "Account", icon: "●" },
  { route: "notes", name: "Notes", icon: "▤" },
  { route: "tasks", name: "Tasks", icon: "✓" },
  { route: "weather", name: "Weather", icon: "☁" },
]

function pageName(route: DashboardRoute): string {
  return navRoutes.find((item) => item.route === route)?.name ?? "Home"
}

export function DashboardDemo(): SolidElement {
  const [route, setRoute] = createSignal<DashboardRoute>("home")
  const [sidebarOpen, setSidebarOpen] = createSignal(true)
  const [loggedOut, setLoggedOut] = createSignal(false)

  const navigate = (next: DashboardRoute): void => {
    setRoute(next)
    setLoggedOut(false)
  }

  return (
    <div testId="dashboard-shell" style={{ display: "flex", flexDirection: "row", width: "100%", height: "100%", backgroundColor: palette.muted, color: palette.text }}>
      <div style={{ width: sidebarOpen() ? 220 : 60, flexShrink: 0, height: "100%", backgroundColor: palette.sidebar, borderRightWidth: 1, borderColor: palette.border, padding: 10, gap: 12 }}>
        <text style={{ color: palette.secondary, fontSize: 11, fontWeight: 600 }}>{sidebarOpen() ? "Navigation" : ""}</text>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {navRoutes.map((item) => (
            <div testId={`nav-${item.route}`} onClick={() => navigate(item.route)} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 9, minHeight: 36, paddingLeft: 10, paddingRight: 10, borderRadius: 6, cursor: "pointer", backgroundColor: route() === item.route ? palette.background : "#00000000", hover: { backgroundColor: palette.background } }}>
              <text style={{ width: 18, color: palette.text, fontSize: 13 }}>{item.icon}</text>
              <text style={{ color: palette.text, fontSize: 12, opacity: sidebarOpen() ? 1 : 0 }}>{item.name}</text>
            </div>
          ))}
        </div>
        <div style={{ flexGrow: 1 }} />
        <Divider />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: 6 }}>
          <text style={{ color: palette.text, fontSize: 12, fontWeight: 600 }}>{sidebarOpen() ? "User" : "U"}</text>
          <text style={{ color: palette.secondary, fontSize: 10 }}>{sidebarOpen() ? "user@example.com" : ""}</text>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0, height: "100%", backgroundColor: palette.background, borderRadius: 12 }}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10, height: 64, flexShrink: 0, paddingLeft: 16, paddingRight: 16, borderBottomWidth: 1, borderColor: palette.border }}>
          <Button testId="sidebar-toggle" onClick={() => setSidebarOpen((open) => !open)}><text style={{ color: palette.text, fontSize: 12 }}>☰</text></Button>
          <Divider />
          <text style={{ color: palette.secondary, fontSize: 12 }}>Dashboard</text>
          <text style={{ color: palette.secondary, fontSize: 12 }}>/</text>
          <text testId="page-title" style={{ color: palette.text, fontSize: 12, fontWeight: 600 }}>{pageName(route())}</text>
        </div>

        <div testId="dashboard-content" style={{ flexGrow: 1, minHeight: 0, overflowY: "scroll", padding: 20 }}>
          <Switch>
            <Match when={loggedOut()}>
              <div testId="logged-out" style={{ padding: 24, gap: 8 }}>
                <text style={{ color: palette.text, fontSize: 20, fontWeight: 600 }}>You have been logged out.</text>
                <Button active onClick={() => setLoggedOut(false)}><text style={{ color: palette.white, fontSize: 12 }}>Return to dashboard</text></Button>
              </div>
            </Match>
            <Match when={route() === "home"}><HomeRoute onNavigate={navigate} onLogout={() => setLoggedOut(true)} /></Match>
            <Match when={route() === "account"}><AccountRoute /></Match>
            <Match when={route() === "notes"}><NotesRoute /></Match>
            <Match when={route() === "tasks"}><TasksRoute /></Match>
            <Match when={route() === "weather"}><WeatherRoute /></Match>
          </Switch>
        </div>
      </div>
    </div>
  )
}
