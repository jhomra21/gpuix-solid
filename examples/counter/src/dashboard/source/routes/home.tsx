import { For, Show, createSignal, type Element as SolidElement } from "solid-js"
import { Button, Card, palette, type DashboardRoute } from "../native"

const dashboardItems: Array<{
  title: string
  description: string
  icon: string
  route: DashboardRoute
  accent: string
}> = [
  { title: "Account", description: "Manage your account", icon: "🗄️", route: "account", accent: palette.greenAccent },
  { title: "Notes", description: "Create and manage your notes from D1 database", icon: "📝", route: "notes", accent: palette.purpleAccent },
  { title: "Tasks", description: "Create and manage your tasks from Convex database", icon: "🔄", route: "tasks", accent: palette.blueAccent },
]

export function HomeRoute(props: { onNavigate(route: DashboardRoute): void; onLogout(): void }): SolidElement {
  const [apiResult, setApiResult] = createSignal<string | null>(null)

  return (
    <div testId="page-home" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 40 }}>
        <text style={{ color: palette.text, fontSize: 24, fontWeight: 600 }}>Welcome, User</text>
        <text style={{ color: palette.secondary, fontSize: 12 }}>
          Welcome to the dashboard. You can edit this page at /routes/dashboard/index.tsx
        </text>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, marginBottom: 40 }}>
        <Button testId="test-api" active onClick={() => setApiResult('{ "message": "Hello from the API" }')}>
          <text style={{ color: palette.white, fontSize: 12 }}>Test API</text>
        </Button>
        <Show when={apiResult()}>
          {(result) => (
            <Card style={{ width: "100%", backgroundColor: palette.muted }}>
              <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <text style={{ color: palette.text, fontSize: 11 }}>{result()}</text>
                <Button testId="close-api" onClick={() => setApiResult(null)}>
                  <text style={{ color: palette.text, fontSize: 11 }}>×</text>
                </Button>
              </div>
            </Card>
          )}
        </Show>
      </div>

      <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        <For each={dashboardItems}>
          {(item) => (
            <Card style={{ width: "48%", minWidth: 280, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, backgroundColor: item.accent, pointerEvents: "none" }} />
              <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <text style={{ color: palette.text, fontSize: 17, fontWeight: 500 }}>{item.title}</text>
                <text style={{ fontSize: 22 }}>{item.icon}</text>
              </div>
              <text style={{ color: palette.secondary, fontSize: 12, lineHeight: 18 }}>{item.description}</text>
              <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 16 }}>
                <Button testId={`home-open-${item.route}`} active onClick={() => props.onNavigate(item.route)}>
                  <text style={{ color: palette.white, fontSize: 12 }}>Open {item.title}</text>
                </Button>
              </div>
            </Card>
          )}
        </For>
      </div>

      <Card style={{ marginTop: 48, backgroundColor: "#ffffff80" }}>
        <text style={{ color: palette.text, fontSize: 15, fontWeight: 500 }}>About This Demo</text>
        <text style={{ color: palette.secondary, fontSize: 12 }}>This application demonstrates integration of several technologies:</text>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <text style={{ color: palette.secondary, fontSize: 12 }}>• SolidJS and Tanstack Router for reactive UI</text>
          <text style={{ color: palette.secondary, fontSize: 12 }}>• Better-auth with Cloudflare D1 and KV for authentication</text>
          <text style={{ color: palette.secondary, fontSize: 12 }}>• Single Worker for Server and Client using Cloudflare Vite Plugin</text>
          <text style={{ color: palette.secondary, fontSize: 12 }}>• Shadcn components converted to SolidJS [solid-ui, shadcn-solid]</text>
          <text style={{ color: palette.secondary, fontSize: 12 }}>• Notes CRUD with D1</text>
          <text style={{ color: palette.secondary, fontSize: 12 }}>• Todo list with Convex database</text>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <Button testId="logout" active onClick={props.onLogout}>
            <text style={{ color: palette.white, fontSize: 12 }}>Logout</text>
          </Button>
        </div>
      </Card>
    </div>
  )
}
