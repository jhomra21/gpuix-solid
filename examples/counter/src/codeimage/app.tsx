import { For, Show, createMemo, createSignal } from "solid-js"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  animate,
  type EventPayload,
  type StyleDesc,
} from "gpuix-solid"

type Tool = "frame" | "code" | "theme"
type ThemeId = "tokyo" | "rose" | "nord"
type ChromeMode = "macos" | "compact" | "none"

interface Theme {
  id: ThemeId
  name: string
  canvas: string
  canvasSoft: string
  window: string
  header: string
  border: string
  text: string
  muted: string
  accent: string
  keyword: string
  string: string
  number: string
}

const ui = {
  app: "#101117",
  toolbar: "#17191f",
  rail: "#14161c",
  canvas: "#1c1f27",
  inspector: "#17191f",
  panel: "#20232c",
  panelRaised: "#282c36",
  border: "#313642",
  text: "#f4f5f7",
  muted: "#9aa2b1",
  faint: "#687182",
  accent: "#7c5cff",
  success: "#6fd49d",
}

const themes: readonly Theme[] = [
  {
    id: "tokyo",
    name: "Tokyo Night",
    canvas: "#7aa2f7",
    canvasSoft: "#bb9af7",
    window: "#1a1b26",
    header: "#24283b",
    border: "#414868",
    text: "#c0caf5",
    muted: "#565f89",
    accent: "#7dcfff",
    keyword: "#bb9af7",
    string: "#9ece6a",
    number: "#ff9e64",
  },
  {
    id: "rose",
    name: "Rosé Pine",
    canvas: "#eb6f92",
    canvasSoft: "#c4a7e7",
    window: "#191724",
    header: "#26233a",
    border: "#403d52",
    text: "#e0def4",
    muted: "#6e6a86",
    accent: "#9ccfd8",
    keyword: "#c4a7e7",
    string: "#f6c177",
    number: "#eb6f92",
  },
  {
    id: "nord",
    name: "Nord",
    canvas: "#88c0d0",
    canvasSoft: "#81a1c1",
    window: "#2e3440",
    header: "#3b4252",
    border: "#4c566a",
    text: "#eceff4",
    muted: "#7f8ba0",
    accent: "#8fbcbb",
    keyword: "#b48ead",
    string: "#a3be8c",
    number: "#d08770",
  },
]

const codeLines = [
  'import { createSignal } from "solid-js"',
  "",
  "export function NativeCounter() {",
  "  const [count, setCount] = createSignal(0)",
  "",
  "  return (",
  "    <div onClick={() => setCount(count() + 1)}>",
  "      Count: {count()}",
  "    </div>",
  "  )",
  "}",
  "// Solid 2 universal renderer → GPUIX",
] as const

function buttonStyle(active = false): StyleDesc {
  return {
    minHeight: 32,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: active ? ui.accent : ui.border,
    backgroundColor: active ? "#2d2750" : ui.panel,
    cursor: "pointer",
    hover: { backgroundColor: ui.panelRaised },
    active: { opacity: 0.8 },
  }
}

function InspectorTitle(props: { title: string; detail: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <text style={{ color: ui.text, fontSize: 15, fontWeight: 700 }}>{props.title}</text>
      <text style={{ color: ui.muted, fontSize: 11 }}>{props.detail}</text>
    </div>
  )
}

function RailButton(props: {
  tool: Tool
  active: boolean
  glyph: string
  label: string
  onSelect: (tool: Tool) => void
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger
          testId={`tool-${props.tool}`}
          onClick={() => props.onSelect(props.tool)}
          style={{
            width: 42,
            height: 42,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: props.active ? ui.accent : ui.rail,
            backgroundColor: props.active ? "#2d2750" : ui.rail,
            cursor: "pointer",
            hover: { backgroundColor: ui.panelRaised },
          }}
        >
          <text style={{ color: props.active ? "#d8d0ff" : ui.muted, fontSize: 11, fontWeight: 700 }}>
            {props.glyph}
          </text>
        </TooltipTrigger>
        <TooltipContent
          style={{
            padding: 8,
            borderWidth: 1,
            borderColor: ui.border,
            borderRadius: 7,
            backgroundColor: ui.panelRaised,
          }}
        >
          <text style={{ color: ui.text, fontSize: 11 }}>{props.label}</text>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function Stepper(props: {
  label: string
  value: number
  min: number
  max: number
  step: number
  testId: string
  onChange: (value: number) => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <text style={{ color: ui.muted, fontSize: 11 }}>{props.label}</text>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          testId={`${props.testId}-minus`}
          style={buttonStyle()}
          onClick={() => props.onChange(Math.max(props.min, props.value - props.step))}
        >
          <text style={{ color: ui.text, fontSize: 12 }}>−</text>
        </div>
        <div
          style={{
            minWidth: 54,
            paddingTop: 8,
            paddingBottom: 8,
            alignItems: "center",
            borderRadius: 8,
            borderWidth: 1,
            borderColor: ui.border,
            backgroundColor: ui.app,
          }}
        >
          <text testId={`${props.testId}-value`} style={{ color: ui.text, fontSize: 10, fontWeight: 600 }}>
            {props.value}px
          </text>
        </div>
        <div
          testId={`${props.testId}-plus`}
          style={buttonStyle()}
          onClick={() => props.onChange(Math.min(props.max, props.value + props.step))}
        >
          <text style={{ color: ui.text, fontSize: 12 }}>+</text>
        </div>
      </div>
    </div>
  )
}

function ToggleRow(props: {
  label: string
  detail: string
  value: boolean
  testId: string
  onToggle: () => void
}) {
  return (
    <div
      testId={props.testId}
      style={{ ...buttonStyle(props.value), display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
      onClick={props.onToggle}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <text style={{ color: ui.text, fontSize: 11, fontWeight: 600 }}>{props.label}</text>
        <text style={{ color: ui.muted, fontSize: 9 }}>{props.detail}</text>
      </div>
      <text style={{ color: props.value ? "#c9bcff" : ui.faint, fontSize: 9 }}>{props.value ? "ON" : "OFF"}</text>
    </div>
  )
}

function CodeLine(props: {
  text: string
  number: number
  theme: Theme
  fontSize: number
  showLineNumbers: boolean
}) {
  const color = () => {
    if (props.text.startsWith("//")) return props.theme.muted
    if (props.text.includes("import") || props.text.includes("export") || props.text.includes("const") || props.text.includes("return")) {
      return props.theme.keyword
    }
    if (props.text.includes("solid-js")) return props.theme.string
    if (props.text.includes("0") || props.text.includes("1")) return props.theme.number
    return props.theme.text
  }

  return (
    <div style={{ minHeight: props.fontSize + 8, display: "flex", alignItems: "center" }}>
      <Show when={props.showLineNumbers}>
        <div style={{ width: 34, alignItems: "flexEnd", paddingRight: 10 }}>
          <text testId={`line-number-${props.number}`} style={{ color: props.theme.muted, fontSize: props.fontSize - 2 }}>
            {props.number}
          </text>
        </div>
      </Show>
      <text style={{ color: color(), fontSize: props.fontSize }}>{props.text}</text>
    </div>
  )
}

export function CodeImageNativeDemo() {
  const [tool, setTool] = createSignal<Tool>("frame")
  const [themeId, setThemeId] = createSignal<ThemeId>("tokyo")
  const [chromeMode, setChromeMode] = createSignal<ChromeMode>("macos")
  const [padding, setPadding] = createSignal(48)
  const [radius, setRadius] = createSignal(16)
  const [fontSize, setFontSize] = createSignal(13)
  const [showLineNumbers, setShowLineNumbers] = createSignal(true)
  const [showEmphasis, setShowEmphasis] = createSignal(true)
  const [filename, setFilename] = createSignal("native-renderer.tsx")
  const [exportCount, setExportCount] = createSignal(0)

  const theme = createMemo(() => themes.find((candidate) => candidate.id === themeId()) ?? themes[0]!)

  const cycleTheme = () => {
    const current = themes.findIndex((candidate) => candidate.id === themeId())
    setThemeId((themes[(current + 1) % themes.length] ?? themes[0]!).id)
  }

  return (
    <div
      testId="codeimage-shell"
      style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: ui.app }}
    >
      <div
        style={{
          height: 58,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 16,
          paddingRight: 16,
          borderWidth: 1,
          borderColor: ui.border,
          backgroundColor: ui.toolbar,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              backgroundColor: ui.accent,
            }}
          >
            <text style={{ color: "#ffffff", fontSize: 11, fontWeight: 800 }}>CI</text>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <text style={{ color: ui.text, fontSize: 13, fontWeight: 700 }}>CodeImage Native</text>
            <text style={{ color: ui.faint, fontSize: 9 }}>Solid 2 + GPUIX port</text>
          </div>
        </div>

        <input
          testId="filename-input"
          value={filename()}
          onChange={(event: EventPayload) => setFilename(event.value ?? "")}
          style={{
            width: 220,
            minHeight: 34,
            paddingLeft: 12,
            paddingRight: 12,
            borderWidth: 1,
            borderColor: ui.border,
            borderRadius: 8,
            backgroundColor: ui.app,
            color: ui.text,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div testId="random-theme" style={buttonStyle()} onClick={cycleTheme}>
            <text style={{ color: ui.text, fontSize: 10 }}>Random theme</text>
          </div>
          <div
            testId="export-button"
            style={{ ...buttonStyle(true), backgroundColor: ui.accent }}
            onClick={() => setExportCount((count) => count + 1)}
          >
            <text style={{ color: "#ffffff", fontSize: 10, fontWeight: 700 }}>Export</text>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
        <div
          style={{
            width: 64,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            paddingTop: 14,
            borderWidth: 1,
            borderColor: ui.border,
            backgroundColor: ui.rail,
          }}
        >
          <RailButton tool="frame" active={tool() === "frame"} glyph="FR" label="Frame" onSelect={setTool} />
          <RailButton tool="code" active={tool() === "code"} glyph="<>" label="Code" onSelect={setTool} />
          <RailButton tool="theme" active={tool() === "theme"} glyph="TH" label="Themes" onSelect={setTool} />
          <div style={{ flexGrow: 1 }} />
          <div
            style={{
              width: 34,
              height: 34,
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              backgroundColor: ui.panelRaised,
            }}
          >
            <text style={{ color: ui.muted, fontSize: 10, fontWeight: 700 }}>JP</text>
          </div>
        </div>

        <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", backgroundColor: ui.canvas }}>
          <div
            style={{
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: 18,
              paddingRight: 18,
              borderWidth: 1,
              borderColor: ui.border,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <text style={{ color: ui.muted, fontSize: 10 }}>CANVAS</text>
              <div style={{ width: 4, height: 4, borderRadius: 999, backgroundColor: ui.faint }} />
              <text testId="theme-label" style={{ color: ui.text, fontSize: 11, fontWeight: 600 }}>{theme().name}</text>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={buttonStyle()}><text style={{ color: ui.muted, fontSize: 9 }}>Fit</text></div>
              <div style={buttonStyle(true)}><text style={{ color: "#d8d0ff", fontSize: 9 }}>100%</text></div>
            </div>
          </div>

          <div style={{ flexGrow: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 22 }}>
            <animate.div
              testId="preview-frame"
              initial={{ opacity: 0.25, top: 10 }}
              to={{ opacity: 1, top: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              style={{
                position: "relative",
                width: 720,
                minHeight: 480,
                padding: padding(),
                borderRadius: 20,
                borderWidth: 1,
                borderColor: theme().canvasSoft,
                backgroundColor: theme().canvas,
              }}
            >
              <div
                testId="code-window"
                style={{
                  width: "100%",
                  minHeight: 390,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  borderRadius: radius(),
                  borderWidth: showEmphasis() ? 2 : 1,
                  borderColor: showEmphasis() ? theme().canvasSoft : theme().border,
                  backgroundColor: theme().window,
                }}
              >
                <Show when={chromeMode() !== "none"}>
                  <div
                    style={{
                      height: chromeMode() === "macos" ? 44 : 34,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingLeft: 14,
                      paddingRight: 14,
                      borderWidth: 1,
                      borderColor: theme().border,
                      backgroundColor: theme().header,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Show when={chromeMode() === "macos"}>
                        <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "#ff5f57" }} />
                        <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "#febc2e" }} />
                        <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "#28c840" }} />
                      </Show>
                    </div>
                    <text testId="preview-filename" style={{ color: theme().muted, fontSize: 10, fontWeight: 600 }}>{filename()}</text>
                    <text style={{ color: theme().muted, fontSize: 9 }}>TSX</text>
                  </div>
                </Show>

                <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", padding: 16 }}>
                  <For each={codeLines}>
                    {(line, index) => (
                      <CodeLine
                        text={line}
                        number={index() + 1}
                        theme={theme()}
                        fontSize={fontSize()}
                        showLineNumbers={showLineNumbers()}
                      />
                    )}
                  </For>
                </div>
              </div>
            </animate.div>
          </div>

          <div
            style={{
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: 14,
              paddingRight: 14,
              borderWidth: 1,
              borderColor: ui.border,
              backgroundColor: ui.toolbar,
            }}
          >
            <text style={{ color: ui.faint, fontSize: 9 }}>Solid 2 universal renderer · native GPUI retained tree</text>
            <text testId="export-status" style={{ color: exportCount() > 0 ? ui.success : ui.faint, fontSize: 9 }}>
              {exportCount() > 0 ? `Exported ${exportCount()} preview${exportCount() === 1 ? "" : "s"}` : "Ready"}
            </text>
          </div>
        </div>

        <div
          style={{
            width: 310,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: ui.border,
            backgroundColor: ui.inspector,
          }}
        >
          <Show when={tool() === "frame"}>
            <InspectorTitle title="Frame" detail="Native layout controls adapted from CodeImage's inspector." />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <text style={{ color: ui.faint, fontSize: 9, fontWeight: 700 }}>WINDOW CHROME</text>
              <div style={{ display: "flex", gap: 6 }}>
                <For each={["macos", "compact", "none"] as const}>
                  {(mode) => (
                    <div testId={`chrome-${mode}`} style={buttonStyle(chromeMode() === mode)} onClick={() => setChromeMode(mode)}>
                      <text style={{ color: chromeMode() === mode ? "#d8d0ff" : ui.muted, fontSize: 9 }}>
                        {mode === "macos" ? "macOS" : mode === "compact" ? "Compact" : "None"}
                      </text>
                    </div>
                  )}
                </For>
              </div>
            </div>
            <div style={{ height: 1, backgroundColor: ui.border }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <text style={{ color: ui.faint, fontSize: 9, fontWeight: 700 }}>LAYOUT</text>
              <Stepper label="Padding" value={padding()} min={24} max={72} step={8} testId="padding" onChange={setPadding} />
              <Stepper label="Radius" value={radius()} min={0} max={28} step={4} testId="radius" onChange={setRadius} />
              <ToggleRow
                label="Frame emphasis"
                detail="Native border weight"
                value={showEmphasis()}
                testId="toggle-shadow"
                onToggle={() => setShowEmphasis((value) => !value)}
              />
            </div>
            <div style={{ height: 1, backgroundColor: ui.border }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <text style={{ color: ui.faint, fontSize: 9, fontWeight: 700 }}>DOCUMENT</text>
              <text style={{ color: ui.muted, fontSize: 9 }}>The toolbar filename is a controlled native input.</text>
              <div style={{ padding: 10, borderRadius: 8, backgroundColor: ui.panel }}>
                <text style={{ color: ui.text, fontSize: 10 }}>{filename()}</text>
              </div>
            </div>
          </Show>

          <Show when={tool() === "code"}>
            <InspectorTitle title="Code" detail="Editor controls without CodeMirror or browser DOM dependencies." />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <text style={{ color: ui.faint, fontSize: 9, fontWeight: 700 }}>EDITOR</text>
              <Stepper label="Font size" value={fontSize()} min={11} max={17} step={1} testId="font-size" onChange={setFontSize} />
              <ToggleRow
                label="Line numbers"
                detail="Solid conditional subtree"
                value={showLineNumbers()}
                testId="toggle-line-numbers"
                onToggle={() => setShowLineNumbers((value) => !value)}
              />
            </div>
            <div style={{ height: 1, backgroundColor: ui.border }} />
            <div style={{ ...buttonStyle(true), display: "flex", justifyContent: "space-between" }}>
              <text style={{ color: ui.text, fontSize: 10 }}>TypeScript + JSX</text>
              <text style={{ color: "#c9bcff", fontSize: 9 }}>TSX</text>
            </div>
            <div style={{ padding: 12, borderRadius: 9, borderWidth: 1, borderColor: "#294552", backgroundColor: "#1d2830" }}>
              <text style={{ color: "#9ccfd8", fontSize: 9, fontWeight: 700 }}>NATIVE PORT</text>
              <text style={{ color: ui.muted, fontSize: 9 }}>The preview uses GPUI text nodes rather than a browser editor widget.</text>
            </div>
          </Show>

          <Show when={tool() === "theme"}>
            <InspectorTitle title="Themes" detail="Reactive cards recolor the native preview immediately." />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <For each={themes}>
                {(candidate) => (
                  <div
                    testId={`theme-${candidate.id}`}
                    onClick={() => setThemeId(candidate.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 11,
                      borderRadius: 9,
                      borderWidth: 1,
                      borderColor: themeId() === candidate.id ? ui.accent : ui.border,
                      backgroundColor: themeId() === candidate.id ? "#2d2750" : ui.panel,
                      cursor: "pointer",
                      hover: { backgroundColor: ui.panelRaised },
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          borderWidth: 1,
                          borderColor: candidate.canvasSoft,
                          backgroundColor: candidate.canvas,
                        }}
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <text style={{ color: ui.text, fontSize: 10, fontWeight: 600 }}>{candidate.name}</text>
                        <text style={{ color: ui.faint, fontSize: 9 }}>{candidate.id}</text>
                      </div>
                    </div>
                    <Show when={themeId() === candidate.id}>
                      <text style={{ color: "#c9bcff", fontSize: 9 }}>SELECTED</text>
                    </Show>
                  </div>
                )}
              </For>
            </div>
            <div style={{ height: 1, backgroundColor: ui.border }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <text style={{ color: ui.faint, fontSize: 9, fontWeight: 700 }}>PALETTE</text>
              <div style={{ display: "flex", gap: 8 }}>
                <For each={[theme().accent, theme().keyword, theme().string, theme().number]}>
                  {(swatch) => (
                    <div style={{ width: 38, height: 30, borderRadius: 7, borderWidth: 1, borderColor: theme().border, backgroundColor: swatch }} />
                  )}
                </For>
              </div>
            </div>
            <div style={{ padding: 12, borderRadius: 9, backgroundColor: ui.panel }}>
              <text style={{ color: ui.muted, fontSize: 9 }}>Theme state is plain Solid 2 reactivity with no browser CSS runtime.</text>
            </div>
          </Show>
        </div>
      </div>
    </div>
  )
}
