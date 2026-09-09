import { For, Match, Show, Switch, createSignal, type Element as SolidElement } from "solid-js"
import { AccountRoute } from "./routes/account"
import { HomeRoute } from "./routes/home"
import { NotesRoute } from "./routes/notes"
import { TasksRoute } from "./routes/tasks"
import { WeatherRoute } from "./routes/weather"
import { Divider, palette, type DashboardRoute } from "./native"

type SourceIconName = "house" | "user" | "file" | "square-check" | "cloud" | "chevronupdown" | "logout"

const navRoutes: Array<{ route: DashboardRoute; name: string; iconName: SourceIconName }> = [
  { route: "home", name: "Home", iconName: "house" },
  { route: "account", name: "Account", iconName: "user" },
  { route: "notes", name: "Notes", iconName: "file" },
  { route: "tasks", name: "Tasks", iconName: "square-check" },
  { route: "weather", name: "Weather", iconName: "cloud" },
]

function SourceIcon(props: { name: SourceIconName; size?: number }): SolidElement {
  const size = props.size ?? 20
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: palette.text,
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  } as const

  return (
    <svg {...common} style={{ width: size, height: size, flexShrink: 0, pointerEvents: "none" }}>
      <Switch>
        <Match when={props.name === "house"}>
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </Match>
        <Match when={props.name === "user"}>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </Match>
        <Match when={props.name === "file"}>
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </Match>
        <Match when={props.name === "square-check"}>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="m9 12 2 2 4-4" />
        </Match>
        <Match when={props.name === "cloud"}>
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        </Match>
        <Match when={props.name === "chevronupdown"}>
          <path d="m7 15 5 5 5-5" />
          <path d="m7 9 5-5 5 5" />
        </Match>
        <Match when={props.name === "logout"}>
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        </Match>
      </Switch>
    </svg>
  )
}

function SidebarTriggerIcon(): SolidElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={palette.text} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style={{ width: 16, height: 16, pointerEvents: "none" }}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
  )
}

function pageName(route: DashboardRoute): string {
  return navRoutes.find((item) => item.route === route)?.name ?? "Home"
}

export function DashboardDemo(): SolidElement {
  const [route, setRoute] = createSignal<DashboardRoute>("home")
  const [sidebarOpen, setSidebarOpen] = createSignal(true)
  const [userMenuOpen, setUserMenuOpen] = createSignal(false)
  const [loggedOut, setLoggedOut] = createSignal(false)

  const navigate = (next: DashboardRoute): void => {
    setRoute(next)
    setLoggedOut(false)
    setUserMenuOpen(false)
  }

  const logout = (): void => {
    setUserMenuOpen(false)
    setLoggedOut(true)
  }

  return (
    <div testId="dashboard-shell" style={{ position: "relative", display: "flex", flexDirection: "row", width: "100%", height: "100%", backgroundColor: palette.muted, color: palette.text }}>
      <div
        testId="dashboard-sidebar"
        style={{
          position: "relative",
          width: sidebarOpen() ? 272 : 66,
          flexShrink: 0,
          height: "100%",
          backgroundColor: palette.sidebar,
          padding: 8,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
          <div style={{ paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8 }}>
            <text style={{ color: palette.secondary, fontSize: 11, fontWeight: 600, opacity: sidebarOpen() ? 1 : 0 }}>Navigation</text>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <For each={navRoutes}>
              {(item) => (
                <div
                  testId={`nav-${item.route}`}
                  onClick={() => navigate(item.route)}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: sidebarOpen() ? "flex-start" : "center",
                    gap: 8,
                    minHeight: 32,
                    paddingLeft: sidebarOpen() ? 8 : 0,
                    paddingRight: sidebarOpen() ? 8 : 0,
                    borderRadius: 6,
                    cursor: "pointer",
                    backgroundColor: route() === item.route ? palette.muted : "#00000000",
                    hover: { backgroundColor: palette.muted },
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", width: 20, height: 20, pointerEvents: "none" }}>
                    <SourceIcon name={item.iconName} />
                  </div>
                  <text style={{ color: palette.text, fontSize: 12, opacity: sidebarOpen() ? 1 : 0, pointerEvents: "none" }}>{item.name}</text>
                </div>
              )}
            </For>
          </div>
          <div style={{ flexGrow: 1 }} />
        </div>

        <div style={{ paddingLeft: 0, paddingRight: 0, paddingTop: 8 }}>
          <div
            testId="nav-user-trigger"
            onClick={() => setUserMenuOpen((open) => !open)}
            style={{
              width: "100%",
              minHeight: 48,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: sidebarOpen() ? "flex-start" : "center",
              gap: 8,
              padding: 4,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#0f172a12",
              backgroundColor: palette.background,
              cursor: "pointer",
              hover: { boxShadow: { offsetX: 0, offsetY: 2, blurRadius: 6, spreadRadius: 0, color: "#0f172a14" } },
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: "#0f172a12", backgroundColor: palette.muted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, pointerEvents: "none" }}>
              <text style={{ color: palette.text, fontSize: 13, fontWeight: 600 }}>U</text>
            </div>
            <Show when={sidebarOpen()}>
              <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0, gap: 2, pointerEvents: "none" }}>
                <text style={{ color: palette.text, fontSize: 12, fontWeight: 600 }}>User</text>
                <text style={{ color: palette.secondary, fontSize: 10 }}>user@example.com</text>
              </div>
              <div style={{ pointerEvents: "none" }}><SourceIcon name="chevronupdown" size={16} /></div>
            </Show>
          </div>
        </div>

        <Show when={userMenuOpen()}>
          <div
            testId="nav-user-menu"
            style={{
              position: "absolute",
              left: sidebarOpen() ? 264 : 58,
              bottom: 8,
              width: 224,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: palette.border,
              backgroundColor: palette.background,
              boxShadow: { offsetX: 0, offsetY: 8, blurRadius: 20, spreadRadius: 0, color: "#0f172a20" },
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, pointerEvents: "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: palette.muted, display: "flex", alignItems: "center", justifyContent: "center" }}><text style={{ color: palette.text, fontSize: 13, fontWeight: 600 }}>U</text></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <text style={{ color: palette.text, fontSize: 12, fontWeight: 600 }}>User</text>
                <text style={{ color: palette.secondary, fontSize: 10 }}>user@example.com</text>
              </div>
            </div>
            <Divider />
            <div testId="nav-user-home" onClick={() => navigate("home")} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, paddingLeft: 8, paddingRight: 8, borderRadius: 6, cursor: "pointer", hover: { backgroundColor: palette.muted } }}>
              <div style={{ pointerEvents: "none" }}><SourceIcon name="house" size={16} /></div><text style={{ color: palette.text, fontSize: 11, pointerEvents: "none" }}>Go to Home Page</text>
            </div>
            <div testId="nav-user-profile" onClick={() => navigate("account")} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, paddingLeft: 8, paddingRight: 8, borderRadius: 6, cursor: "pointer", hover: { backgroundColor: palette.muted } }}>
              <div style={{ pointerEvents: "none" }}><SourceIcon name="user" size={16} /></div><text style={{ color: palette.text, fontSize: 11, pointerEvents: "none" }}>Profile</text>
            </div>
            <Divider />
            <div testId="nav-user-logout" onClick={logout} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, paddingLeft: 8, paddingRight: 8, borderRadius: 6, cursor: "pointer", hover: { backgroundColor: palette.muted } }}>
              <div style={{ pointerEvents: "none" }}><SourceIcon name="logout" size={16} /></div><text style={{ color: palette.text, fontSize: 11, pointerEvents: "none" }}>Log out</text>
            </div>
          </div>
        </Show>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0, height: "100%", margin: 8, marginLeft: 0, backgroundColor: palette.background, borderRadius: 12, boxShadow: { offsetX: 0, offsetY: 4, blurRadius: 10, spreadRadius: 0, color: "#0f172a18" } }}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, height: 64, flexShrink: 0, padding: 8, borderBottomWidth: 1, borderColor: palette.border, borderRadius: 12, backgroundColor: palette.background }}>
          <div testId="sidebar-toggle" onClick={() => setSidebarOpen((open) => !open)} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, cursor: "pointer", hover: { backgroundColor: palette.muted } }}>
            <SidebarTriggerIcon />
          </div>
          <div style={{ width: 1, height: 16, backgroundColor: palette.border, marginRight: 8 }} />
          <Show when={route() === "home"} fallback={
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <text testId="breadcrumb-dashboard" onClick={() => navigate("home")} style={{ color: palette.secondary, fontSize: 12, cursor: "pointer" }}>Dashboard</text>
              <text style={{ color: palette.secondary, fontSize: 12 }}>/</text>
              <text testId="page-title" style={{ color: palette.text, fontSize: 12, fontWeight: 600 }}>{pageName(route())}</text>
            </div>
          }>
            <text testId="page-title" style={{ color: palette.text, fontSize: 12, fontWeight: 600 }}>Dashboard</text>
          </Show>
        </div>

        <div testId="dashboard-content" style={{ flexGrow: 1, minHeight: 0, overflowY: "scroll", padding: 16 }}>
          <Switch>
            <Match when={loggedOut()}>
              <div testId="logged-out" style={{ padding: 24, gap: 8 }}>
                <text style={{ color: palette.text, fontSize: 20, fontWeight: 600 }}>You have been logged out.</text>
                <div onClick={() => setLoggedOut(false)} style={{ minHeight: 34, alignSelf: "flex-start", padding: 8, borderRadius: 6, backgroundColor: palette.primary, cursor: "pointer" }}><text style={{ color: palette.white, fontSize: 12, pointerEvents: "none" }}>Return to dashboard</text></div>
              </div>
            </Match>
            <Match when={route() === "home"}><HomeRoute onNavigate={navigate} onLogout={logout} /></Match>
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
