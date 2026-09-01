import { For, Match, Switch, createSignal } from "solid-js"
import { Divider, palette, type RootPage } from "../native"
import { DashboardRoute } from "./dashboard.route"
import { IndexRoute } from "./index"
import { LoginRoute } from "./login"
import { SimpleRoute } from "./simple"

const rootNav: Array<readonly [RootPage, string]> = [
  ["home", "Home"],
  ["dashboard", "Dashboard"],
  ["expensive", "Expensive"],
  ["route-a", "Pathless Layout A"],
  ["route-b", "Pathless Layout B"],
  ["profile", "Profile"],
  ["login", "Login"],
]

export function RootRoute() {
  const [page, setPage] = createSignal<RootPage>("dashboard")

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
                <div testId={`root-nav-${value}`} onClick={() => setPage(value)} style={{ minHeight: 40, paddingLeft: 12, paddingRight: 12, justifyContent: "center", backgroundColor: palette.app, cursor: "pointer", hover: { backgroundColor: palette.panelHover } }}>
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
            <Match when={page() === "home"}><IndexRoute onInvoice={() => setPage("dashboard")} /></Match>
            <Match when={page() === "dashboard"}><DashboardRoute /></Match>
            <Match when={page() === "expensive"}><SimpleRoute testId="page-expensive" title="Expensive" body="This route is intentionally used by the upstream kitchen sink to demonstrate deferred route loading and artificial request latency." /></Match>
            <Match when={page() === "route-a"}><SimpleRoute testId="page-route-a" title="Pathless Layout A" body="This view sits under the kitchen sink's pathless layout route." /></Match>
            <Match when={page() === "route-b"}><SimpleRoute testId="page-route-b" title="Pathless Layout B" body="A sibling route sharing the same pathless layout state." /></Match>
            <Match when={page() === "profile"}><SimpleRoute testId="page-profile" title="Profile" body="Authenticated profile content in the upstream example." /></Match>
            <Match when={page() === "login"}><LoginRoute /></Match>
          </Switch>
        </div>
      </div>
    </div>
  )
}
