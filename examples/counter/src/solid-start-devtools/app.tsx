import { For, Match, Show, Switch, createMemo, createSignal } from "solid-js"
import {
  animate,
  type EventPayload,
  type StyleDesc,
} from "@jhomra21/gpuix-solid"

type Panel = "functions" | "errors"
type DetailTab = "request" | "response"
type MethodFilter = "ALL" | "GET" | "POST"

interface HeaderPair {
  key: string
  value: string
}

interface FunctionCall {
  id: string
  name: string
  method: "GET" | "POST"
  path: string
  status: number
  ok: boolean
  timingMs: number
  startedAt: string
  requestBody: readonly string[]
  responseBody: readonly string[]
  requestHeaders: readonly HeaderPair[]
  responseHeaders: readonly HeaderPair[]
}

interface DevError {
  id: number
  title: string
  source: string
  time: string
  message: string
  stack: readonly string[]
}

const color = {
  app: "#0d0f12",
  toolbar: "#15181d",
  panel: "#181c22",
  panelRaised: "#20252d",
  panelSoft: "#252b34",
  border: "#303741",
  borderStrong: "#3c4654",
  text: "#f1f3f5",
  muted: "#9ca6b4",
  faint: "#667180",
  blue: "#72a7ff",
  cyan: "#61d7d9",
  green: "#75d09a",
  yellow: "#e5bd72",
  red: "#ef7f8c",
  purple: "#b99aff",
}

const calls: readonly FunctionCall[] = [
  {
    id: "fn-001",
    name: "getProjects",
    method: "GET",
    path: "/_server/getProjects",
    status: 200,
    ok: true,
    timingMs: 42,
    startedAt: "16:41:08.112",
    requestBody: ["{", '  "workspace": "gpuix-solid",', '  "limit": 8', "}"],
    responseBody: ["{", '  "projects": 8,', '  "nextCursor": null,', '  "cached": true', "}"],
    requestHeaders: [
      { key: "accept", value: "application/json" },
      { key: "x-solidstart-origin", value: "dev-toolbar" },
    ],
    responseHeaders: [
      { key: "content-type", value: "application/json; charset=utf-8" },
      { key: "cache-control", value: "private, max-age=30" },
    ],
  },
  {
    id: "fn-002",
    name: "saveWorkspace",
    method: "POST",
    path: "/_server/saveWorkspace",
    status: 201,
    ok: true,
    timingMs: 118,
    startedAt: "16:41:12.904",
    requestBody: ["{", '  "name": "Native Devtools",', '  "dirty": false', "}"],
    responseBody: ["{", '  "saved": true,', '  "revision": 43', "}"],
    requestHeaders: [
      { key: "content-type", value: "application/json" },
      { key: "x-request-id", value: "native-2c14" },
    ],
    responseHeaders: [
      { key: "content-type", value: "application/json" },
      { key: "x-response-time", value: "118ms" },
    ],
  },
  {
    id: "fn-003",
    name: "loadSession",
    method: "GET",
    path: "/_server/loadSession",
    status: 200,
    ok: true,
    timingMs: 31,
    startedAt: "16:41:18.221",
    requestBody: ["{", '  "session": "demo-solid-2"', "}"],
    responseBody: ["{", '  "user": "Demo User",', '  "role": "developer"', "}"],
    requestHeaders: [{ key: "accept", value: "application/json" }],
    responseHeaders: [{ key: "content-type", value: "application/json" }],
  },
  {
    id: "fn-004",
    name: "publishPreview",
    method: "POST",
    path: "/_server/publishPreview",
    status: 422,
    ok: false,
    timingMs: 86,
    startedAt: "16:41:24.588",
    requestBody: ["{", '  "channel": "preview",', '  "commit": "26677cd"', "}"],
    responseBody: ["{", '  "error": "Preview already exists",', '  "retryable": false', "}"],
    requestHeaders: [{ key: "content-type", value: "application/json" }],
    responseHeaders: [
      { key: "content-type", value: "application/json" },
      { key: "x-error-code", value: "PREVIEW_EXISTS" },
    ],
  },
]

const initialErrors: readonly DevError[] = [
  {
    id: 1,
    title: "Route data warning",
    source: "routes/projects.tsx:44",
    time: "16:40:53",
    message: "Demo warning: project metadata was served from the local fallback.",
    stack: [
      "at ProjectRoute (routes/projects.tsx:44:11)",
      "at RouteSection (router.tsx:182:7)",
      "at AppShell (app.tsx:28:3)",
    ],
  },
  {
    id: 2,
    title: "Server function rejected",
    source: "server/publish.ts:81",
    time: "16:41:24",
    message: "Preview already exists for this demo revision.",
    stack: [
      "at publishPreview (server/publish.ts:81:9)",
      "at handleServerAction (server/runtime.ts:122:15)",
    ],
  },
]

function surface(extra: StyleDesc = {}): StyleDesc {
  return {
    backgroundColor: color.panel,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 10,
    ...extra,
  }
}

function button(active = false): StyleDesc {
  return {
    minHeight: 32,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 10,
    paddingRight: 10,
    borderWidth: 1,
    borderColor: active ? color.blue : color.border,
    borderRadius: 7,
    backgroundColor: active ? "#20324a" : color.panelSoft,
    cursor: "pointer",
    hover: { backgroundColor: active ? "#29405f" : "#303844" },
    active: { opacity: 0.8 },
  }
}

function Badge(props: { children: string; tone?: "info" | "success" | "failure" | "neutral" }) {
  const background = () => {
    if (props.tone === "success") return "#173626"
    if (props.tone === "failure") return "#45232a"
    if (props.tone === "info") return "#1b3450"
    return color.panelSoft
  }
  const foreground = () => {
    if (props.tone === "success") return color.green
    if (props.tone === "failure") return color.red
    if (props.tone === "info") return color.blue
    return color.muted
  }
  return (
    <div
      style={{
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 7,
        paddingRight: 7,
        borderRadius: 5,
        backgroundColor: background(),
      }}
    >
      <text style={{ color: foreground(), fontSize: 9, fontWeight: 700 }}>{props.children}</text>
    </div>
  )
}

function Section(props: {
  title: string
  children: unknown
  collapsible?: boolean
  defaultOpen?: boolean
  testId?: string
}) {
  const [open, setOpen] = createSignal(props.defaultOpen ?? true)
  return (
    <div style={surface({ overflow: "hidden" })}>
      <div
        testId={props.testId}
        onClick={() => props.collapsible && setOpen((value) => !value)}
        style={{
          minHeight: 38,
          paddingLeft: 12,
          paddingRight: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: props.collapsible ? "pointer" : undefined,
          backgroundColor: color.panelRaised,
        }}
      >
        <text style={{ color: color.text, fontSize: 11, fontWeight: 700 }}>{props.title}</text>
        <Show when={props.collapsible}>
          <text style={{ color: color.faint, fontSize: 11 }}>{open() ? "−" : "+"}</text>
        </Show>
      </div>
      <Show when={open()}>
        <div style={{ padding: 12 }}>{props.children as never}</div>
      </Show>
    </div>
  )
}

function CodeBlock(props: { lines: readonly string[]; testId?: string }) {
  return (
    <div testId={props.testId} style={{ padding: 12, borderRadius: 7, backgroundColor: color.app, gap: 3 }}>
      <For each={props.lines}>
        {(line, index) => (
          <div style={{ display: "flex", gap: 10, minHeight: 18 }}>
            <text style={{ width: 18, color: color.faint, fontSize: 10 }}>{index() + 1}</text>
            <text style={{ color: line.includes("error") ? color.red : color.text, fontSize: 11 }}>{line}</text>
          </div>
        )}
      </For>
    </div>
  )
}

function HeaderTable(props: { rows: readonly HeaderPair[]; testId: string }) {
  return (
    <div testId={props.testId} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <For each={props.rows}>
        {(row) => (
          <div style={{ display: "flex", gap: 10, paddingTop: 5, paddingBottom: 5 }}>
            <text style={{ width: 150, color: color.blue, fontSize: 10, fontWeight: 600 }}>{row.key}</text>
            <text style={{ color: color.muted, fontSize: 10 }}>{row.value}</text>
          </div>
        )}
      </For>
    </div>
  )
}

function FunctionList(props: {
  items: readonly FunctionCall[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <For each={props.items}>
        {(call) => {
          const selected = () => props.selectedId === call.id
          return (
            <div
              testId={`call-${call.id}`}
              onClick={() => props.onSelect(call.id)}
              style={{
                padding: 10,
                gap: 6,
                borderWidth: 1,
                borderColor: selected() ? color.blue : color.border,
                borderRadius: 8,
                backgroundColor: selected() ? "#192b42" : color.panelRaised,
                cursor: "pointer",
                hover: { backgroundColor: selected() ? "#203752" : color.panelSoft },
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Badge tone="info">{call.method}</Badge>
                  <text style={{ color: color.text, fontSize: 11, fontWeight: 700 }}>{call.name}</text>
                </div>
                <Badge tone={call.ok ? "success" : "failure"}>{String(call.status)}</Badge>
              </div>
              <text style={{ color: color.faint, fontSize: 9 }}>{call.path}</text>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <text style={{ color: color.faint, fontSize: 9 }}>{call.startedAt}</text>
                <text style={{ color: color.muted, fontSize: 9 }}>{call.timingMs} ms</text>
              </div>
            </div>
          )
        }}
      </For>
    </div>
  )
}

function Properties(props: { call: FunctionCall; tab: DetailTab }) {
  const rows = createMemo(() => {
    if (props.tab === "request") {
      return [
        ["Method", props.call.method],
        ["URL", props.call.path],
        ["Started", props.call.startedAt],
      ] as const
    }
    return [
      ["OK", props.call.ok ? "true" : "false"],
      ["Status", String(props.call.status)],
      ["Timing", `${props.call.timingMs} ms`],
    ] as const
  })
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <For each={rows()}>
        {(row) => (
          <div style={{ display: "flex", gap: 12, paddingTop: 4, paddingBottom: 4 }}>
            <text style={{ width: 110, color: color.muted, fontSize: 10, fontWeight: 700 }}>{row[0]}</text>
            <text style={{ color: color.text, fontSize: 10 }}>{row[1]}</text>
          </div>
        )}
      </For>
    </div>
  )
}

function FunctionDetail(props: { call: FunctionCall }) {
  const [tab, setTab] = createSignal<DetailTab>("request")
  const body = () => tab() === "request" ? props.call.requestBody : props.call.responseBody
  const headers = () => tab() === "request" ? props.call.requestHeaders : props.call.responseHeaders
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Badge tone="info">{props.call.method}</Badge>
          <text testId="detail-name" style={{ color: color.text, fontSize: 15, fontWeight: 700 }}>{props.call.name}</text>
          <Badge tone={props.call.ok ? "success" : "failure"}>{String(props.call.status)}</Badge>
        </div>
        <text style={{ color: color.muted, fontSize: 10 }}>{props.call.timingMs} ms</text>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <div testId="tab-request" onClick={() => setTab("request")} style={button(tab() === "request")}>
          <text style={{ color: tab() === "request" ? color.blue : color.text, fontSize: 10, fontWeight: 700 }}>Request</text>
        </div>
        <div testId="tab-response" onClick={() => setTab("response")} style={button(tab() === "response")}>
          <text style={{ color: tab() === "response" ? color.blue : color.text, fontSize: 10, fontWeight: 700 }}>Response</text>
        </div>
      </div>

      <animate.div
        testId="detail-content"
        initial={{ opacity: 0.45, left: 8 }}
        to={{ opacity: 1, left: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 }}
      >
        <Section title="Body">
          <CodeBlock testId="detail-body" lines={body()} />
        </Section>
        <Section title="Headers" collapsible testId="headers-toggle">
          <HeaderTable testId="headers-table" rows={headers()} />
        </Section>
        <Section title="Information" collapsible defaultOpen={false} testId="information-toggle">
          <Properties call={props.call} tab={tab()} />
        </Section>
      </animate.div>
    </div>
  )
}

function FunctionsPanel() {
  const [selectedId, setSelectedId] = createSignal(calls[0]?.id ?? "")
  const [filter, setFilter] = createSignal<MethodFilter>("ALL")
  const [query, setQuery] = createSignal("")
  const visible = createMemo(() => calls.filter((call) => {
    const methodMatch = filter() === "ALL" || call.method === filter()
    const text = query().trim().toLowerCase()
    const queryMatch = !text || call.name.toLowerCase().includes(text) || call.path.toLowerCase().includes(text)
    return methodMatch && queryMatch
  }))
  const selected = createMemo(() => calls.find((call) => call.id === selectedId()) ?? visible()[0])

  return (
    <div testId="functions-panel" style={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
      <div
        style={{
          width: 320,
          minWidth: 320,
          padding: 12,
          gap: 10,
          backgroundColor: color.toolbar,
          borderWidth: 1,
          borderColor: color.border,
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <text style={{ color: color.text, fontSize: 13, fontWeight: 700 }}>Server functions</text>
            <text testId="visible-count" style={{ color: color.faint, fontSize: 9 }}>{visible().length} calls detected</text>
          </div>
          <Badge tone="neutral">LIVE</Badge>
        </div>

        <input
          testId="function-search"
          value={query()}
          placeholder="Filter calls..."
          onChange={(event: EventPayload) => setQuery(event.value ?? "")}
          style={{
            minHeight: 34,
            paddingLeft: 10,
            paddingRight: 10,
            backgroundColor: color.app,
            color: color.text,
            borderWidth: 1,
            borderColor: color.border,
            borderRadius: 7,
          }}
        />

        <div style={{ display: "flex", gap: 5 }}>
          <For each={["ALL", "GET", "POST"] as const}>
            {(method) => (
              <div testId={`filter-${method.toLowerCase()}`} onClick={() => setFilter(method)} style={button(filter() === method)}>
                <text style={{ color: filter() === method ? color.blue : color.muted, fontSize: 9, fontWeight: 700 }}>{method}</text>
              </div>
            )}
          </For>
        </div>

        <FunctionList items={visible()} selectedId={selectedId()} onSelect={setSelectedId} />
      </div>

      <div style={{ flexGrow: 1, minWidth: 0, padding: 16, overflowY: "auto" }}>
        <Show
          when={selected()}
          fallback={
            <div style={surface({ padding: 24, alignItems: "center" })}>
              <text style={{ color: color.muted, fontSize: 11 }}>Select a server function call.</text>
            </div>
          }
        >
          {(call) => <FunctionDetail call={call()} />}
        </Show>
      </div>
    </div>
  )
}

function ErrorsPanel() {
  const [errors, setErrors] = createSignal<readonly DevError[]>(initialErrors)
  const [selectedId, setSelectedId] = createSignal(initialErrors[0]?.id ?? 0)
  const selected = createMemo(() => errors().find((error) => error.id === selectedId()) ?? errors()[0])

  return (
    <div testId="errors-panel" style={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
      <div style={{ width: 320, minWidth: 320, padding: 12, gap: 8, backgroundColor: color.toolbar, borderWidth: 1, borderColor: color.border }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <text style={{ color: color.text, fontSize: 13, fontWeight: 700 }}>Runtime issues</text>
          <div
            testId="clear-errors"
            onClick={() => setErrors([])}
            style={button(false)}
          >
            <text style={{ color: color.muted, fontSize: 9 }}>Clear</text>
          </div>
        </div>
        <For
          each={errors()}
          fallback={
            <div testId="errors-empty" style={surface({ padding: 20, alignItems: "center" })}>
              <text style={{ color: color.green, fontSize: 11 }}>No captured errors.</text>
            </div>
          }
        >
          {(error) => (
            <div
              testId={`error-${error.id}`}
              onClick={() => setSelectedId(error.id)}
              style={{
                padding: 10,
                gap: 4,
                borderWidth: 1,
                borderColor: selectedId() === error.id ? color.red : color.border,
                borderRadius: 8,
                backgroundColor: selectedId() === error.id ? "#342126" : color.panelRaised,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <text style={{ color: color.text, fontSize: 10, fontWeight: 700 }}>{error.title}</text>
                <text style={{ color: color.faint, fontSize: 9 }}>{error.time}</text>
              </div>
              <text style={{ color: color.red, fontSize: 9 }}>{error.source}</text>
            </div>
          )}
        </For>
      </div>

      <div style={{ flexGrow: 1, minWidth: 0, padding: 16 }}>
        <Show
          when={selected()}
          fallback={
            <div style={surface({ padding: 24, alignItems: "center" })}>
              <text style={{ color: color.muted, fontSize: 11 }}>No error selected.</text>
            </div>
          }
        >
          {(error) => (
            <animate.div
              initial={{ opacity: 0.4, top: 6 }}
              to={{ opacity: 1, top: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <text testId="error-title" style={{ color: color.text, fontSize: 16, fontWeight: 700 }}>{error().title}</text>
                  <text style={{ color: color.red, fontSize: 10 }}>{error().source}</text>
                </div>
                <Badge tone="failure">ERROR</Badge>
              </div>
              <Section title="Message">
                <text style={{ color: color.text, fontSize: 11 }}>{error().message}</text>
              </Section>
              <Section title="Stack trace">
                <CodeBlock lines={error().stack} />
              </Section>
            </animate.div>
          )}
        </Show>
      </div>
    </div>
  )
}

export function SolidStartDevtoolsNativeDemo() {
  const [panel, setPanel] = createSignal<Panel>("functions")
  return (
    <div
      testId="solid-start-devtools-shell"
      style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: color.app }}
    >
      <div
        style={{
          minHeight: 52,
          paddingLeft: 16,
          paddingRight: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: color.toolbar,
          borderWidth: 1,
          borderColor: color.border,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, alignItems: "center", justifyContent: "center", borderRadius: 7, backgroundColor: color.blue }}>
            <text style={{ color: color.app, fontSize: 11, fontWeight: 800 }}>S</text>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <text style={{ color: color.text, fontSize: 12, fontWeight: 700 }}>Solid Start Devtools Native</text>
            <text style={{ color: color.faint, fontSize: 9 }}>Official Solid 2 UI structure adapted to GPUIX</text>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Badge tone="info">Solid 2 RC</Badge>
          <Badge tone="neutral">1.0.0-next.4</Badge>
        </div>
      </div>

      <Switch>
        <Match when={panel() === "functions"}><FunctionsPanel /></Match>
        <Match when={panel() === "errors"}><ErrorsPanel /></Match>
      </Switch>

      <div
        style={{
          minHeight: 48,
          paddingLeft: 14,
          paddingRight: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: color.toolbar,
          borderWidth: 1,
          borderColor: color.border,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <div testId="toolbar-functions" onClick={() => setPanel("functions")} style={button(panel() === "functions")}>
            <text style={{ color: panel() === "functions" ? color.cyan : color.muted, fontSize: 10, fontWeight: 700 }}>ƒ Server functions</text>
          </div>
          <div testId="toolbar-errors" onClick={() => setPanel("errors")} style={button(panel() === "errors")}>
            <text style={{ color: panel() === "errors" ? color.red : color.muted, fontSize: 10, fontWeight: 700 }}>! Errors · {initialErrors.length}</text>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: color.green }} />
          <text style={{ color: color.faint, fontSize: 9 }}>Solid 2 universal renderer · native GPUI retained tree</text>
        </div>
      </div>
    </div>
  )
}
