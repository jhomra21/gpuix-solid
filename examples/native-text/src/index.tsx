import { render } from "@jhomra21/gpuix-solid"
import { For, Show, createSignal } from "solid-js"

const README = `# GPUIX Solid

Build **native** desktop apps with *Solid 2*, rendered on the \`GPU\`.

## Why

- Fine-grained Solid reactivity over GPUIX's retained native tree
- Selectable text everywhere, across element boundaries
- Tree-sitter highlighting computed in Rust
- Diffs virtualized with GPUI's \`list()\`

> Solid updates only the affected host nodes while GPUIX batches native mutations.

See https://github.com/jhomra21/gpuix-solid for more.
`

const SAMPLE = `export function greet(user: User): string {
  // Say hello.
  return \`hello \${user.name}\`
}`

const PATCH = [
  "diff --git a/src/server.ts b/src/server.ts",
  "--- a/src/server.ts",
  "+++ b/src/server.ts",
  "@@ -1,5 +1,6 @@",
  " import { createServer } from 'http'",
  " ",
  "-const port = 3000",
  "+const port = 8080",
  "+const host = '0.0.0.0'",
  " ",
  " export function start() {",
  "-  return createServer().listen(port)",
  "+  return createServer().listen(port, host)",
  " }",
].join("\n")

const TABS = ["markdown", "code", "diff"] as const
type Tab = (typeof TABS)[number]

function Tabs(props: { active: () => Tab; onSelect: (tab: Tab) => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 4,
        padding: 8,
        userSelect: "none",
      }}
    >
      <For each={TABS}>
        {(tab) => (
          <div
            style={{
              paddingTop: 6,
              paddingBottom: 6,
              paddingLeft: 12,
              paddingRight: 12,
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
              color: tab === props.active() ? "#ebebeb" : "#b4b4b4",
              backgroundColor: tab === props.active() ? "#ffffff14" : "#00000000",
              hover: { backgroundColor: "#ffffff0d" },
            }}
            onClick={() => props.onSelect(tab)}
          >
            {tab}
          </div>
        )}
      </For>
    </div>
  )
}

function App() {
  const [tab, setTab] = createSignal<Tab>("markdown")
  const [status, setStatus] = createSignal("drag across blocks, then press Cmd+C")

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#060606",
      }}
    >
      <Tabs active={tab} onSelect={setTab} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          minHeight: 0,
          padding: 24,
          overflowY: tab() === "diff" ? undefined : "scroll",
        }}
      >
        <Show when={tab() === "markdown"}>
          <markdown
            source={README}
            onLinkClick={(event) => setStatus(`link: ${event.value}`)}
          />
        </Show>
        <Show when={tab() === "code"}>
          <code code={SAMPLE} language="typescript" showLineNumbers />
        </Show>
        <Show when={tab() === "diff"}>
          <diff
            scroll
            patch={PATCH}
            wordDiff
            style={{ flexGrow: 1, minHeight: 0 }}
            onLineClick={(event) =>
              setStatus(`line ${event.newLine ?? event.oldLine}: ${event.value}`)
            }
            onToggleFile={(event) => setStatus(`toggle: ${event.value}`)}
          />
        </Show>
      </div>

      <div
        style={{
          padding: 10,
          fontSize: 11,
          color: "#8d8d8d",
          userSelect: "none",
        }}
      >
        {status()}
      </div>
    </div>
  )
}

render(() => <App />, {
  title: "Solid GPUIX Native Text",
  width: 900,
  height: 700,
})
