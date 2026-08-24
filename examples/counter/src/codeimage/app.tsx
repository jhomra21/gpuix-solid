import { For, Match, Show, Switch, createMemo, createSignal } from "solid-js"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  animate,
  type EventPayload,
  type StyleDesc,
} from "@jhomra21/gpuix-solid"

type Tool = "frame" | "code" | "theme"
type ThemeId = "tokyo" | "rose" | "nord"
type ChromeMode = "macos" | "compact" | "none"
type SyntaxTone = "plain" | "keyword" | "function" | "string" | "comment" | "type" | "number"

interface Theme {
  id: ThemeId
  name: string
  canvas: string
  canvasSoft: string
  window: string
  windowHeader: string
  border: string
  text: string
  muted: string
  accent: string
  syntax: Record<SyntaxTone, string>
}

interface CodeToken {
  text: string
  tone: SyntaxTone
}

interface CodeLine {
  number: number
  tokens: CodeToken[]
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

const tokyoTheme: Theme = {
  id: "tokyo",
  name: "Tokyo Night",
  canvas: "#7aa2f7",
  canvasSoft: "#bb9af7",
  window: "#1a1b26",
  windowHeader: "#24283b",
  border: "#414868",
  text: "#c0caf5",
  muted: "#565f89",
  accent: "#7dcfff",
  syntax: {
    plain: "#c0caf5",
    keyword: "#bb9af7",
    function: "#7aa2f7",
    string: "#9ece6a",
    comment: "#565f89",
    type: "#2ac3de",
    number: "#ff9e64",
  },
}

const roseTheme: Theme = {
  id: "rose",
  name: "Rosé Pine",
  canvas: "#eb6f92",
  canvasSoft: "#c4a7e7",
  window: "#191724",
  windowHeader: "#26233a",
  border: "#403d52",
  text: "#e0def4",
  muted: "#6e6a86",
  accent: "#9ccfd8",
  syntax: {
    plain: "#e0def4",
    keyword: "#c4a7e7",
    function: "#9ccfd8",
    string: "#f6c177",
    comment: "#6e6a86",
    type: "#ebbcba",
    number: "#eb6f92",
  },
}

const nordTheme: Theme = {
  id: "nord",
  name: "Nord",
  canvas: "#88c0d0",
  canvasSoft: "#81a1c1",
  window: "#2e3440",
  windowHeader: "#3b4252",
  border: "#4c566a",
  text: "#eceff4",
  muted: "#7f8ba0",
  accent: "#8fbcbb",
  syntax: {
    plain: "#eceff4",
    keyword: "#b48ead",
    function: "#88c0d0",
    string: "#a3be8c",
    comment: "#7f8ba0",
    type: "#8fbcbb",
    number: "#d08770",
  },
}

const themes: readonly Theme[] = [tokyoTheme, roseTheme, nordTheme]

const codeLines: readonly CodeLine[] = [
  {
    number: 1,
    tokens: [
      { text: "import", tone: "keyword" },
      { text: " { createSignal } ", tone: "plain" },
      { text: "from", tone: "keyword" },
      { text: " \"solid-js\"", tone: "string" },
    ],
  },
  { number: 2, tokens: [] },
  {
    number: 3,
    tokens: [
      { text: "export", tone: "keyword" },
      { text: " function ", tone: "keyword" },
      { text: "NativeCounter", tone: "function" },
      { text: "() {", tone: "plain" },
    ],
  },
  {
    number: 4,
    tokens: [
      { text: "  const", tone: "keyword" },
      { text: " [count, setCount] = ", tone: "plain" },
      { text: "createSignal", tone: "function" },
      { text: "(", tone: "plain" },
      { text: "0", tone: "number" },
      { text: ")", tone: "plain" },
    ],
  },
  { number: 5, tokens: [] },
  {
    number: 6,
    tokens: [
      { text: "  return", tone: "keyword" },
      { text: " (", tone: "plain" },
    ],
  },
  {
    number: 7,
    tokens: [
      { text: "    <", tone: "plain" },
      { text: "div", tone: "type" },
      { text: " onClick", tone: "function" },
      { text: "={() => setCount(count() + ", tone: "plain" },
      { text: "1", tone: "number" },
      { text: ")}", tone: "plain" },
      { text: ">", tone: "plain" },
    ],
  },
  {
    number: 8,
    tokens: [
      { text: "      Count: ", tone: "string" },
      { text: "{count()}", tone: "plain" },
    ],
  },
  {
    number: 9,
    tokens: [
      { text: "    </", tone: "plain" },
      { text: "div", tone: "type" },
      { text: ">", tone: "plain" },
    ],
  },
  { number: 10, tokens: [{ text: "  )", tone: "plain" }] },
  { number: 11, tokens: [{ text: "}", tone: "plain" }] },
  { number: 12, tokens: [{ text: "// Solid 2 universal renderer → GPUIX", tone: "comment" }] },
]

function actionStyle(active = false): StyleDesc {
  return {
    minHeight: 34,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 11,
    paddingRight: 11,
    borderRadius: 8,
    backgroundColor: active ? ui.accent : ui.panel,
    color: active ? "#ffffff" : ui.text,
    cursor: "pointer",
    hover: { backgroundColor: active ? "#8c72ff" : ui.panelRaised },
    active: { opacity: 0.78 },
  }
}

function smallButtonStyle(active = false): StyleDesc {
  return {
    minHeight: 30,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 7,
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
  label: string
  glyph: string
  onSelect: (tool: Tool) => void
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger
          testId={`tool-${props.tool}`}
          style={{
            width: 42,
            height: 42,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            backgroundColor: props.active ? "#2d2750" : ui.rail,
            borderWidth: 1,
            borderColor: props.active ? ui.accent : ui.rail,
            cursor: "pointer",
            hover: { backgroundColor: ui.panelRaised },
          }}
          onClick={() => props.onSelect(props.tool)}
        >
          <text style={{ color: props.active ? "#d8d0ff" : ui.muted, fontSize: 12, fontWeight: 700 }}>
            {props.glyph}
          </text>
        </TooltipTrigger>
        <TooltipContent
          style={{
            padding: 8,
            backgroundColor: ui.panelRaised,
            borderWidth: 1,
            borderColor: ui.border,
            borderRadius: 7,
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
  const decrement = () => props.onChange(Math.max(props.min, props.value - props.step))
  const increment = () => props.onChange(Math.min(props.max, props.value + props.step))

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <text style={{ color: ui.muted, fontSize: 12 }}>{props.label}</text>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div testId={`${props.testId}-minus`} style={smallButtonStyle()} onClick={decrement}>
          <text style={{ color: ui.text, fontSize: 12 }}>−</text>
        </div>
        <div
          style={{
            minWidth: 52,
            paddingTop: 7,
            paddingBottom: 7,
            paddingLeft: 8,
            paddingRight: 8,
            alignItems: "center",
            borderRadius: 7,
            backgroundColor: ui.app,
            borderWidth: 1,
            borderColor: ui.border,
          }}
        >
          <text testId={`${props.testId}-value`} style={{ color: ui.text, fontSize: 11, fontWeight: 600 }}>
            {props.value}px
          </text>
        </div>
        <div testId={`${props.testId}-plus`} style={smallButtonStyle()} onClick={increment}>
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
      style={{ ...smallButtonStyle(props.value), display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
      onClick={props.onToggle}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <text style={{ color: ui.text, fontSize: 11, fontWeight: 600 }}>{props.label}</text>
        <text style={{ color: ui.muted, fontSize: 10 }}>{props.detail}</text>
      </div>
      <text style={{ color: props.value ? "#c9bcff" : ui.faint, fontSize: 10 }}>{props.value ? "ON" : "OFF"}</text>
    </div>
  )
}

function CodeRow(props: { line: CodeLine; theme: Theme; showLineNumbers: boolean; fontSize: number }) {
  return (
    <div style={{ display: "flex", minHeight: props.fontSize + 8, alignItems: "center" }}>
      <Show when={props.showLineNumbers}>
        <div style={{ width: 34, alignItems: "flexEnd", paddingRight: 10 }}>
          <text testId={`line-number-${props.line.number}`} style={{ color: props.theme.muted, fontSize: props.fontSize - 2 }}>
            {props.line.number}
          </text>
        </div>
      </Show>
      <div style={{ display: "flex", flexGrow: 1 }}>
        <For each={props.line.tokens}>
          {(token) => (
            <text style={{ color: props.theme.syntax[token.tone], fontSize: props.fontSize }}>
              {token.text}
            </text>
          )}
        </For>
      </div>
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
  const [showShadow, setShowShadow] = createSignal(true)
  const [filename, setFilename] = createSignal("native-renderer.tsx")
  const [exportCount, setExportCount] = createSignal(0)

  const theme = createMemo(() => themes.find((candidate) => candidate.id === themeId()) ?? tokyoTheme)

  const cycleTheme = () => {
    const current = themes.findIndex((candidate) => candidate.id === themeId())
    const next = themes[(current + 1) % themes.length] ?? tokyoTheme
    setThemeId(next.id)
  }

  const exportPreview = () => setExportCount((count) => count + 1)

  return (
    <div
      testId="codeimage-shell"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: ui.app,
      }}
    >
      <div
        style={{
          height: 58,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 16,
          paddingRight: 16,
          backgroundColor: ui.toolbar,
          borderBottomWidth: 1,
          borderColor: ui.border,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: ui.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
            backgroundColor: ui.app,
            color: ui.text,
            borderWidth: 1,
            borderColor: ui.border,
            borderRadius: 8,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div testId="random-theme" style={smallButtonStyle()} onClick={cycleTheme}>
            <text style={{ color: ui.text, fontSize: 11 }}>Random theme</text>
          </div>
          <div testId="export-button" style={actionStyle(true)} onClick={exportPreview}>
            <text style={{ color: "#ffffff", fontSize: 11, fontWeight: 700 }}>Export</text>
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
            backgroundColor: ui.rail,
            borderRightWidth: 1,
            borderColor: ui.border,
          }}
        >
          <RailButton tool="frame" active={tool() === "frame"} label="Frame" glyph="FR" onSelect={setTool} />
          <RailButton tool="code" active={tool() === "code"} label="Code" glyph="<>" onSelect={setTool} />
          <RailButton tool="theme" active={tool() === "theme"} label="Themes" glyph="TH" onSelect={setTool} />
          <div style={{ flexGrow: 1 }} />
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              backgroundColor: ui.panelRaised,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
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
              borderBottomWidth: 1,
              borderColor: ui.border,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <text style={{ color: ui.muted, fontSize: 10 }}>CANVAS</text>
              <div style={{ width: 4, height: 4, borderRadius: 999, backgroundColor: ui.faint }} />
              <text testId="theme-label" style={{ color: ui.text, fontSize: 11, fontWeight: 600 }}>{theme().name}</text>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={smallButtonStyle()}><text style={{ color: ui.muted, fontSize: 10 }}>Fit</text></div>
              <div style={smallButtonStyle(true)}><text style={{ color: "#d8d0ff", fontSize: 10 }}>100%</text></div>
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
                backgroundColor: theme().canvas,
                borderWidth: 1,
                borderColor: theme().canvasSoft,
              }}
            >
              <div
                testId="code-window"
                style={{
                  width: "100%",
                  minHeight: 390,
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: radius(),
                  overflow: "hidden",
                  backgroundColor: theme().window,
                  borderWidth: showShadow() ? 2 : 1,
                  borderColor: showShadow() ? theme().canvasSoft : theme().border,
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
                      backgroundColor: theme().windowHeader,
                      borderBottomWidth: 1,
                      borderColor: theme().border,
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

                <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", paddingTop: 16, paddingBottom: 16, paddingLeft: 12, paddingRight: 18 }}>
                  <For each={codeLines}>
                    {(line) => <CodeRow line={line} theme={theme()} showLineNumbers={showLineNumbers()} fontSize={fontSize()} />}
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
              borderTopWidth: 1,
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
            backgroundColor: ui.inspector,
            borderLeftWidth: 1,
            borderColor: ui.border,
          }}
        >
          <Switch>
            <Match when={tool() === "frame"}>
              <InspectorTitle title="Frame" detail="Native layout controls adapted from CodeImage's editor inspector." />

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <text style={{ color: ui.faint, fontSize: 10, fontWeight: 700 }}>WINDOW CHROME</text>
                <div style={{ display: "flex", gap: 6 }}>
                  <For each={["macos", "compact", "none"] as const}>
                    {(mode) => (
                      <div testId={`chrome-${mode}`} style={smallButtonStyle(chromeMode() === mode)} onClick={() => setChromeMode(mode)}>
                        <text style={{ color: chromeMode() === mode ? "#d8d0ff" : ui.muted, fontSize: 10 }}>
                          {mode === "macos" ? "macOS" : mode === "compact" ? "Compact" : "None"}
                        </text>
                      </div>
                    )}
                  </For>
                </div>
              </div>

              <div style={{ height: 1, backgroundColor: ui.border }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <text style={{ color: ui.faint, fontSize: 10, fontWeight: 700 }}>LAYOUT</text>
                <Stepper label="Padding" value={padding()} min={24} max={72} step={8} testId="padding" onChange={setPadding} />
                <Stepper label="Radius" value={radius()} min={0} max={28} step={4} testId="radius" onChange={setRadius} />
                <ToggleRow
                  label="Frame emphasis"
                  detail="Uses native border weight instead of a DOM box-shadow."
                  value={showShadow()}
                  testId="toggle-shadow"
                  onToggle={() => setShowShadow((value) => !value)}
                />
              </div>

              <div style={{ height: 1, backgroundColor: ui.border }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <text style={{ color: ui.faint, fontSize: 10, fontWeight: 700 }}>DOCUMENT</text>
                <text style={{ color: ui.muted, fontSize: 10 }}>The toolbar filename is a controlled native GPUI input.</text>
                <div style={{ padding: 10, borderRadius: 8, backgroundColor: ui.panel }}>
                  <text style={{ color: ui.text, fontSize: 11 }}>{filename()}</text>
                </div>
              </div>
            </Match>

            <Match when={tool() === "code"}>
              <InspectorTitle title="Code" detail="Editor-facing controls without CodeMirror or browser DOM dependencies." />

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <text style={{ color: ui.faint, fontSize: 10, fontWeight: 700 }}>EDITOR</text>
                <Stepper label="Font size" value={fontSize()} min={11} max={17} step={1} testId="font-size" onChange={setFontSize} />
                <ToggleRow
                  label="Line numbers"
                  detail="Mounts and removes a real Solid conditional subtree."
                  value={showLineNumbers()}
                  testId="toggle-line-numbers"
                  onToggle={() => setShowLineNumbers((value) => !value)}
                />
              </div>

              <div style={{ height: 1, backgroundColor: ui.border }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <text style={{ color: ui.faint, fontSize: 10, fontWeight: 700 }}>LANGUAGE</text>
                <div style={{ ...smallButtonStyle(true), display: "flex", justifyContent: "space-between" }}>
                  <text style={{ color: ui.text, fontSize: 11 }}>TypeScript + JSX</text>
                  <text style={{ color: "#c9bcff", fontSize: 10 }}>TSX</text>
                </div>
                <div style={smallButtonStyle()}>
                  <text style={{ color: ui.muted, fontSize: 11 }}>Solid 2 universal JSX</text>
                </div>
              </div>

              <div style={{ height: 1, backgroundColor: ui.border }} />

              <div style={{ padding: 12, borderRadius: 9, backgroundColor: "#1d2830", borderWidth: 1, borderColor: "#294552" }}>
                <text style={{ color: "#9ccfd8", fontSize: 10, fontWeight: 700 }}>NATIVE PORT</text>
                <text style={{ color: ui.muted, fontSize: 10 }}>The code surface is rendered with GPUI text nodes, not a browser editor widget.</text>
              </div>
            </Match>

            <Match when={tool() === "theme"}>
              <InspectorTitle title="Themes" detail="Reactive theme cards drive the native preview immediately." />

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <For each={themes}>
                  {(candidate) => (
                    <div
                      testId={`theme-${candidate.id}`}
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
                      onClick={() => setThemeId(candidate.id)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: candidate.canvas, borderWidth: 1, borderColor: candidate.canvasSoft }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <text style={{ color: ui.text, fontSize: 11, fontWeight: 600 }}>{candidate.name}</text>
                          <text style={{ color: ui.faint, fontSize: 9 }}>{candidate.id}</text>
                        </div>
                      </div>
                      <Show when={themeId() === candidate.id}>
                        <text style={{ color: "#c9bcff", fontSize: 10 }}>SELECTED</text>
                      </Show>
                    </div>
                  )}
                </For>
              </div>

              <div style={{ height: 1, backgroundColor: ui.border }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <text style={{ color: ui.faint, fontSize: 10, fontWeight: 700 }}>PALETTE</text>
                <div style={{ display: "flex", gap: 8 }}>
                  <For each={[theme().accent, theme().syntax.keyword, theme().syntax.string, theme().syntax.number]}>
                    {(swatch) => <div style={{ width: 38, height: 30, borderRadius: 7, backgroundColor: swatch, borderWidth: 1, borderColor: theme().border }} />}
                  </For>
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 9, backgroundColor: ui.panel }}>
                <text style={{ color: ui.muted, fontSize: 10 }}>Theme state is plain Solid 2 reactivity. No Kobalte, vanilla-extract, or browser CSS runtime is required.</text>
              </div>
            </Match>
          </Switch>
        </div>
      </div>
    </div>
  )
}
