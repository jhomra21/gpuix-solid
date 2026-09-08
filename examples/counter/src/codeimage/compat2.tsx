import { For, Show, createMemo, createSignal, type Element as SolidElement } from "solid-js"
import type { PublicInstance, StyleDesc } from "gpuix-solid"
import codeImageLogo from "../../upstream/codeimage/apps/codeimage/public/assets/codeimage-logo-blue-svg-v1.svg?raw"

type Modality = "full" | "mobile"
type ThemeId = "fleetDark" | "vsCodeDarkTheme" | "dracula"
type TerminalType = "macOs" | "macOsGrayTheme" | "macOsOutlineTheme" | "windows"
type BorderType = "glass" | "none"
type ShadowType = "bottom" | "none"

type Preset = {
  id: string
  name: string
  updated: string
  sync: boolean
  themeId: ThemeId
  padding: number
  radius: number
  showHeader: boolean
  terminalType: TerminalType
}

interface Theme {
  id: ThemeId
  label: string
  preview: NonNullable<StyleDesc["background"]>
  terminal: string
  text: string
  keyword: string
  string: string
  number: string
  comment: string
}

interface ChildrenProps {
  children?: SolidElement | undefined
}

interface BoxProps extends ChildrenProps {
  class?: string | undefined
  display?: "flex" | "inlineFlex" | "none" | undefined
  flexDirection?: "row" | "column" | undefined
  height?: number | string | undefined
  width?: number | string | undefined
  alignItems?: "center" | "flex-start" | "flex-end" | undefined
  justifyContent?: "center" | "space-between" | "flex-end" | undefined
  paddingTop?: number | undefined
  paddingX?: number | undefined
  padding?: number | undefined
  flexGrow?: number | undefined
}

const colors = {
  background: "#1d1d1d",
  panel: "#111111",
  input: "#232323",
  divider: "#252525",
  button: "#333333",
  buttonHover: "#3e3e3e",
  buttonActive: "#505050",
  text: "#ededed",
  textAlt: "#cccccc",
  description: "#999999",
  primary: "#0099ff",
  primaryHover: "#0088ff",
  primaryActive: "#0077ff",
  white: "#ffffff",
  glass: "#505050",
} as const

const themes: readonly Theme[] = [
  {
    id: "fleetDark",
    label: "Fleet Dark",
    preview: {
      type: "linear-gradient",
      angle: 152,
      stops: [
        { color: "rgb(222, 156, 110)", position: 0 },
        { color: "rgb(125, 36, 242)", position: 1 },
      ],
    },
    terminal: "#181818",
    text: "#d1d1d1",
    keyword: "#82d2ce",
    string: "#e394dc",
    number: "#ebc88d",
    comment: "#898989",
  },
  {
    id: "vsCodeDarkTheme",
    label: "VSCode Dark",
    preview: {
      type: "linear-gradient",
      angle: 135,
      stops: [
        { color: "#1cb1f2", position: 0 },
        { color: "#0059ff", position: 1 },
      ],
    },
    terminal: "#262335",
    text: "hsl(204, 3%, 98%)",
    keyword: "hsl(207, 65%, 59%)",
    string: "hsl(17, 60%, 64%)",
    number: "hsl(99, 28%, 73%)",
    comment: "hsl(101, 33%, 47%)",
  },
  {
    id: "dracula",
    label: "Dracula",
    preview: {
      type: "linear-gradient",
      angle: 135,
      stops: [
        { color: "rgba(171,73,222,1)", position: 0 },
        { color: "rgba(73,84,222,1)", position: 1 },
      ],
    },
    terminal: "#282a36",
    text: "#f8f8f2",
    keyword: "#ff79c6",
    string: "#f1fa8c",
    number: "#bd93f9",
    comment: "#6272a4",
  },
]

const sourceCode = [
  "function Counter() {",
  "  const [count, setCount] = createSignal(0);",
  "",
  "  setInterval(",
  "    () => setCount(count() + 1),",
  "    1000",
  "  );",
  "",
  "  return <div>The count is {count()}</div>",
  "}",
] as const

const initialPresets: readonly Preset[] = [
  {
    id: "preset-0",
    name: "Daily snippet",
    updated: "Updated 2 days ago",
    sync: false,
    themeId: "fleetDark",
    padding: 64,
    radius: 8,
    showHeader: true,
    terminalType: "macOs",
  },
  {
    id: "preset-1",
    name: "Presentation",
    updated: "Updated 5 days ago",
    sync: true,
    themeId: "dracula",
    padding: 32,
    radius: 16,
    showHeader: true,
    terminalType: "macOsOutlineTheme",
  },
]

const [framePadding, setFramePadding] = createSignal(64)
const [frameRadius, setFrameRadius] = createSignal(8)
const [frameVisible, setFrameVisible] = createSignal(true)
const [frameOpacity, setFrameOpacity] = createSignal(100)
const [frameBackground, setFrameBackground] = createSignal<string | null>(null)
const [aspectRatio, setAspectRatio] = createSignal<string | null>(null)
const [terminalType, setTerminalType] = createSignal<TerminalType>("macOs")
const [showHeader, setShowHeader] = createSignal(true)
const [showReflection, setShowReflection] = createSignal(false)
const [showWatermark, setShowWatermark] = createSignal(true)
const [shadow, setShadow] = createSignal<ShadowType>("bottom")
const [borderType, setBorderType] = createSignal<BorderType>("glass")
const [alternativeTheme, setAlternativeTheme] = createSignal(false)
const [themeId, setThemeId] = createSignal<ThemeId>("fleetDark")
const [language, setLanguage] = createSignal("TypeScript")
const [formatter, setFormatter] = createSignal("Prettier")
const [showLineNumbers, setShowLineNumbers] = createSignal(false)
const [lineNumberStart, setLineNumberStart] = createSignal(1)
const [font, setFont] = createSignal("JetBrains Mono")
const [fontWeight, setFontWeight] = createSignal(400)
const [ligatures, setLigatures] = createSignal(true)
const [presetOpen, setPresetOpen] = createSignal(false)
const [presetMenu, setPresetMenu] = createSignal<string | null>(null)
const [presets, setPresets] = createSignal<readonly Preset[]>(initialPresets)
const [menuOpen, setMenuOpen] = createSignal(false)
const [themeSearch, setThemeSearch] = createSignal("")
const [exportCount, setExportCount] = createSignal(0)
const [status, setStatus] = createSignal("")
const [readOnly] = createSignal(false)

const activeTheme = createMemo(
  () => themes.find((candidate) => candidate.id === themeId()) ?? themes[0]!,
)
const filteredThemes = createMemo(() => {
  const query = themeSearch().trim().toLowerCase()
  return query.length === 0
    ? themes
    : themes.filter((candidate) => candidate.label.toLowerCase().includes(query))
})

function space(value: number): number {
  return value * 4
}

function buttonStyle(primary = false) {
  return {
    minHeight: 30,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: primary ? colors.primary : colors.divider,
    backgroundColor: primary ? colors.primary : colors.button,
    cursor: "pointer",
    hover: { backgroundColor: primary ? colors.primaryHover : colors.buttonHover },
    active: { backgroundColor: primary ? colors.primaryActive : colors.buttonActive },
  } as const
}

function smallControlStyle(active = false) {
  return {
    ...buttonStyle(false),
    minHeight: 28,
    borderColor: active ? colors.primary : colors.divider,
    backgroundColor: active ? "#003d66" : colors.input,
  } as const
}

export const adaptiveFullScreenHeight = "codeimage-native-fullscreen"

export function Box(props: BoxProps) {
  return (
    <div
      testId={props.class === adaptiveFullScreenHeight ? "codeimage-shell" : undefined}
      style={{
        display: props.display === "inlineFlex" ? "flex" : props.display,
        flexDirection: props.flexDirection,
        width: props.width ?? (props.class === adaptiveFullScreenHeight ? "100%" : undefined),
        height: props.height ?? (props.class === adaptiveFullScreenHeight ? "100%" : undefined),
        alignItems: props.alignItems,
        justifyContent: props.justifyContent === "flex-end" ? "flexEnd" : props.justifyContent,
        padding: props.padding === undefined ? undefined : space(props.padding),
        paddingTop: props.paddingTop === undefined ? undefined : space(props.paddingTop),
        paddingLeft: props.paddingX === undefined ? undefined : space(props.paddingX),
        paddingRight: props.paddingX === undefined ? undefined : space(props.paddingX),
        flexGrow: props.flexGrow,
        minWidth: 0,
        minHeight: 0,
        backgroundColor: props.class === adaptiveFullScreenHeight ? colors.background : undefined,
      }}
    >
      {props.children}
    </div>
  )
}

export function HStack(props: ChildrenProps & { spacing?: string | number; justifyContent?: "flexEnd"; alignItems?: "center" }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: props.alignItems ?? "center",
        gap: Number(props.spacing ?? 0) * 4,
        justifyContent: props.justifyContent,
      }}
    >
      {props.children}
    </div>
  )
}

export function PortalHost(props: { ref?: ((value: PublicInstance) => PublicInstance) | undefined }) {
  return <div ref={(value) => props.ref?.(value)} style={{ position: "absolute", width: 0, height: 0 }} />
}

export function Button(props: { size?: string; theme?: string; leftIcon?: SolidElement; children?: SolidElement; onClick?: () => void }) {
  return (
    <div style={buttonStyle(false)} onClick={props.onClick}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {props.leftIcon}
        {props.children}
      </div>
    </div>
  )
}

export function useModality(): Modality {
  return "full"
}

export function getFrameState() {
  return { setScale(_value: number) {} }
}

export function getExportCanvasStore() {
  return { initCanvas(_ref: () => PublicInstance | undefined) {} }
}

export function getEditorSyncAdapter() {
  return {
    readOnly,
    clone() {
      setStatus("Cloned locally")
    },
  }
}

export function getActiveEditorStore() {
  return {
    format() {
      setStatus("Formatted locally")
    },
  }
}

export function dispatchRandomTheme() {
  const current = themes.findIndex((candidate) => candidate.id === themeId())
  const next = themes[(current + 1) % themes.length] ?? themes[0]!
  setThemeId(next.id)
  setStatus(`Theme changed to ${next.label}`)
}

function ToolbarMenu() {
  return (
    <Show when={menuOpen()}>
      <div
        testId="toolbar-menu-content"
        style={{
          position: "absolute",
          left: 16,
          top: 46,
          width: 180,
          padding: 6,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.divider,
          backgroundColor: colors.input,
        }}
      >
        <For each={["Settings", "Changelog", "GitHub ↗", "Logout"] as const}>
          {(label, index) => (
            <div
              testId={["toolbar-menu-settings", "toolbar-menu-changelog", "toolbar-menu-github", "toolbar-menu-logout"][index()]}
              style={smallControlStyle()}
            >
              <text style={{ color: colors.text, fontSize: 12 }}>{label}</text>
            </div>
          )}
        </For>
      </div>
    </Show>
  )
}

export function Toolbar(_props: { canvasRef?: unknown }) {
  return (
    <div
      testId="codeimage-toolbar"
      style={{
        position: "relative",
        height: 52,
        width: "100%",
        display: "flex",
        alignItems: "center",
        paddingLeft: 16,
        paddingRight: 16,
        backgroundColor: colors.panel,
        color: colors.white,
        flexShrink: 0,
      }}
    >
      <div
        testId="toolbar-settings"
        aria-label="Menu"
        style={{ ...smallControlStyle(menuOpen()), width: 30, paddingLeft: 0, paddingRight: 0, alignItems: "center", justifyContent: "center", borderRadius: 999 }}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <text style={{ color: colors.text, fontSize: 14 }}>⋮</text>
      </div>
      <div testId="codeimage-logo" style={{ display: "flex", alignItems: "center", marginLeft: 20, width: 134, height: 26 }}>
        <svg source={codeImageLogo} style={{ width: 134, height: 26, flexShrink: 0 }} />
      </div>
      <div testId="dashboard-link" style={{ ...smallControlStyle(false), marginLeft: 16 }}>
        <text style={{ color: colors.text, fontSize: 10 }}>▦ Dashboard</text>
      </div>
      <div style={{ flexGrow: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ShareButton showLabel={false} />
        <ExportButton />
        <div testId="user-badge" style={{ minWidth: 34, height: 30, paddingLeft: 8, paddingRight: 8, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: colors.button }}>
          <text style={{ color: colors.text, fontSize: 10, fontWeight: 700 }}>JM</text>
        </div>
      </div>
      <ToolbarMenu />
    </div>
  )
}

function SidebarSection(props: ChildrenProps & { title: string; testId: string }) {
  return (
    <div testId={props.testId} style={{ display: "flex", flexDirection: "column", flexShrink: 0, paddingBottom: 16, borderBottomWidth: 1, borderColor: colors.divider }}>
      <div style={{ height: 48, display: "flex", alignItems: "center", paddingLeft: 15, flexShrink: 0 }}>
        <text style={{ color: colors.white, fontSize: 13, fontWeight: 600 }}>{props.title}</text>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{props.children}</div>
    </div>
  )
}

function FieldRow(props: ChildrenProps & { label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "row", width: "100%", minHeight: 34, alignItems: "center", gap: 8, paddingLeft: 15, paddingRight: 8 }}>
      <div style={{ display: "flex", alignItems: "center", width: 88, flexShrink: 0, minWidth: 0 }}>
        <text style={{ color: colors.textAlt, fontSize: 11 }}>{props.label}</text>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexGrow: 1, minWidth: 0 }}>{props.children}</div>
    </div>
  )
}

function ChoiceButton(props: { testId: string; label: string; selected: boolean; onClick(): void }) {
  return (
    <div testId={props.testId} style={smallControlStyle(props.selected)} onClick={props.onClick}>
      <text style={{ color: props.selected ? colors.white : colors.textAlt, fontSize: 10 }}>{props.label}</text>
    </div>
  )
}

function ValueButton(props: { testId: string; value: string; onClick(): void }) {
  return (
    <div testId={props.testId} style={{ ...smallControlStyle(false), flexGrow: 1, justifyContent: "space-between" }} onClick={props.onClick}>
      <text style={{ color: colors.text, fontSize: 10 }}>{props.value}</text>
      <text style={{ color: colors.description, fontSize: 9 }}>⌄</text>
    </div>
  )
}

function cycleNumber(value: number, values: readonly number[], setValue: (value: number) => void) {
  const index = values.indexOf(value)
  setValue(values[(index + 1) % values.length] ?? values[0]!)
}

function FrameForm() {
  return (
    <SidebarSection title="Frame" testId="section-frame">
      <FieldRow label="Padding"><ValueButton testId="frame-padding" value={String(framePadding())} onClick={() => cycleNumber(framePadding(), [0, 16, 32, 64, 128], setFramePadding)} /></FieldRow>
      <FieldRow label="Radius">
        <For each={[0, 8, 16, 24] as const}>{(value) => <ChoiceButton testId={`frame-radius-${value}`} label={String(value)} selected={frameRadius() === value} onClick={() => setFrameRadius(value)} />}</For>
      </FieldRow>
      <FieldRow label="Visible">
        <ChoiceButton testId="frame-visible-yes" label="Yes" selected={frameVisible()} onClick={() => setFrameVisible(true)} />
        <ChoiceButton testId="frame-visible-no" label="No" selected={!frameVisible()} onClick={() => setFrameVisible(false)} />
      </FieldRow>
      <Show when={frameVisible()}>
        <FieldRow label="Opacity"><ValueButton testId="frame-opacity" value={`${frameOpacity()}%`} onClick={() => setFrameOpacity((value) => value === 100 ? 75 : value === 75 ? 50 : 100)} /></FieldRow>
        <FieldRow label="Background"><ValueButton testId="frame-background" value={frameBackground() ?? "Theme"} onClick={() => setFrameBackground((value) => value === null ? "#194176" : null)} /></FieldRow>
      </Show>
      <FieldRow label="Aspect ratio"><ValueButton testId="frame-aspect-ratio" value={aspectRatio() ?? "Auto"} onClick={() => setAspectRatio((value) => value === null ? "16/9" : value === "16/9" ? "1/1" : null)} /></FieldRow>
    </SidebarSection>
  )
}

function WindowForm() {
  return (
    <SidebarSection title="Terminal" testId="section-terminal">
      <FieldRow label="Background type">
        <ChoiceButton testId="terminal-theme-default" label="Default" selected={!alternativeTheme()} onClick={() => setAlternativeTheme(false)} />
        <ChoiceButton testId="terminal-theme-alternative" label="Alternative" selected={alternativeTheme()} onClick={() => setAlternativeTheme(true)} />
      </FieldRow>
      <FieldRow label="Header">
        <ChoiceButton testId="terminal-header-yes" label="Yes" selected={showHeader()} onClick={() => setShowHeader(true)} />
        <ChoiceButton testId="terminal-header-no" label="No" selected={!showHeader()} onClick={() => setShowHeader(false)} />
      </FieldRow>
      <Show when={showHeader()}>
        <FieldRow label="Window"><ValueButton testId="terminal-window" value={terminalType() === "macOs" ? "macOS" : terminalType() === "windows" ? "Windows" : terminalType() === "macOsGrayTheme" ? "macOS Gray" : "macOS Outline"} onClick={() => {
          const order: readonly TerminalType[] = ["macOs", "macOsGrayTheme", "macOsOutlineTheme", "windows"]
          const index = order.indexOf(terminalType())
          setTerminalType(order[(index + 1) % order.length] ?? "macOs")
        }} /></FieldRow>
      </Show>
      <FieldRow label="Reflection">
        <ChoiceButton testId="terminal-reflection-show" label="Show" selected={showReflection()} onClick={() => setShowReflection(true)} />
        <ChoiceButton testId="terminal-reflection-hide" label="Hide" selected={!showReflection()} onClick={() => setShowReflection(false)} />
      </FieldRow>
      <FieldRow label="Watermark">
        <ChoiceButton testId="terminal-watermark-show" label="Show" selected={showWatermark()} onClick={() => setShowWatermark(true)} />
        <ChoiceButton testId="terminal-watermark-hide" label="Hide" selected={!showWatermark()} onClick={() => setShowWatermark(false)} />
      </FieldRow>
      <FieldRow label="Shadow"><ValueButton testId="terminal-shadow" value={shadow() === "bottom" ? "Bottom" : "None"} onClick={() => setShadow((value) => value === "bottom" ? "none" : "bottom")} /></FieldRow>
      <FieldRow label="Border"><ValueButton testId="terminal-border" value={borderType() === "glass" ? "Glass" : "None"} onClick={() => setBorderType((value) => value === "glass" ? "none" : "glass")} /></FieldRow>
    </SidebarSection>
  )
}

function EditorForm() {
  return (
    <SidebarSection title="Editor" testId="section-editor">
      <FieldRow label="Language"><ValueButton testId="editor-language" value={language()} onClick={() => setLanguage((value) => value === "TypeScript" ? "JavaScript" : "TypeScript")} /></FieldRow>
      <FieldRow label="Theme"><ValueButton testId="editor-theme" value={activeTheme().label} onClick={dispatchRandomTheme} /></FieldRow>
      <FieldRow label="Formatter"><ValueButton testId="editor-formatter" value={formatter()} onClick={() => setFormatter((value) => value === "Prettier" ? "Biome" : "Prettier")} /></FieldRow>
      <FieldRow label="Line numbers">
        <ChoiceButton testId="editor-line-numbers-show" label="Show" selected={showLineNumbers()} onClick={() => setShowLineNumbers(true)} />
        <ChoiceButton testId="editor-line-numbers-hide" label="Hide" selected={!showLineNumbers()} onClick={() => setShowLineNumbers(false)} />
      </FieldRow>
      <Show when={showLineNumbers()}><FieldRow label="Line number start"><ValueButton testId="editor-line-number-start" value={String(lineNumberStart())} onClick={() => setLineNumberStart((value) => value >= 3 ? 1 : value + 1)} /></FieldRow></Show>
    </SidebarSection>
  )
}

function FontForm() {
  return (
    <SidebarSection title="Font" testId="section-font">
      <FieldRow label="Font"><ValueButton testId="editor-font" value={font()} onClick={() => setFont((value) => value === "JetBrains Mono" ? "Fira Code" : "JetBrains Mono")} /></FieldRow>
      <FieldRow label="Font weight"><ValueButton testId="editor-font-weight" value={String(fontWeight())} onClick={() => setFontWeight((value) => value === 400 ? 500 : value === 500 ? 700 : 400)} /></FieldRow>
      <FieldRow label="Ligatures">
        <ChoiceButton testId="editor-ligatures-yes" label="Yes" selected={ligatures()} onClick={() => setLigatures(true)} />
        <ChoiceButton testId="editor-ligatures-no" label="No" selected={!ligatures()} onClick={() => setLigatures(false)} />
      </FieldRow>
    </SidebarSection>
  )
}

function applyPreset(preset: Preset) {
  setThemeId(preset.themeId)
  setFramePadding(preset.padding)
  setFrameRadius(preset.radius)
  setShowHeader(preset.showHeader)
  setTerminalType(preset.terminalType)
  setStatus(`Preset selected: ${preset.name}`)
}

function PresetPreviewCard(props: { preset: Preset; index: number }) {
  const theme = () => themes.find((candidate) => candidate.id === props.preset.themeId) ?? themes[0]!
  return (
    <div testId={`preset-card-${props.index}`} style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 16 }} onClick={() => applyPreset(props.preset)}>
      <div style={{ position: "relative", minHeight: 120, padding: 14, borderRadius: 12, background: theme().preview, overflow: "hidden" }}>
        <div style={{ minHeight: 92, borderRadius: 8, backgroundColor: theme().terminal, padding: 12, display: "flex", flexDirection: "column", gap: 5 }}>
          <text style={{ color: theme().keyword, fontSize: 9 }}>function Preview() {"{"}</text>
          <text style={{ color: theme().number, fontSize: 9 }}>{"  "}const count = 0;</text>
          <text style={{ color: theme().string, fontSize: 9 }}>{"  "}return &quot;CodeImage&quot;;</text>
          <text style={{ color: theme().keyword, fontSize: 9 }}>{"}"}</text>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <text style={{ color: colors.text, fontSize: 11, fontWeight: 600 }}>{props.preset.name}</text>
          <text testId={`preset-card-${props.index}-updated`} style={{ color: colors.description, fontSize: 9 }}>{props.preset.updated}</text>
        </div>
        <div testId={`preset-card-${props.index}-menu`} style={{ ...smallControlStyle(presetMenu() === props.preset.id), width: 28, paddingLeft: 0, paddingRight: 0, justifyContent: "center" }} onClick={() => setPresetMenu((value) => value === props.preset.id ? null : props.preset.id)}>
          <text style={{ color: colors.text, fontSize: 12 }}>•••</text>
        </div>
      </div>
      <Show when={presetMenu() === props.preset.id}>
        <div testId={`preset-card-${props.index}-menu-content`} style={{ display: "flex", flexDirection: "column", gap: 4, padding: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.input }}>
          <For each={["Update", "Rename", "Share", "Delete"] as const}>{(action) => (
            <div testId={`preset-action-${action.toLowerCase()}`} style={smallControlStyle()} onClick={() => setStatus(`${action} preset selected`)}>
              <text style={{ color: colors.text, fontSize: 10 }}>{action}</text>
            </div>
          )}</For>
        </div>
      </Show>
      <Show when={props.preset.sync}>
        <div testId={`preset-card-${props.index}-sync`} style={{ ...buttonStyle(false), width: "100%", justifyContent: "center" }} onClick={() => setStatus("Save in your account selected")}>
          <text style={{ color: colors.text, fontSize: 10 }}>☁ Save in your account</text>
        </div>
      </Show>
    </div>
  )
}

function PresetSwitcher() {
  return (
    <Show when={presetOpen()}>
      <div testId="preset-panel" style={{ width: 280, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", overflowY: "scroll", overflowX: "hidden", paddingRight: 8, borderLeftWidth: 1, borderColor: colors.divider, backgroundColor: colors.panel, color: colors.white }}>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", paddingLeft: 16, paddingRight: 8 }}>
          <div style={{ minHeight: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <text testId="preset-title" style={{ color: colors.white, fontSize: 13, fontWeight: 600 }}>Your presets</text>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div testId="preset-add" style={buttonStyle(true)} onClick={() => {
                const index = presets().length + 1
                setPresets((items) => [...items, { ...initialPresets[0]!, id: `preset-${index}`, name: `Preset ${index}`, updated: "Updated just now" }])
              }}><text style={{ color: colors.white, fontSize: 10 }}>Add preset</text></div>
              <div testId="preset-close" aria-label="Close" style={{ ...smallControlStyle(), width: 28, paddingLeft: 0, paddingRight: 0, justifyContent: "center" }} onClick={() => setPresetOpen(false)}><text style={{ color: colors.text, fontSize: 12 }}>×</text></div>
            </div>
          </div>
          <div style={{ borderBottomWidth: 1, borderColor: colors.divider, paddingTop: 16 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16 }}>
            <For each={presets()}>{(preset, index) => <PresetPreviewCard preset={preset} index={index()} />}</For>
          </div>
        </div>
      </div>
    </Show>
  )
}

export function EditorLeftSidebar() {
  return (
    <>
      <div testId="editor-left-sidebar" style={{ width: 280, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", overflowY: "scroll", overflowX: "hidden", paddingRight: 8, borderRightWidth: 1, borderColor: colors.divider, backgroundColor: colors.panel, color: colors.white }}>
        <div style={{ paddingLeft: 15, paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div testId="preset-toggle" style={{ ...buttonStyle(false), width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setPresetOpen((open) => !open)}>
            <text style={{ color: colors.text, fontSize: 11 }}>◐ Show your presets</text>
          </div>
        </div>
        <FrameForm />
        <WindowForm />
        <EditorForm />
        <FontForm />
      </div>
      <PresetSwitcher />
    </>
  )
}

export function Canvas(props: ChildrenProps) {
  return (
    <div style={{ display: "flex", width: "100%", flexGrow: 1, overflow: "hidden", backgroundColor: colors.background, paddingLeft: 4, paddingRight: 4 }}>
      <div testId="codeimage-canvas" style={{ height: "100%", flexGrow: 1, position: "relative", backgroundColor: colors.background, overflow: "hidden", display: "flex", flexDirection: "column", borderRadius: 22, borderWidth: 1, borderColor: colors.divider }}>
        {props.children}
      </div>
    </div>
  )
}

export function SuspenseEditorItem(props: ChildrenProps & { fallback?: SolidElement }) {
  return <>{props.children}</>
}

export function KeyboardShortcuts() {
  return <div style={{ paddingTop: 4, paddingBottom: 4, paddingLeft: 8, paddingRight: 8, borderRadius: 6, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.input }}><text style={{ color: colors.textAlt, fontSize: 10 }}>⌘ K</text></div>
}

export function FrameHandler(props: ChildrenProps & { onScaleChange?: (value: number) => void }) {
  return <div style={{ flexGrow: 1, minHeight: 0, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflow: "hidden" }}>{props.children}</div>
}

function syntaxColor(line: string): string {
  if (line.trim().startsWith("//")) return activeTheme().comment
  if (line.includes("function") || line.includes("const") || line.includes("return")) return activeTheme().keyword
  if (/\d/.test(line)) return activeTheme().number
  if (line.includes('"') || line.includes("'")) return activeTheme().string
  return activeTheme().text
}

function CodeLine(props: { line: string; index: number }) {
  return (
    <div style={{ display: "flex", minHeight: 23, alignItems: "center" }}>
      <Show when={showLineNumbers()}>
        <div style={{ width: 38, flexShrink: 0, display: "flex", justifyContent: "flexEnd", paddingRight: 10 }}><text testId={`line-number-${props.index}`} style={{ color: "#5d5d5d", fontSize: 11, fontWeight: 600 }}>{lineNumberStart() + props.index - 1}</text></div>
      </Show>
      <text style={{ color: syntaxColor(props.line), fontFamily: font(), fontSize: 13, fontWeight: fontWeight() }}>{props.line}</text>
    </div>
  )
}

function TerminalHeader() {
  return (
    <Show when={showHeader()}>
      <div testId="terminal-header" style={{ minHeight: 42, display: "flex", alignItems: "center", paddingLeft: 14, paddingRight: 14, borderBottomWidth: borderType() === "glass" ? 1 : 0, borderColor: borderType() === "glass" ? colors.glass : colors.divider, backgroundColor: terminalType() === "macOsGrayTheme" ? "#282828" : activeTheme().terminal }}>
        <Show when={terminalType() !== "windows"}><div style={{ display: "flex", gap: 7, alignItems: "center" }}><div style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: "#ff5f57" }} /><div style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: "#febc2e" }} /><div style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: "#28c840" }} /></div></Show>
        <Show when={terminalType() === "windows"}><text style={{ color: colors.textAlt, fontSize: 11 }}>Terminal</text></Show>
        <div style={{ flexGrow: 1 }} />
        <text style={{ color: colors.description, fontSize: 10 }}>index.tsx</text>
      </div>
    </Show>
  )
}

export function ManagedFrame() {
  return (
    <div testId="preview-frame" style={{ position: "relative", width: 650, maxWidth: "100%", minHeight: 430, padding: framePadding(), borderRadius: frameRadius(), opacity: frameVisible() ? frameOpacity() / 100 : 0, background: frameBackground() === null ? activeTheme().preview : undefined, backgroundColor: frameBackground() ?? undefined, borderWidth: borderType() === "glass" ? 1 : 0, borderColor: borderType() === "glass" ? colors.glass : colors.divider, boxShadow: shadow() === "bottom" ? { offsetX: 0, offsetY: 18, blurRadius: 34, spreadRadius: 0, color: "#00000066" } : undefined }}>
      <div testId="code-window" style={{ position: "relative", width: "100%", minHeight: 300, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: frameRadius(), borderWidth: borderType() === "glass" ? 1 : 0, borderColor: colors.glass, backgroundColor: activeTheme().terminal }}>
        <TerminalHeader />
        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", paddingTop: 18, paddingBottom: 18, paddingLeft: 18, paddingRight: 18 }}><For each={sourceCode}>{(line, index) => <CodeLine line={line} index={index() + 1} />}</For></div>
        <Show when={showReflection()}><div style={{ position: "absolute", top: 0, right: 0, width: 70, height: "100%", opacity: 0.12, backgroundColor: colors.white }} /></Show>
        <Show when={showWatermark()}><text testId="terminal-watermark" style={{ position: "absolute", right: 24, bottom: 18, color: colors.description, fontSize: 9 }}>CodeImage</text></Show>
      </div>
      <Show when={aspectRatio()}><text testId="aspect-ratio-label" style={{ position: "absolute", left: 8, bottom: 6, color: colors.white, fontSize: 9 }}>{aspectRatio()}</text></Show>
    </div>
  )
}

export function PreviewFrame(props: { ref?: ((value: PublicInstance) => PublicInstance) | undefined }) {
  return <div ref={(value) => props.ref?.(value)} style={{ position: "absolute", width: 0, height: 0 }} />
}

export function FrameSkeleton() {
  return <div style={{ width: 520, height: 320, borderRadius: 18, backgroundColor: colors.panel }} />
}

export function FrameToolbar(_props: { frameRef?: unknown }) {
  return (
    <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div testId="frame-toolbar" style={{ display: "flex", justifyContent: "flexEnd", padding: 10, minHeight: 50, gap: 8, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.divider, pointerEvents: "auto" }}>
        <ExportSettingsButton />
        <div testId="copy-button" style={buttonStyle(false)} onClick={() => setStatus("Copied preview locally")}><text style={{ color: colors.text, fontSize: 10 }}>Copy</text></div>
        <div testId="randomize-button" style={buttonStyle(false)} onClick={dispatchRandomTheme}><text style={{ color: colors.text, fontSize: 10 }}>◐ Randomize</text></div>
        <div testId="format-button" style={buttonStyle(false)} onClick={() => getActiveEditorStore().format()}><text style={{ color: colors.text, fontSize: 10 }}>✦ Format</text></div>
        <ExportInNewTabButton />
      </div>
    </div>
  )
}

function FooterLink(props: { testId: string; label: string }) {
  return <div testId={props.testId} style={{ cursor: "pointer" }} onClick={() => setStatus(`${props.label} selected`)}><text style={{ color: colors.description, fontSize: 9 }}>{props.label}</text></div>
}

export function Footer() {
  return (
    <>
      <div testId="codeimage-footer" style={{ position: "absolute", bottom: 0, right: 0, display: "flex", justifyContent: "flexEnd", padding: 4, gap: 20 }}>
        <FooterLink testId="footer-better-comments" label="Better Comments for GitHub" />
        <FooterLink testId="footer-github" label="GitHub" />
        <FooterLink testId="footer-issues" label="Issue & Feedback" />
        <FooterLink testId="footer-releases" label="Releases" />
        <FooterLink testId="footer-whats-new" label="🎉 What's new</text>" />
      </div>
      <text testId="codeimage-status" style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}>{status()}</text>
      <text testId="export-count" style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}>{exportCount()}</text>
    </>
  )
}

export function Sidebar(props: ChildrenProps & { position?: "left" | "right" }) {
  const side = props.position ?? "right"
  return (
    <div testId="theme-sidebar" style={{ width: 280, height: "100%", flexShrink: 0, overflowY: "scroll", overflowX: "hidden", paddingRight: 8, borderLeftWidth: side === "right" ? 1 : 0, borderRightWidth: side === "left" ? 1 : 0, borderColor: colors.divider, backgroundColor: colors.panel, color: colors.white }}>
      {props.children}
    </div>
  )
}

function ThemeCard(props: { theme: Theme }) {
  const selected = () => themeId() === props.theme.id
  return (
    <div testId={`theme-${props.theme.id}`} style={{ width: "100%", overflow: "hidden", position: "relative", borderRadius: 12, borderWidth: 1, borderColor: selected() ? colors.primary : colors.divider, background: props.theme.preview, cursor: "pointer" }} onClick={() => {
      setThemeId(props.theme.id)
      setStatus(`Theme changed to ${props.theme.label}`)
    }}>
      <Show when={selected()}><div testId={`theme-selected-${props.theme.id}`} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderWidth: 2, borderColor: colors.primary, borderRadius: 12, pointerEvents: "none" }} /></Show>
      <div style={{ margin: 14, minHeight: 118, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: "100%", minHeight: 92, borderRadius: 8, backgroundColor: props.theme.terminal, padding: 10, display: "flex", flexDirection: "column", gap: 4, boxShadow: { offsetX: 0, offsetY: 10, blurRadius: 20, spreadRadius: 0, color: "#00000055" } }}>
          <text style={{ color: props.theme.comment, fontSize: 8 }}>// Just a code example</text>
          <text style={{ color: props.theme.keyword, fontSize: 8 }}>function Preview() {"{"}</text>
          <text style={{ color: props.theme.text, fontSize: 8 }}>{"  "}const [count, setCount] =</text>
          <text style={{ color: props.theme.number, fontSize: 8 }}>{"    "}createSignal(0);</text>
          <text style={{ color: props.theme.keyword, fontSize: 8 }}>{"}"}</text>
        </div>
      </div>
      <div style={{ padding: 12, justifyContent: "center", alignItems: "center", backgroundColor: "#00000066", display: "flex", pointerEvents: "none" }}>
        <text testId={`theme-label-${props.theme.id}`} style={{ color: colors.white, fontSize: 11, fontWeight: 600 }}>{props.theme.label}</text>
      </div>
    </div>
  )
}

export function ThemeSwitcher(_props: { orientation?: "vertical" }) {
  return (
    <div testId="theme-switcher" style={{ display: "flex", flexDirection: "column", gap: 32, padding: 16, height: "100%" }}>
      <input testId="theme-search" value={themeSearch()} placeholder="Search themes" onChange={(event) => setThemeSearch(event.value ?? "")} style={{ width: "100%", minHeight: 30, paddingLeft: 10, paddingRight: 10, borderRadius: 7, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.input, color: colors.text }} />
      <For each={filteredThemes()}>{(theme) => <ThemeCard theme={theme} />}</For>
    </div>
  )
}

export function ExportButton(_props: { canvasRef?: unknown }) {
  return <div testId="export-button" style={buttonStyle(true)} onClick={() => {
    const next = exportCount() + 1
    setExportCount(next)
    setStatus(`Exported ${next} preview`)
  }}><text style={{ color: colors.white, fontSize: 10, fontWeight: 700 }}>Export</text></div>
}

export function ExportInNewTabButton(_props: { canvasRef?: unknown; size?: string }) {
  return <div testId="open-preview-button" style={buttonStyle(false)} onClick={() => setStatus("Opened preview locally")}><text style={{ color: colors.text, fontSize: 10 }}>Open</text></div>
}

export function ExportSettingsButton() {
  return <div testId="export-settings-button" style={buttonStyle(false)} onClick={() => setStatus("Export settings opened locally")}><text style={{ color: colors.text, fontSize: 10 }}>Settings</text></div>
}

export function ShareButton(props: { showLabel?: boolean }) {
  return <div testId="share-button" style={buttonStyle(false)} onClick={() => setStatus("Share link prepared locally")}><text style={{ color: colors.text, fontSize: 10 }}>{props.showLabel === false ? "↗" : "Share"}</text></div>
}

export function ColorSwatchIcon() {
  return <text style={{ color: colors.text, fontSize: 10 }}>◐</text>
}

export function SparklesIcon() {
  return <text style={{ color: colors.text, fontSize: 10 }}>✦</text>
}

export function EditorReadOnlyBanner(props: { onClone: () => void }) {
  return <div style={{ padding: 8, backgroundColor: colors.panel }} onClick={props.onClone}><text style={{ color: colors.text, fontSize: 10 }}>Read only · Clone</text></div>
}

export function BottomBar(_props: { portalHostRef?: unknown }) {
  return <></>
}
