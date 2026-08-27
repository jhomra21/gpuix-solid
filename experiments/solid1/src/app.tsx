import { For, Show, createMemo, createSignal } from "solid-js"
import type { EventPayload, StyleDesc } from "gpuix-solid1-experiment"

interface LabItem {
  id: string
  label: string
}

const initialItems: LabItem[] = [
  { id: "alpha", label: "Alpha" },
  { id: "beta", label: "Beta" },
  { id: "gamma", label: "Gamma" },
]

const colors = {
  background: "#0f1117",
  panel: "#171a23",
  raised: "#202533",
  border: "#32394b",
  text: "#f4f7ff",
  muted: "#9ba6bd",
  blue: "#79a7ff",
  green: "#9bd36a",
}

function buttonStyle(active = false): StyleDesc {
  return {
    minHeight: 36,
    paddingLeft: 12,
    paddingRight: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: active ? colors.blue : colors.border,
    borderRadius: 7,
    backgroundColor: active ? "#263a5d" : colors.raised,
    color: colors.text,
    cursor: "pointer",
    hover: { backgroundColor: "#293044" },
  }
}

export function Solid1CompatibilityLab() {
  const [count, setCount] = createSignal(0)
  const [name, setName] = createSignal("")
  const [detailsOpen, setDetailsOpen] = createSignal(false)
  const [items, setItems] = createSignal<LabItem[]>(initialItems)
  const greeting = createMemo(() => name().trim() ? `Hello ${name().trim()}` : "Hello from Solid 1")

  const prepend = (): void => {
    if (items().some((item) => item.id === "delta")) return
    setItems((current) => [{ id: "delta", label: "Delta" }, ...current])
  }

  const rotate = (): void => {
    setItems((current) => {
      const first = current[0]
      return first ? [...current.slice(1), first] : current
    })
  }

  return (
    <div
      testId="solid1-lab"
      style={{
        width: "100%",
        height: "100%",
        padding: 18,
        gap: 14,
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily: "system-ui",
      }}
    >
      <div style={{ gap: 4 }}>
        <text style={{ color: colors.text, fontSize: 24, fontWeight: 750 }}>Solid 1 Compatibility Lab</text>
        <text testId="runtime-version" style={{ color: colors.green, fontSize: 12 }}>solid-js 1.9.15 → shared GPUI host kernel</text>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flexGrow: 1, minWidth: 300, padding: 14, gap: 12, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
          <text style={{ color: colors.text, fontSize: 15, fontWeight: 700 }}>Signals + native events</text>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div testId="increment" onClick={() => setCount((value) => value + 1)} style={buttonStyle()}>
              <text style={{ color: colors.text, fontSize: 12 }}>Increment</text>
            </div>
            <text testId="count-value" style={{ color: colors.blue, fontSize: 18, fontWeight: 800 }}>{count()}</text>
          </div>
          <input
            testId="name-input"
            value={name()}
            placeholder="Type a name"
            onChange={(event: EventPayload) => setName(event.value ?? "")}
            style={{ minHeight: 38, paddingLeft: 10, paddingRight: 10, backgroundColor: colors.raised, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 7 }}
          />
          <text testId="greeting" style={{ color: colors.muted, fontSize: 12 }}>{greeting()}</text>
        </div>

        <div style={{ flexGrow: 1, minWidth: 300, padding: 14, gap: 12, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
          <text style={{ color: colors.text, fontSize: 15, fontWeight: 700 }}>Show + keyed For reconciliation</text>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div testId="toggle-details" onClick={() => setDetailsOpen((open) => !open)} style={buttonStyle(detailsOpen())}>
              <text style={{ color: colors.text, fontSize: 12 }}>{detailsOpen() ? "Hide details" : "Show details"}</text>
            </div>
            <div testId="prepend-delta" onClick={prepend} style={buttonStyle()}><text style={{ color: colors.text, fontSize: 12 }}>Prepend Delta</text></div>
            <div testId="rotate-items" onClick={rotate} style={buttonStyle()}><text style={{ color: colors.text, fontSize: 12 }}>Rotate</text></div>
          </div>
          <Show when={detailsOpen()}>
            <div testId="details-panel" style={{ padding: 10, backgroundColor: colors.raised, borderRadius: 7 }}>
              <text style={{ color: colors.muted, fontSize: 11 }}>This subtree mounts and unmounts through Solid 1 synchronous reactivity.</text>
            </div>
          </Show>
          <div testId="item-list" style={{ gap: 6 }}>
            <For each={items()}>
              {(item) => (
                <div testId={`item-${item.id}`} style={{ minHeight: 34, paddingLeft: 10, justifyContent: "center", backgroundColor: colors.raised, borderRadius: 6 }}>
                  <text style={{ color: colors.text, fontSize: 12 }}>{item.label}</text>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>

      <text style={{ color: colors.muted, fontSize: 11 }}>Same native nodes, mutation batching, event registry, and GPUI renderer used by the Solid 2 package.</text>
    </div>
  )
}
