import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  type Element as SolidElement,
} from "solid-js"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  animate,
  useGpuixRequired,
  useWindowInsets,
  type PublicInstance,
  type StyleDesc,
} from "gpuix-solid"
import { SafeMdxContent } from "./mdx"

export { SafeMdxContent } from "./mdx"

const C = {
  canvas: "#1A1A1A",
  sidebar: "#181818",
  raised: "#232323",
  composer: "#212121",
  overlay: "#E6EAF20D",
  overlayStrong: "#E6EAF217",
  item: "#F0F0F00F",
  border: "#E6EAF212",
  borderStrong: "#E6EAF224",
  sidebarBorder: "#292929",
  text: "#E2E2E2",
  secondary: "#A3A3A3",
  tertiary: "#7D7D7D",
  ghost: "#575757",
  accent: "#E2795B",
  inverse: "#E7E9EC",
  onInverse: "#17181C",
  codeText: "#E0A882",
} as const

const SIDEBAR_WIDTH = 252
const TRAFFIC_LIGHT_CLEARANCE = process.platform === "darwin" ? 86 : 8
const CONTENT_MAX_WIDTH = 720
const TITLEBAR_HEIGHT = 48
const FONT_SANS = process.platform === "darwin" ? "Helvetica" : "Arial"

function lineIcon(path: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`
}

const ICONS = {
  compose: lineIcon("M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"),
  search: lineIcon("m21 21-4.35-4.35 M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"),
  sidebar: lineIcon("M3 5h18v14H3Z M9 5v14"),
  panelRight: lineIcon("M3 5h18v14H3Z M15 5v14"),
  arrowLeft: lineIcon("M19 12H5 m6-6-6 6 6 6"),
  arrowRight: lineIcon("M5 12h14 m-6-6 6 6-6 6"),
  folder: lineIcon("M3 6h7l2 2h9v10H3Z"),
  settings: lineIcon("M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 2v3 M12 19v3 M2 12h3 M19 12h3"),
  gitBranch: lineIcon("M6 3v12a3 3 0 0 0 3 3h6 M18 6v6 M15 9h6"),
  laptop: lineIcon("M4 5h16v11H4Z M2 19h20"),
  lockOpen: lineIcon("M7 10V7a5 5 0 0 1 9-3 M5 10h14v10H5Z"),
  lock: lineIcon("M7 10V7a5 5 0 0 1 10 0v3 M5 10h14v10H5Z"),
  list: lineIcon("M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01"),
  zap: lineIcon("m13 2-9 12h7l-1 8 9-12h-7Z"),
  pencil: lineIcon("M4 20l4-1 11-11-3-3L5 16Z"),
  chevronDown: lineIcon("m6 9 6 6 6-6"),
  chevronRight: lineIcon("m9 6 6 6-6 6"),
  listFilter: lineIcon("M4 6h16 M7 12h10 M10 18h4"),
  sparkle: lineIcon("m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z"),
  wrench: lineIcon("M14 6a4 4 0 0 0-5 5L3 17l4 4 6-6a4 4 0 0 0 5-5l-3 2-3-3Z"),
  send: lineIcon("M12 19V5 m-6 6 6-6 6 6"),
  copy: lineIcon("M8 8h11v11H8Z M5 16H4V5h11v1"),
  check: lineIcon("m5 12 4 4 10-10"),
  retry: lineIcon("M20 7v5h-5 M19 12a7 7 0 1 0-2 5"),
  thumbsUp: lineIcon("M7 10v10H3V10Z M7 18h9l3-7-2-2h-5l1-5-2-1-4 7"),
  thumbsDown: lineIcon("M7 14V4H3v10Z M7 6h9l3 7-2 2h-5l1 5-2 1-4-7"),
  share: lineIcon("M12 3v12 m-5-7 5-5 5 5 M5 13v7h14v-7"),
  more: lineIcon("M5 12h.01 M12 12h.01 M19 12h.01"),
} as const

type IconName = keyof typeof ICONS

interface IconProps {
  name: IconName
  size?: number | undefined
  color: string
}

function Icon(props: IconProps): SolidElement {
  return (
    <svg
      source={ICONS[props.name]}
      style={{
        width: props.size ?? 14,
        height: props.size ?? 14,
        flexShrink: 0,
        color: props.color,
      }}
    />
  )
}

const CHAT_THEME = {
  text: C.text,
  textMuted: C.secondary,
  textFaint: C.tertiary,
  textDim: C.secondary,
  border: C.border,
  bg: C.canvas,
  accent: C.accent,
  caret: C.accent,
  fontSans: FONT_SANS,
  codeText: C.codeText,
  codeWash: "#E6EAF214",
  metrics: {
    mdTextSize: 14,
    mdLineHeight: 22,
    mdBlockGap: 14,
    mdHeadingSizes: [20, 16, 14, 14],
    mdHeadingLineHeights: [28, 24, 22, 22],
    codeTextSize: 12.5,
    codeLineHeight: 20,
    diffLineHeight: 20,
    diffFileHeaderHeight: 34,
  },
}

interface Conversation {
  id: string
  title: string
  group: string
  project: string
  time: string
}

const CONVERSATIONS: readonly Conversation[] = [
  { id: "c1", title: "give me a quick overview", group: "Yesterday", project: "gpuix-solid", time: "16m" },
  { id: "c2", title: "Native SDK vs GPUI comparison", group: "Yesterday", project: "No project", time: "14h" },
  { id: "c3", title: "Solid renderer architecture", group: "Yesterday", project: "gpuix-solid", time: "15h" },
  { id: "c4", title: "check memory optimization", group: "This Month", project: "gpuix-solid", time: "2d" },
  { id: "c5", title: "virtual list scroll anchors", group: "This Month", project: "gpuix-solid", time: "4d" },
  { id: "c6", title: "Kobalte native parity", group: "This Month", project: "gpuix-solid", time: "6d" },
]

const MODELS = [
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
  { id: "deepseek-v4", label: "DeepSeek V4" },
  { id: "opus-4.6", label: "Claude Opus 4.6" },
  { id: "sonnet-4.6", label: "Claude Sonnet 4.6" },
  { id: "gpt-5.4", label: "GPT-5.4" },
] as const

const REASONING = [
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
] as const

const ACCESS = [
  { id: "ask", label: "Supervised", description: "Ask before every tool call", icon: "lock" as const },
  { id: "edits", label: "Auto-accept edits", description: "Edit files without asking", icon: "pencil" as const },
  { id: "auto", label: "Auto", description: "Run most tools without asking", icon: "sparkle" as const },
  { id: "full", label: "Full access", description: "No permission prompts", icon: "lockOpen" as const },
] as const

const PROJECTS = [
  { id: "gpuix-solid", label: "gpuix-solid" },
  { id: "example-app", label: "example-app" },
  { id: "none", label: "No project" },
] as const

const WORKSPACES = [
  { id: "local", label: "Local", icon: "laptop" as const },
  { id: "worktree", label: "New worktree", icon: "gitBranch" as const },
] as const

const BRANCHES = [
  { id: "main", label: "main" },
  { id: "feat-upstream-parity", label: "feat/upstream-example-parity" },
  { id: "chat-example", label: "chat-example" },
] as const

const OVERVIEW = "**GPUix Solid** is a Solid renderer for GPUI, Zed's GPU-accelerated UI framework. It renders native desktop interfaces through Metal, DirectX, or Vulkan. No Electron or web view."
const ARCHITECTURE = "Solid sends host mutations through napi-rs. Rust keeps the retained tree and translates it into GPUI elements for each frame."
const SELECTION = "Selection is rebuilt from the paint pass. Each string registers in document order, so a drag can cross elements."
const GUTTER = "The gutter width follows the largest line number, so a five-digit line no longer hits the accent bar."
const HOT_RELOAD = "**No.** A `.node` cannot unload. The loop rebuilds and restarts."
const SKILLS = "Solid-specific examples cover Kobalte, Tailwind, a dashboard, and a browser DAW in addition to upstream GPUIX parity fixtures."
const WIRE_MODELS = "The picker is ordinary Solid state driving native GPUIX Select primitives."

const SELECTION_CODE = `pub fn resolve_spans(
    elements: &[(&str, &str)],
    a: (usize, usize),
    b: (usize, usize),
) -> Vec<Span> {
    let (start, end) = if a <= b { (a, b) } else { (b, a) };
    let mut spans = Vec::new();
    for (ei, (key, text)) in elements.iter().enumerate().take(end.0 + 1).skip(start.0) {
        let from = if ei == start.0 { start.1 } else { 0 };
        let to = if ei == end.0 { end.1 } else { text.len() };
        if from < to { spans.push(Span { key: key.to_string(), range: from..to }); }
    }
    spans
}`

const GUTTER_DIFF = [
  "diff --git a/packages/native/src/diff/mod.rs b/packages/native/src/diff/mod.rs",
  "--- a/packages/native/src/diff/mod.rs",
  "+++ b/packages/native/src/diff/mod.rs",
  "@@ -78,5 +78,7 @@ impl FileDiff {",
  "-pub fn gutter_width(file: &FileDiff) -> f32 {",
  "-    GUTTER_WIDTH",
  "+pub fn gutter_width(file: &FileDiff, metrics: &Metrics) -> f32 {",
  "+    let digits = file.max_line.max(1).ilog10() + 1;",
  "+    (digits as f32 * 6.6 + 14.0).max(metrics.diff_gutter_width)",
  " }",
].join("\n")

const SAFE_MDX_STRESS = `# Solid-composed Markdown

This message uses **safe-mdx**, *styled spans*, ~~deleted text~~, an
\`inline code value\`, and [a link](https://github.com/holocron-hq/safe-mdx).

> The parser runs in TypeScript. Every Markdown node becomes a normal Solid component.
>
> GPUix Solid renders the resulting \`div\`, \`text\`, and \`code\` tree.

- nested **inline formatting** inside a list
- a second item with a long sentence that must wrap without leaving the transcript column
- [x] a GFM task item

| Path | Renderer | Native Markdown element | Host nodes | Scroll | When to use |
|:-----|:---------|:------------------------|-----------:|:-------|:------------|
| safe-mdx parse | Solid tree of div and text | no | many | overflow-x on this grid | Framework-composed Markdown and custom components |
| pulldown-cmark | one native markdown node | yes | one | overflow-x inside Rust | Cheapest native Markdown surface |
| grid table | one CSS grid of cells | no | one per cell | overflow-x on the flex parent | Wide comparison tables |

\`\`\`typescript
const tree = mdxParse(source)
return renderMdxTree(tree)
\`\`\`

<Callout title="Custom MDX component">
  MDX components map to ordinary GPUix Solid components.
</Callout>`

type TurnKind = "user" | "fold" | "markdown" | "code" | "diff"

interface TurnTemplate {
  kind: TurnKind
  text?: string | undefined
  duration?: string | undefined
  source?: string | undefined
  language?: string | undefined
  patch?: string | undefined
}

interface Turn extends TurnTemplate {
  id: string
}

const TURN_TEMPLATES: readonly TurnTemplate[] = [
  { kind: "user", text: "give me a quick overview" },
  { kind: "fold", duration: "Worked for 10 seconds" },
  { kind: "markdown", source: OVERVIEW },
  { kind: "user", text: "How does Solid reach GPUI?" },
  { kind: "fold", duration: "Worked for 6 seconds" },
  { kind: "markdown", source: ARCHITECTURE },
  { kind: "user", text: "How does cross-element text selection work?" },
  { kind: "fold", duration: "Worked for 14 seconds" },
  { kind: "markdown", source: SELECTION },
  { kind: "code", language: "rust", source: SELECTION_CODE },
  { kind: "user", text: "Make the diff gutter width adapt to the largest line number." },
  { kind: "fold", duration: "Worked for 8 seconds" },
  { kind: "markdown", source: GUTTER },
  { kind: "diff", patch: GUTTER_DIFF },
  { kind: "user", text: "Do I get hot reload when I edit the Rust side?" },
  { kind: "markdown", source: HOT_RELOAD },
  { kind: "user", text: "How do Solid-specific examples show up?" },
  { kind: "markdown", source: SKILLS },
  { kind: "user", text: "Which models should I wire up?" },
  { kind: "markdown", source: WIRE_MODELS },
]

function expandTurns(count: number): Turn[] {
  const turns: Turn[] = []
  for (let index = 0; index < count; index += 1) {
    const template = TURN_TEMPLATES[index % TURN_TEMPLATES.length]
    if (template) turns.push({ ...template, id: `turn-${index}` })
  }
  return turns
}

interface IconButtonProps {
  icon: IconName
  onClick?: (() => void) | undefined
  dimmed?: boolean | undefined
  size?: number | undefined
  testId?: string | undefined
}

function IconButton(props: IconButtonProps): SolidElement {
  const icon = <Icon name={props.icon} size={props.size} color={C.tertiary} />
  const style: StyleDesc = {
    width: 26,
    height: 26,
    flexShrink: 0,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    opacity: props.dimmed ? 0.35 : 1,
    hover: { backgroundColor: props.dimmed ? "#00000000" : C.overlay },
    active: { backgroundColor: props.dimmed ? "#00000000" : C.overlayStrong },
  }
  if (props.testId !== undefined) {
    return <div testId={props.testId} style={style} onClick={() => props.onClick?.()}>{icon}</div>
  }
  return <div style={style} onClick={() => props.onClick?.()}>{icon}</div>
}

function SidebarAction(props: { icon: IconName; label: string }): SolidElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 32,
        paddingLeft: 4,
        paddingRight: 4,
        borderRadius: 7,
        cursor: "pointer",
        hover: { backgroundColor: C.item },
        active: { backgroundColor: C.overlayStrong },
      }}
    >
      <div style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={props.icon} size={14} color={C.secondary} />
      </div>
      <text style={{ fontSize: 13, color: C.secondary }}>{props.label}</text>
    </div>
  )
}

interface ConversationGroup {
  name: string
  items: Conversation[]
}

function Sidebar(props: { activeId: string; onSelect(id: string): void; onCollapse(): void }): SolidElement {
  const groups = createMemo<ConversationGroup[]>(() => {
    const result: ConversationGroup[] = []
    for (const conversation of CONVERSATIONS) {
      const last = result[result.length - 1]
      if (last?.name === conversation.group) last.items.push(conversation)
      else result.push({ name: conversation.group, items: [conversation] })
    }
    return result
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", width: SIDEBAR_WIDTH, flexShrink: 0, height: "100%", backgroundColor: C.sidebar, userSelect: "none" }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", height: TITLEBAR_HEIGHT, flexShrink: 0 }}>
        <div style={{ width: TRAFFIC_LIGHT_CLEARANCE, height: "100%", flexShrink: 0 }} />
        <IconButton icon="sidebar" size={16} testId="sidebar-collapse" onClick={props.onCollapse} />
        <div style={{ display: "flex", flexDirection: "row", gap: 2, marginLeft: 6 }}>
          <IconButton icon="arrowLeft" dimmed />
          <IconButton icon="arrowRight" dimmed />
        </div>
      </div>
      <div style={{ paddingLeft: 10, paddingRight: 10 }}><SidebarAction icon="compose" label="New Task" /></div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0, overflowY: "scroll", paddingLeft: 10, paddingRight: 10 }}>
        <div style={{ paddingBottom: 6 }}><SidebarAction icon="search" label="Search" /></div>
        <For each={groups()}>
          {(group, groupIndex) => (
            <div style={{ display: "flex", flexDirection: "column", paddingBottom: 10 }}>
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", height: 28, paddingLeft: 8, paddingRight: 8 }}>
                <text style={{ fontSize: 13, fontWeight: 500, color: C.secondary, flexGrow: 1 }}>{group.name}</text>
                <Show when={groupIndex() === 0}><Icon name="listFilter" size={14} color={C.secondary} /></Show>
              </div>
              <For each={group.items}>
                {(conversation) => (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      paddingLeft: 8,
                      paddingRight: 8,
                      paddingTop: 7,
                      paddingBottom: 7,
                      borderRadius: 7,
                      cursor: "pointer",
                      backgroundColor: conversation.id === props.activeId ? C.item : "#00000000",
                      hover: { backgroundColor: C.item },
                    }}
                    onClick={() => props.onSelect(conversation.id)}
                  >
                    <text style={{ fontSize: 13.5, lineHeight: 18, color: C.text, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{conversation.title}</text>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Icon name="folder" size={12.5} color={C.tertiary} />
                      <text style={{ fontSize: 13, color: C.tertiary, flexGrow: 1, minWidth: 0, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{conversation.project}</text>
                      <text style={{ fontSize: 12.5, color: C.ghost }}>{conversation.time}</text>
                    </div>
                  </div>
                )}
              </For>
            </div>
          )}
        </For>
      </div>
      <div style={{ display: "flex", alignItems: "center", height: 40, paddingLeft: 10, paddingRight: 10 }}><IconButton icon="settings" /></div>
    </div>
  )
}

function UserTurn(props: { text: string }): SolidElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: "100%" }}>
      <div style={{ maxWidth: 540, minWidth: 0, backgroundColor: C.raised, borderRadius: 12, paddingTop: 8, paddingBottom: 8, paddingLeft: 12, paddingRight: 12 }}>
        <text style={{ fontSize: 14, lineHeight: 20, color: C.text, minWidth: 0, maxWidth: "100%" }}>{props.text}</text>
      </div>
    </div>
  )
}

function WorkedFor(props: { duration: string }): SolidElement {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10, height: 24, width: "100%" }}>
      <div style={{ height: 1, flexGrow: 1, backgroundColor: C.border }} />
      <text style={{ fontSize: 13.5, fontWeight: 500, color: C.tertiary }}>{props.duration}</text>
      <Icon name="chevronRight" size={11.5} color={C.tertiary} />
      <div style={{ height: 1, flexGrow: 1, backgroundColor: C.border }} />
    </div>
  )
}

function CodeBlock(props: { code: string; language?: string | undefined }): SolidElement {
  const style: StyleDesc = { minWidth: 0, paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10 }
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", minWidth: 0, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: "#FFFFFF09", overflow: "hidden" }}>
      <Show when={props.language}>{(language) => <div style={{ paddingLeft: 12, paddingTop: 5, paddingBottom: 5, borderBottomWidth: 1, borderColor: C.border }}><text style={{ fontSize: 12, color: C.secondary }}>{language()}</text></div>}</Show>
      {props.language ? (
        <code code={props.code} language={props.language} showLineNumbers theme={CHAT_THEME} style={style} />
      ) : (
        <code code={props.code} showLineNumbers theme={CHAT_THEME} style={style} />
      )}
    </div>
  )
}

export function SafeMdxTranscript(): SolidElement {
  const [copied, setCopied] = createSignal(false)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30, width: 748 }}>
      <UserTurn text="Can Markdown be composed as normal Solid elements instead?" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SafeMdxContent source={SAFE_MDX_STRESS} />
        <div style={{ display: "flex", flexDirection: "row", gap: 4, paddingTop: 6 }}>
          <IconButton icon={copied() ? "check" : "copy"} onClick={() => setCopied((value) => !value)} />
          <IconButton icon="thumbsUp" />
          <IconButton icon="thumbsDown" />
          <IconButton icon="retry" />
          <IconButton icon="share" />
          <IconButton icon="more" />
        </div>
      </div>
    </div>
  )
}

function TurnContent(props: { turn: Turn }): SolidElement {
  if (props.turn.kind === "user") return <UserTurn text={props.turn.text ?? ""} />
  if (props.turn.kind === "fold") return <WorkedFor duration={props.turn.duration ?? ""} />
  if (props.turn.kind === "markdown") return <SafeMdxContent source={props.turn.source ?? ""} />
  if (props.turn.kind === "code") return <CodeBlock code={props.turn.source ?? ""} language={props.turn.language} />
  return <diff patch={props.turn.patch ?? ""} wordDiff theme={CHAT_THEME} />
}

function TranscriptRow(props: { children: SolidElement; first: boolean; last: boolean }): SolidElement {
  return (
    <div style={{ display: "flex", flexDirection: "row", justifyContent: "center", width: "100%", paddingTop: props.first ? 22 : 8, paddingBottom: props.last ? 22 : 8, paddingLeft: 20, paddingRight: 20 }}>
      <div style={{ width: CONTENT_MAX_WIDTH, maxWidth: "100%" }}>{props.children}</div>
    </div>
  )
}

function Transcript(props: { turns: readonly Turn[]; includeSafeMdx: boolean; setListRef(instance: PublicInstance): void }): SolidElement {
  const rows = () => (
    <For each={props.turns}>
      {(turn, index) => <TranscriptRow first={!props.includeSafeMdx && index() === 0} last={index() === props.turns.length - 1}><TurnContent turn={turn} /></TranscriptRow>}
    </For>
  )

  if (props.includeSafeMdx) {
    return (
      <virtual-list ref={props.setListRef} overdraw={240} estimatedItemHeight={220} style={{ flexGrow: 1, minHeight: 0, width: "100%" }}>
        <TranscriptRow first last={props.turns.length === 0}><SafeMdxTranscript /></TranscriptRow>
        {rows()}
      </virtual-list>
    )
  }

  return (
    <virtual-list ref={props.setListRef} overdraw={240} estimatedItemHeight={220} style={{ flexGrow: 1, minHeight: 0, width: "100%" }}>
      {rows()}
    </virtual-list>
  )
}

const MENU_STYLE: StyleDesc = {
  minWidth: 220,
  paddingTop: 4,
  paddingBottom: 4,
  paddingLeft: 4,
  paddingRight: 4,
  backgroundColor: C.raised,
  borderWidth: 1,
  borderColor: C.borderStrong,
  borderRadius: 12,
}

function MenuRow(props: { label: string; selected: boolean; highlighted: boolean; icon?: IconName | undefined; description?: string | undefined }): SolidElement {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10, width: "100%", paddingTop: props.description ? 6 : 5, paddingBottom: props.description ? 6 : 5, paddingLeft: 8, paddingRight: 8, borderRadius: 7, backgroundColor: props.highlighted ? "#404040" : props.selected ? "#2C2C2C" : C.raised, hover: { backgroundColor: "#404040" } }}>
      <Show when={props.icon}>{(icon) => <Icon name={icon()} size={14} color={C.tertiary} />}</Show>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0 }}>
        <text style={{ fontSize: 12.5, fontWeight: props.selected ? 600 : 500, color: C.text }}>{props.label}</text>
        <Show when={props.description}>{(description) => <text style={{ fontSize: 12.5, color: C.tertiary, paddingTop: 2 }}>{description()}</text>}</Show>
      </div>
      <Show when={props.selected}><Icon name="check" size={11} color={C.tertiary} /></Show>
    </div>
  )
}

interface ChipSelectProps {
  value: string
  onChange(value: string): void
  icon: IconName
  label: string
  testId: string
  menuWidth: number
  children: SolidElement
}

function ChipSelect(props: ChipSelectProps): SolidElement {
  return (
    <Select value={props.value} onValueChange={props.onChange} style={{ flexShrink: 0 }}>
      <div style={{ position: "relative", display: "flex" }}>
        <SelectTrigger testId={props.testId} style={(state) => ({ display: "flex", flexDirection: "row", alignItems: "center", gap: 6, height: 26, paddingLeft: 7, paddingRight: 7, borderRadius: 6, cursor: "pointer", backgroundColor: state.open ? C.overlay : "#00000000", hover: { backgroundColor: C.overlay } })}>
          <Icon name={props.icon} size={12} color={C.tertiary} />
          <text style={{ fontSize: 13, color: C.secondary, whiteSpace: "nowrap" }}>{props.label}</text>
          <Icon name="chevronDown" size={10.5} color={C.ghost} />
        </SelectTrigger>
        <SelectContent side="top" sideOffset={4} style={{ ...MENU_STYLE, minWidth: props.menuWidth }}>{props.children}</SelectContent>
      </div>
    </Select>
  )
}

function ModelPicker(props: { value: string; onChange(value: string): void }): SolidElement {
  const selected = () => MODELS.find((model) => model.id === props.value) ?? MODELS[0]
  return (
    <ChipSelect value={props.value} onChange={props.onChange} icon="sparkle" label={selected().label} testId="model-picker" menuWidth={230}>
      <For each={MODELS}>{(model) => <SelectItem value={model.id} textValue={model.label}>{(state) => <MenuRow label={model.label} icon="sparkle" selected={state.selected} highlighted={state.highlighted} />}</SelectItem>}</For>
    </ChipSelect>
  )
}

function ReasoningPicker(props: { value: string; onChange(value: string): void }): SolidElement {
  const selected = () => REASONING.find((option) => option.id === props.value) ?? REASONING[0]
  return (
    <ChipSelect value={props.value} onChange={props.onChange} icon={props.value === "low" ? "zap" : "sparkle"} label={selected().label} testId="reasoning-picker" menuWidth={180}>
      <SelectLabel style={{ height: 22, paddingLeft: 8, display: "flex", alignItems: "center" }}><text style={{ fontSize: 11.5, color: C.ghost }}>Reasoning</text></SelectLabel>
      <For each={REASONING}>{(option) => <SelectItem value={option.id} textValue={option.label}>{(state) => <MenuRow label={option.label} selected={state.selected} highlighted={state.highlighted} />}</SelectItem>}</For>
    </ChipSelect>
  )
}

function AccessPicker(props: { value: string; onChange(value: string): void }): SolidElement {
  const selected = () => ACCESS.find((option) => option.id === props.value) ?? ACCESS[3]
  return (
    <ChipSelect value={props.value} onChange={props.onChange} icon={selected().icon} label={selected().label} testId="access-picker" menuWidth={288}>
      <For each={ACCESS}>{(option) => <SelectItem value={option.id} textValue={option.label}>{(state) => <MenuRow label={option.label} icon={option.icon} description={option.description} selected={state.selected} highlighted={state.highlighted} />}</SelectItem>}</For>
    </ChipSelect>
  )
}

function ModeToggle(props: { value: "build" | "plan"; onChange(value: "build" | "plan"): void }): SolidElement {
  const plan = () => props.value === "plan"
  return (
    <div testId="mode-toggle" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6, height: 26, paddingLeft: 7, paddingRight: 7, borderRadius: 6, cursor: "pointer", hover: { backgroundColor: C.overlay } }} onClick={() => props.onChange(plan() ? "build" : "plan")}>
      <Icon name={plan() ? "list" : "wrench"} size={12} color={plan() ? C.accent : C.tertiary} />
      <text style={{ fontSize: 13, color: plan() ? C.accent : C.secondary }}>{plan() ? "Plan" : "Build"}</text>
    </div>
  )
}

interface ComposerProps {
  value: string
  onChange(value: string): void
  onSend(value: string): void
  model: string
  onModelChange(value: string): void
  reasoning: string
  onReasoningChange(value: string): void
  access: string
  onAccessChange(value: string): void
  mode: "build" | "plan"
  onModeChange(value: "build" | "plan"): void
}

function Composer(props: ComposerProps): SolidElement {
  const ready = () => props.value.trim().length > 0
  const send = (raw: string): void => {
    const value = raw.trim()
    if (value.length > 0) props.onSend(value)
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingLeft: 20, paddingRight: 20, overflow: "visible", userSelect: "none" }}>
      <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: CONTENT_MAX_WIDTH, overflow: "visible", backgroundColor: C.composer, borderRadius: 13, borderWidth: 1, borderColor: C.border, paddingTop: 10, paddingBottom: 10 }}>
        <textarea testId="composer" value={props.value} placeholder="Do anything..." minRows={1} maxRows={3} autoFocus theme={CHAT_THEME} style={{ width: "100%", minWidth: 0, fontSize: 14, lineHeight: 20, color: C.text, backgroundColor: "#00000000", borderWidth: 0, paddingLeft: 10, paddingRight: 10 }} onChange={(event) => props.onChange(event.value ?? "")} onSubmit={(event) => send(event.value ?? props.value)} />
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, paddingLeft: 10, paddingRight: 10 }}>
          <ModelPicker value={props.model} onChange={props.onModelChange} />
          <ReasoningPicker value={props.reasoning} onChange={props.onReasoningChange} />
          <AccessPicker value={props.access} onChange={props.onAccessChange} />
          <ModeToggle value={props.mode} onChange={props.onModeChange} />
          <div style={{ flexGrow: 1 }} />
          <div testId="send" style={{ width: 26, height: 26, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", cursor: ready() ? "pointer" : "default", backgroundColor: ready() ? C.inverse : C.overlayStrong }} onClick={() => send(props.value)}><Icon name="send" size={16} color={ready() ? C.onInverse : C.ghost} /></div>
        </div>
      </div>
    </div>
  )
}

function FooterSelect(props: { kind: "project" | "workspace" | "branch"; value: string; onChange(value: string): void }): SolidElement {
  if (props.kind === "project") {
    const selected = () => PROJECTS.find((item) => item.id === props.value) ?? PROJECTS[0]
    return <ChipSelect value={props.value} onChange={props.onChange} icon="folder" label={selected().label} testId="project-picker" menuWidth={210}><For each={PROJECTS}>{(item) => <SelectItem value={item.id} textValue={item.label}>{(state) => <MenuRow label={item.label} icon="folder" selected={state.selected} highlighted={state.highlighted} />}</SelectItem>}</For></ChipSelect>
  }
  if (props.kind === "workspace") {
    const selected = () => WORKSPACES.find((item) => item.id === props.value) ?? WORKSPACES[0]
    return <ChipSelect value={props.value} onChange={props.onChange} icon={selected().icon} label={selected().label} testId="workspace-picker" menuWidth={210}><For each={WORKSPACES}>{(item) => <SelectItem value={item.id} textValue={item.label}>{(state) => <MenuRow label={item.label} icon={item.icon} selected={state.selected} highlighted={state.highlighted} />}</SelectItem>}</For></ChipSelect>
  }
  const selected = () => BRANCHES.find((item) => item.id === props.value) ?? BRANCHES[0]
  return <ChipSelect value={props.value} onChange={props.onChange} icon="gitBranch" label={selected().label} testId="branch-picker" menuWidth={230}><For each={BRANCHES}>{(item) => <SelectItem value={item.id} textValue={item.label}>{(state) => <MenuRow label={item.label} icon="gitBranch" selected={state.selected} highlighted={state.highlighted} />}</SelectItem>}</For></ChipSelect>
}

function WorkspaceFooter(props: { project: string; onProjectChange(value: string): void; workspace: string; onWorkspaceChange(value: string): void; branch: string; onBranchChange(value: string): void }): SolidElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingLeft: 20, paddingRight: 20, paddingTop: 4, paddingBottom: 8 }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2, width: "100%", maxWidth: CONTENT_MAX_WIDTH, height: 28, paddingLeft: 10, paddingRight: 10 }}>
        <FooterSelect kind="project" value={props.project} onChange={props.onProjectChange} />
        <FooterSelect kind="workspace" value={props.workspace} onChange={props.onWorkspaceChange} />
        <Show when={props.project !== "none"}><FooterSelect kind="branch" value={props.branch} onChange={props.onBranchChange} /></Show>
        <div style={{ flexGrow: 1 }} />
        <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#3B82F6" }} />
      </div>
    </div>
  )
}

function Header(props: { collapsed: boolean; onExpand(): void; title: string; turnCount: number }): SolidElement {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, height: TITLEBAR_HEIGHT, flexShrink: 0, paddingLeft: props.collapsed ? 0 : 14, paddingRight: 14, userSelect: "none" }}>
      <Show when={props.collapsed}>
        <div style={{ width: TRAFFIC_LIGHT_CLEARANCE - 8, height: "100%" }} />
        <IconButton icon="sidebar" testId="sidebar-expand" onClick={props.onExpand} />
        <IconButton icon="arrowLeft" dimmed />
        <IconButton icon="arrowRight" dimmed />
      </Show>
      <text style={{ fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: "nowrap", textOverflow: "ellipsis", minWidth: 0 }}>{props.title}</text>
      <Show when={props.turnCount > TURN_TEMPLATES.length}><text style={{ fontSize: 12, color: C.tertiary }}>{props.turnCount.toLocaleString("en-US")} messages</text></Show>
      <div style={{ flexGrow: 1 }} />
      <IconButton icon="panelRight" />
    </div>
  )
}

export interface ChatAppProps {
  turnCount?: number | undefined
  includeSafeMdx?: boolean | undefined
}

export function ChatApp(props: ChatAppProps = {}): SolidElement {
  const [activeId, setActiveId] = createSignal("c1")
  const [collapsed, setCollapsed] = createSignal(false)
  const [draft, setDraft] = createSignal("")
  const [model, setModel] = createSignal("deepseek-v4-flash")
  const [reasoning, setReasoning] = createSignal("high")
  const [access, setAccess] = createSignal("full")
  const [mode, setMode] = createSignal<"build" | "plan">("build")
  const [project, setProject] = createSignal("gpuix-solid")
  const [workspace, setWorkspace] = createSignal("local")
  const [branch, setBranch] = createSignal("main")
  const [turns, setTurns] = createSignal(expandTurns(props.turnCount ?? TURN_TEMPLATES.length))
  const renderer = useGpuixRequired()
  const insets = useWindowInsets()
  let listRef: PublicInstance | undefined
  let firstTranscriptCommit = true
  let liveTurn = 0

  const title = createMemo(() => CONVERSATIONS.find((conversation) => conversation.id === activeId())?.title ?? "")

  createEffect(
    () => turns().length + (props.includeSafeMdx ? 1 : 0),
    (count) => {
      if (firstTranscriptCommit) {
        firstTranscriptCommit = false
        return
      }
      const currentList = listRef
      if (!currentList || count === 0) return
      queueMicrotask(() => renderer.scrollToItem?.(currentList.id, count - 1))
    },
  )

  const send = (text: string): void => {
    liveTurn += 1
    setTurns((current) => [...current, { id: `live-${liveTurn}`, kind: "user", text }])
    setDraft("")
  }

  return (
    <div style={{ display: "flex", flexDirection: "row", width: "100%", height: "100%", backgroundColor: C.canvas, fontFamily: FONT_SANS, color: C.text }}>
      <animate.div initial={false} to={{ width: collapsed() ? 0 : SIDEBAR_WIDTH + 1 }} transition={{ duration: 0.2, ease: "easeOut" }} style={{ display: "flex", flexDirection: "row", height: "100%", flexShrink: 0, overflow: "hidden" }}>
        <Sidebar activeId={activeId()} onSelect={setActiveId} onCollapse={() => setCollapsed(true)} />
        <div style={{ width: 1, height: "100%", backgroundColor: C.sidebarBorder }} />
      </animate.div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0, height: "100%", paddingBottom: insets.ime.bottom, backgroundColor: C.canvas }}>
        <Header collapsed={collapsed()} onExpand={() => setCollapsed(false)} title={title()} turnCount={turns().length} />
        <Transcript turns={turns()} includeSafeMdx={props.includeSafeMdx ?? false} setListRef={(instance) => { listRef = instance }} />
        <Composer value={draft()} onChange={setDraft} onSend={send} model={model()} onModelChange={setModel} reasoning={reasoning()} onReasoningChange={setReasoning} access={access()} onAccessChange={setAccess} mode={mode()} onModeChange={setMode} />
        <WorkspaceFooter project={project()} onProjectChange={setProject} workspace={workspace()} onWorkspaceChange={setWorkspace} branch={branch()} onBranchChange={setBranch} />
      </div>
    </div>
  )
}
