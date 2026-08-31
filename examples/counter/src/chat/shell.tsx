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
  useGpuix,
  useWindowInsets,
  type PublicInstance,
  type StyleDesc,
} from "gpuix-solid"
import iconCompose from "../../upstream/gpuix/examples/assets/icons/compose.svg?raw"
import iconSearch from "../../upstream/gpuix/examples/assets/icons/search.svg?raw"
import iconSidebar from "../../upstream/gpuix/examples/assets/icons/panel-left.svg?raw"
import iconPanelRight from "../../upstream/gpuix/examples/assets/icons/panel-right.svg?raw"
import iconArrowLeft from "../../upstream/gpuix/examples/assets/icons/arrow-left.svg?raw"
import iconArrowRight from "../../upstream/gpuix/examples/assets/icons/arrow-right.svg?raw"
import iconFolder from "../../upstream/gpuix/examples/assets/icons/folder.svg?raw"
import iconSettings from "../../upstream/gpuix/examples/assets/icons/settings.svg?raw"
import iconGitBranch from "../../upstream/gpuix/examples/assets/icons/git-branch.svg?raw"
import iconLaptop from "../../upstream/gpuix/examples/assets/icons/laptop.svg?raw"
import iconLockOpen from "../../upstream/gpuix/examples/assets/icons/lock-open.svg?raw"
import iconLock from "../../upstream/gpuix/examples/assets/icons/lock.svg?raw"
import iconList from "../../upstream/gpuix/examples/assets/icons/list.svg?raw"
import iconZap from "../../upstream/gpuix/examples/assets/icons/zap.svg?raw"
import iconPencil from "../../upstream/gpuix/examples/assets/icons/pencil.svg?raw"
import iconChevronDown from "../../upstream/gpuix/examples/assets/icons/chevron-down.svg?raw"
import iconChevronRight from "../../upstream/gpuix/examples/assets/icons/chevron-right.svg?raw"
import iconListFilter from "../../upstream/gpuix/examples/assets/icons/list-filter.svg?raw"
import iconSparkle from "../../upstream/gpuix/examples/assets/icons/sparkle.svg?raw"
import iconWrench from "../../upstream/gpuix/examples/assets/icons/wrench.svg?raw"
import iconSend from "../../upstream/gpuix/examples/assets/icons/arrow-up.svg?raw"
import iconCopy from "../../upstream/gpuix/examples/assets/icons/copy.svg?raw"
import iconCheck from "../../upstream/gpuix/examples/assets/icons/check.svg?raw"
import iconRetry from "../../upstream/gpuix/examples/assets/icons/rotate-ccw.svg?raw"
import iconThumbsUp from "../../upstream/gpuix/examples/assets/icons/thumbs-up.svg?raw"
import iconThumbsDown from "../../upstream/gpuix/examples/assets/icons/thumbs-down.svg?raw"
import iconShare from "../../upstream/gpuix/examples/assets/icons/share.svg?raw"
import iconMore from "../../upstream/gpuix/examples/assets/icons/ellipsis.svg?raw"
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
const TRAFFIC_LIGHT_CLEARANCE =
  typeof process !== "undefined" && process.platform === "darwin" ? 86 : 8
const CONTENT_MAX_WIDTH = 720
const TITLEBAR_HEIGHT = 48
const FONT_SANS = typeof window === "undefined" ? "Helvetica" : "IBM Plex Sans"

const ICONS = {
  compose: iconCompose,
  search: iconSearch,
  sidebar: iconSidebar,
  panelRight: iconPanelRight,
  arrowLeft: iconArrowLeft,
  arrowRight: iconArrowRight,
  folder: iconFolder,
  settings: iconSettings,
  gitBranch: iconGitBranch,
  laptop: iconLaptop,
  lockOpen: iconLockOpen,
  lock: iconLock,
  list: iconList,
  zap: iconZap,
  pencil: iconPencil,
  chevronDown: iconChevronDown,
  chevronRight: iconChevronRight,
  listFilter: iconListFilter,
  sparkle: iconSparkle,
  wrench: iconWrench,
  send: iconSend,
  copy: iconCopy,
  check: iconCheck,
  retry: iconRetry,
  thumbsUp: iconThumbsUp,
  thumbsDown: iconThumbsDown,
  share: iconShare,
  more: iconMore,
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

const MODELS = [
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", group: "DeepSeek", icon: "sparkle" as const },
  { id: "deepseek-v4", label: "DeepSeek V4", group: "DeepSeek", icon: "sparkle" as const },
  { id: "opus-4.6", label: "Claude Opus 4.6", group: "Claude", icon: "sparkle" as const },
  { id: "sonnet-4.6", label: "Claude Sonnet 4.6", group: "Claude", icon: "sparkle" as const },
  { id: "gpt-5.4", label: "GPT-5.4", group: "OpenAI", icon: "sparkle" as const },
  { id: "grok-4", label: "Grok 4", group: "xAI", icon: "sparkle" as const },
] as const

const REASONING = [
  { id: "high", label: "High", hint: "Default" },
  { id: "medium", label: "Medium", hint: undefined },
  { id: "low", label: "Low", hint: undefined },
] as const

const ACCESS = [
  { id: "ask", label: "Supervised", description: "Ask before every tool call", icon: "lock" as const },
  { id: "edits", label: "Auto-accept edits", description: "Edit files without asking", icon: "pencil" as const },
  { id: "auto", label: "Auto", description: "Run most tools without asking", icon: "sparkle" as const },
  { id: "full", label: "Full access", description: "No permission prompts", icon: "lockOpen" as const },
] as const

const PROJECTS = [
  { id: "gpuix", label: "gpuix" },
  { id: "example-app", label: "example-app" },
  { id: "none", label: "No project" },
] as const

const WORKSPACES = [
  { id: "local", label: "Local", icon: "laptop" as const },
  { id: "worktree", label: "New worktree", icon: "gitBranch" as const },
] as const

const BRANCHES = [
  { id: "main", label: "main" },
  { id: "feat-selectors", label: "feat/selectors" },
  { id: "chat-example", label: "chat-example" },
] as const

const CONVERSATIONS: readonly Conversation[] = [
  { id: "c1", title: "give me a quick overview", group: "Yesterday", project: "gpuix", time: "16m" },
  { id: "c2", title: "Native SDK vs GPUI comparison", group: "Yesterday", project: "No project", time: "14h" },
  { id: "c3", title: "Vercel Labs scriptc implementat...", group: "Yesterday", project: "No project", time: "15h" },
  { id: "c4", title: "check if any memory optimizatio...", group: "This Month", project: "gpuix", time: "2d" },
]

const OVERVIEW = `**GPUIX** is a React renderer for GPUI, Zed's GPU-accelerated UI framework. It renders native desktop interfaces through Metal, DirectX, or Vulkan. No Electron or web view.`
const ARCHITECTURE = `React sends host mutations through napi-rs. Rust keeps the retained tree and translates it into GPUI elements for each frame.`
const SELECTION = `Selection is rebuilt from the paint pass. Each string registers in document order, so a drag can cross elements.`
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
        if from < to {
            spans.push(Span { key: key.to_string(), range: from..to });
        }
    }
    spans
}`
const GUTTER = `The gutter width now follows the largest line number, so a five-digit line no longer hits the accent bar.`
const GUTTER_DIFF = [
  "diff --git a/packages/native/src/diff/mod.rs b/packages/native/src/diff/mod.rs",
  "index 8f2a1c4..d91b7e0 100644",
  "--- a/packages/native/src/diff/mod.rs",
  "+++ b/packages/native/src/diff/mod.rs",
  "@@ -78,12 +78,15 @@ impl FileDiff {",
  " /// Width of one line-number gutter, fitted to the largest line number.",
  "-pub fn gutter_width(file: &FileDiff) -> f32 {",
  "-    GUTTER_WIDTH",
  "+pub fn gutter_width(file: &FileDiff, metrics: &Metrics) -> f32 {",
  "+    let digits = file.max_line.max(1).ilog10() + 1;",
  "+    (digits as f32 * 6.6 + 8.0 + 6.0).max(metrics.diff_gutter_width)",
  " }",
].join("\n")
const HOT_RELOAD = `**No.** A \`.node\` cannot unload. The loop rebuilds and restarts.`
const SKILLS = `Skills are \`SKILL.md\` files. A mail-style list on the left, the body on the right.`
const WIRE_MODELS = `Default is DeepSeek V4 Flash. Keep Opus for long diffs. Hide GPT-5.4 behind the picker.`

type Turn =
  | { kind: "user"; text: string }
  | { kind: "fold"; duration: string }
  | { kind: "markdown"; source: string }
  | { kind: "code"; language: string; source: string }
  | { kind: "diff"; patch: string }

const TURNS: Turn[] = [
  { kind: "user", text: "give me a quick overview" },
  { kind: "fold", duration: "Worked for 10 seconds" },
  { kind: "markdown", source: OVERVIEW },
  { kind: "user", text: "How does React reach GPUI?" },
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
  { kind: "fold", duration: "Worked for 4 seconds" },
  { kind: "markdown", source: HOT_RELOAD },
  { kind: "user", text: "How do skills show up in the app?" },
  { kind: "fold", duration: "Worked for 7 seconds" },
  { kind: "markdown", source: SKILLS },
  { kind: "user", text: "Which models should I wire up?" },
  { kind: "fold", duration: "Worked for 5 seconds" },
  { kind: "markdown", source: WIRE_MODELS },
]

const SAFE_MDX_STRESS = `# React-composed Markdown

This message uses **safe-mdx**, *styled spans*, ~~deleted text~~, an
\`inline code value\`, and [a link](https://github.com/holocron-hq/safe-mdx).

> The parser runs in TypeScript. Every Markdown node becomes a normal React component.
>
> GPUIX renders the resulting \`div\`, \`text\`, and \`code\` tree.

- nested **inline formatting** inside a list
- a second item with a long sentence that must wrap without leaving the transcript column
- [x] a GFM task item

| Path | Renderer | Native Markdown element | Host nodes | Scroll | When to use |
|:-----|:---------|:------------------------|-----------:|:-------|:------------|
| safe-mdx | React tree of div and text | no | many | overflow-x on this grid | Custom MDX components and React state inside a message |
| pulldown-cmark | one native markdown node | yes | one | overflow-x inside Rust | Default chat transcript. Cheapest paint. |
| grid table | one CSS grid of cells | no | one per cell | overflow-x on the flex parent | Wide comparison tables that must stay readable |

\`\`\`typescript
const tree = mdxParse(source)
return <SafeMdxRenderer markdown={source} mdast={tree} />
\`\`\`

<Callout title="Custom MDX component">
  MDX components also map to ordinary GPUIX React components.
</Callout>`

function expandTurns(count: number): Turn[] {
  if (count <= TURNS.length) return TURNS.slice(0, count)
  const out = new Array<Turn>(count)
  for (let index = 0; index < count; index += 1) {
    out[index] = TURNS[index % TURNS.length]!
  }
  return out
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
  }
  if (!props.dimmed) {
    style.hover = { backgroundColor: C.overlay }
    style.active = { backgroundColor: C.overlayStrong }
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
      <div style={{ width: 20, height: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2, marginLeft: 6 }}>
          <IconButton icon="arrowLeft" dimmed />
          <IconButton icon="arrowRight" dimmed />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", paddingLeft: 10, paddingRight: 10 }}><SidebarAction icon="compose" label="New Task" /></div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0, overflowY: "scroll", paddingLeft: 10, paddingRight: 10 }}>
        <div style={{ paddingBottom: 6 }}><SidebarAction icon="search" label="Search" /></div>
        <For each={groups()}>
          {(group, groupIndex) => (
            <div style={{ display: "flex", flexDirection: "column", paddingBottom: 10 }}>
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", height: 28, paddingLeft: 8, paddingRight: 8 }}>
                <text style={{ fontSize: 13, fontWeight: 500, color: C.secondary, flexGrow: 1, minWidth: 0 }}>{group.name}</text>
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
                      <text style={{ fontSize: 13, lineHeight: 15, color: C.tertiary, flexGrow: 1, minWidth: 0, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{conversation.project}</text>
                      <text style={{ fontSize: 12.5, color: C.ghost, flexShrink: 0 }}>{conversation.time}</text>
                    </div>
                  </div>
                )}
              </For>
            </div>
          )}
        </For>
      </div>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", height: 40, flexShrink: 0, paddingLeft: 10, paddingRight: 10 }}><IconButton icon="settings" /></div>
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
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 0 }}>
        <text style={{ fontSize: 13.5, lineHeight: 18, fontWeight: 500, color: C.tertiary }}>{props.duration}</text>
        <Icon name="chevronRight" size={11.5} color={C.tertiary} />
      </div>
      <div style={{ height: 1, flexGrow: 1, backgroundColor: C.border }} />
    </div>
  )
}

function CodeBlock(props: { code: string; language?: string | undefined; showLineNumbers?: boolean | undefined }): SolidElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: "#FFFFFF09",
        overflow: "hidden",
      }}
    >
      <Show when={props.language}>
        {(language) => (
          <div
            style={{
              paddingLeft: 12,
              paddingRight: 12,
              paddingTop: 5,
              paddingBottom: 5,
              borderBottomWidth: 1,
              borderColor: C.border,
              backgroundColor: "#FFFFFF05",
            }}
          >
            <text style={{ fontSize: 12, color: C.secondary }}>{language()}</text>
          </div>
        )}
      </Show>
      {props.language ? (
        <code code={props.code} language={props.language} showLineNumbers={props.showLineNumbers} theme={CHAT_THEME} style={{ minWidth: 0, paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10 }} />
      ) : (
        <code code={props.code} showLineNumbers={props.showLineNumbers} theme={CHAT_THEME} style={{ minWidth: 0, paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10 }} />
      )}
    </div>
  )
}

function GhostButton(props: { icon: IconName; label?: string | undefined; active?: boolean | undefined; onClick?: (() => void) | undefined }): SolidElement {
  const color = () => props.active ? C.text : C.ghost
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 30,
        paddingLeft: props.label ? 9 : 0,
        paddingRight: props.label ? 11 : 0,
        width: props.label ? undefined : 30,
        justifyContent: "center",
        borderRadius: 10,
        cursor: "pointer",
        backgroundColor: props.active ? C.overlayStrong : "#00000000",
        hover: { backgroundColor: C.overlay },
      }}
      onClick={() => props.onClick?.()}
    >
      <Icon name={props.icon} size={16} color={color()} />
      <Show when={props.label}>{(label) => <text style={{ fontSize: 12.5, color: color() }}>{label()}</text>}</Show>
    </div>
  )
}

function ActionBar(): SolidElement {
  const [copied, setCopied] = createSignal(false)
  const [feedback, setFeedback] = createSignal<"up" | "down" | null>(null)
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 6, marginLeft: -7, userSelect: "none" }}>
      <GhostButton icon={copied() ? "check" : "copy"} active={copied()} onClick={() => setCopied((was) => !was)} />
      <GhostButton icon="thumbsUp" active={feedback() === "up"} onClick={() => setFeedback((value) => value === "up" ? null : "up")} />
      <GhostButton icon="thumbsDown" active={feedback() === "down"} onClick={() => setFeedback((value) => value === "down" ? null : "down")} />
      <GhostButton icon="retry" />
      <GhostButton icon="share" />
      <GhostButton icon="more" />
    </div>
  )
}

export function SafeMdxTranscript(): SolidElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30, width: 748 }}>
      <UserTurn text="Can Markdown be composed as normal React elements instead?" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SafeMdxContent source={SAFE_MDX_STRESS} />
        <ActionBar />
      </div>
    </div>
  )
}

function TurnContent(props: { turn: Turn }): SolidElement {
  if (props.turn.kind === "user") return <UserTurn text={props.turn.text} />
  if (props.turn.kind === "fold") return <WorkedFor duration={props.turn.duration} />
  if (props.turn.kind === "markdown") return <SafeMdxContent source={props.turn.source} />
  if (props.turn.kind === "code") return <CodeBlock code={props.turn.source} language={props.turn.language} showLineNumbers />
  return <diff patch={props.turn.patch} wordDiff theme={CHAT_THEME} />
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
        <TranscriptRow first last={props.turns.length === 0}><><UserTurn text="Can Markdown be composed as normal React elements instead?" /><SafeMdxContent source={SAFE_MDX_STRESS} /></></TranscriptRow>
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

function MenuRow(props: { label: string; description?: string | undefined; icon?: IconName | undefined; selected: boolean; highlighted: boolean; hint?: string | undefined }): SolidElement {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10, width: "100%", paddingTop: props.description ? 6 : 5, paddingBottom: props.description ? 6 : 5, paddingLeft: 8, paddingRight: 8, borderRadius: 7, backgroundColor: props.highlighted ? "#404040" : props.selected ? "#2C2C2C" : C.raised, hover: { backgroundColor: "#404040" } }}>
      <Show when={props.icon}>{(icon) => <Icon name={icon()} size={14} color={C.tertiary} />}</Show>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0 }}>
        <text style={{ fontSize: 12.5, fontWeight: props.selected ? 600 : 500, color: C.text, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.label}</text>
        <Show when={props.description}>{(description) => <text style={{ fontSize: 12.5, lineHeight: 14, color: C.tertiary, paddingTop: 2 }}>{description()}</text>}</Show>
      </div>
      <Show when={props.hint}>{(hint) => <text style={{ fontSize: 11.5, color: C.ghost, flexShrink: 0 }}>{hint()}</text>}</Show>
      <Show when={props.selected}><Icon name="check" size={11} color={C.tertiary} /></Show>
    </div>
  )
}

interface ChipSelectProps {
  value: string
  onChange(value: string): void
  icon: IconName
  label: string
  caret?: boolean | undefined
  accent?: boolean | undefined
  menuWidth?: number | undefined
  testId?: string | undefined
  children: SolidElement
}

function ChipSelect(props: ChipSelectProps): SolidElement {
  const triggerStyle = (state: { open: boolean }): StyleDesc => ({
    display: "flex", flexDirection: "row", alignItems: "center", gap: 6, height: 26, paddingLeft: 7, paddingRight: 7, borderRadius: 6, cursor: "pointer", backgroundColor: state.open ? C.overlay : "#00000000", hover: { backgroundColor: C.overlay },
  })
  return (
    <Select value={props.value} onValueChange={props.onChange} style={{ flexShrink: 0 }}>
      <div style={{ position: "relative", display: "flex" }}>
        {props.testId === undefined ? (
          <SelectTrigger style={triggerStyle}>
            <Icon name={props.icon} size={12} color={props.accent ? C.accent : C.tertiary} />
            <text style={{ fontSize: 13, lineHeight: 16, color: props.accent ? C.accent : C.secondary, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.label}</text>
            <Show when={props.caret ?? true}><Icon name="chevronDown" size={10.5} color={C.ghost} /></Show>
          </SelectTrigger>
        ) : (
          <SelectTrigger testId={props.testId} style={triggerStyle}>
            <Icon name={props.icon} size={12} color={props.accent ? C.accent : C.tertiary} />
            <text style={{ fontSize: 13, lineHeight: 16, color: props.accent ? C.accent : C.secondary, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.label}</text>
            <Show when={props.caret ?? true}><Icon name="chevronDown" size={10.5} color={C.ghost} /></Show>
          </SelectTrigger>
        )}
        <SelectContent side="top" sideOffset={4} style={{ ...MENU_STYLE, minWidth: props.menuWidth ?? 220 }}>{props.children}</SelectContent>
      </div>
    </Select>
  )
}

function ModelPicker(props: { value: string; onChange(value: string): void }): SolidElement {
  const selected = () => MODELS.find((model) => model.id === props.value) ?? MODELS[0]
  const groups = createMemo(() => {
    const out: Array<{ name: string; items: Array<(typeof MODELS)[number]> }> = []
    for (const model of MODELS) {
      const last = out[out.length - 1]
      if (last?.name === model.group) last.items.push(model)
      else out.push({ name: model.group, items: [model] })
    }
    return out
  })
  return (
    <ChipSelect value={props.value} onChange={props.onChange} icon={selected().icon} label={selected().label} testId="model-picker">
      <For each={groups()}>
        {(group, index) => (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Show when={index() > 0}><div style={{ height: 1, backgroundColor: C.border, marginTop: 4, marginBottom: 4 }} /></Show>
            <SelectLabel style={{ height: 22, paddingLeft: 8, paddingRight: 8, display: "flex", alignItems: "center" }}><text style={{ fontSize: 11.5, fontWeight: 500, color: C.ghost }}>{group.name}</text></SelectLabel>
            <For each={group.items}>{(model) => <SelectItem value={model.id} textValue={model.label}>{(state) => <MenuRow label={model.label} icon={model.icon} selected={state.selected} highlighted={state.highlighted} />}</SelectItem>}</For>
          </div>
        )}
      </For>
    </ChipSelect>
  )
}

function ReasoningPicker(props: { value: string; onChange(value: string): void }): SolidElement {
  const selected = () => REASONING.find((option) => option.id === props.value) ?? REASONING[0]
  return (
    <ChipSelect value={props.value} onChange={props.onChange} icon={props.value === "low" ? "zap" : "sparkle"} label={selected().label} caret={false}>
      <SelectLabel style={{ height: 22, paddingLeft: 8, display: "flex", alignItems: "center" }}><text style={{ fontSize: 11.5, fontWeight: 500, color: C.ghost }}>Reasoning</text></SelectLabel>
      <For each={REASONING}>{(option) => <SelectItem value={option.id} textValue={option.label}>{(state) => <MenuRow label={option.label} hint={option.hint} selected={state.selected} highlighted={state.highlighted} />}</SelectItem>}</For>
    </ChipSelect>
  )
}

function AccessPicker(props: { value: string; onChange(value: string): void }): SolidElement {
  const selected = () => ACCESS.find((option) => option.id === props.value) ?? ACCESS[3]
  return (
    <ChipSelect value={props.value} onChange={props.onChange} icon={selected().icon} label={selected().label} caret={false} menuWidth={288}>
      <For each={ACCESS}>{(option) => <SelectItem value={option.id} textValue={option.label}>{(state) => <MenuRow label={option.label} description={option.description} icon={option.icon} selected={state.selected} highlighted={state.highlighted} />}</SelectItem>}</For>
    </ChipSelect>
  )
}

function ProjectPicker(props: { value: string; onChange(value: string): void }): SolidElement {
  const selected = () => PROJECTS.find((option) => option.id === props.value) ?? PROJECTS[0]
  return <ChipSelect value={props.value} onChange={props.onChange} icon="folder" label={selected().label} caret={false}><For each={PROJECTS}>{(option) => <SelectItem value={option.id} textValue={option.label}>{(state) => <MenuRow label={option.label} icon="folder" selected={state.selected} highlighted={state.highlighted} />}</SelectItem>}</For></ChipSelect>
}

function WorkspacePicker(props: { value: string; onChange(value: string): void }): SolidElement {
  const selected = () => WORKSPACES.find((option) => option.id === props.value) ?? WORKSPACES[0]
  return (
    <ChipSelect value={props.value} onChange={props.onChange} icon={selected().icon} label={selected().label} caret={false}>
      <SelectLabel style={{ height: 22, paddingLeft: 8, display: "flex", alignItems: "center" }}><text style={{ fontSize: 11.5, fontWeight: 500, color: C.ghost }}>Work in</text></SelectLabel>
      <For each={WORKSPACES}>{(option) => <SelectItem value={option.id} textValue={option.label}>{(state) => <MenuRow label={option.label} icon={option.icon} selected={state.selected} highlighted={state.highlighted} />}</SelectItem>}</For>
    </ChipSelect>
  )
}

function BranchPicker(props: { value: string; onChange(value: string): void }): SolidElement {
  const selected = () => BRANCHES.find((option) => option.id === props.value) ?? BRANCHES[0]
  return <ChipSelect value={props.value} onChange={props.onChange} icon="gitBranch" label={selected().label}><For each={BRANCHES}>{(option) => <SelectItem value={option.id} textValue={option.label}>{(state) => <MenuRow label={option.label} icon="gitBranch" selected={state.selected} highlighted={state.highlighted} />}</SelectItem>}</For></ChipSelect>
}

function ModeToggle(props: { value: "build" | "plan"; onChange(value: "build" | "plan"): void }): SolidElement {
  const plan = () => props.value === "plan"
  return (
    <div testId="mode-toggle" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6, height: 26, paddingLeft: 7, paddingRight: 7, borderRadius: 6, cursor: "pointer", hover: { backgroundColor: C.overlay } }} onClick={() => props.onChange(plan() ? "build" : "plan")}>
      <Icon name={plan() ? "list" : "wrench"} size={12} color={plan() ? C.accent : C.tertiary} />
      <text style={{ fontSize: 13, lineHeight: 16, color: plan() ? C.accent : C.secondary }}>{plan() ? "Plan" : "Build"}</text>
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
          <div testId="send" style={{ width: 26, height: 26, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", cursor: ready() ? "pointer" : undefined, backgroundColor: ready() ? C.inverse : C.overlayStrong, hover: ready() ? { opacity: 0.9 } : undefined }} onClick={() => send(props.value)}><Icon name="send" size={16} color={ready() ? C.onInverse : C.ghost} /></div>
        </div>
      </div>
    </div>
  )
}

function WorkspaceFooter(props: { project: string; onProjectChange(value: string): void; workspace: string; onWorkspaceChange(value: string): void; branch: string; onBranchChange(value: string): void }): SolidElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingLeft: 20, paddingRight: 20, paddingTop: 4, paddingBottom: 8, userSelect: "none" }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2, width: "100%", maxWidth: CONTENT_MAX_WIDTH, height: 28, paddingLeft: 10, paddingRight: 10 }}>
        <ProjectPicker value={props.project} onChange={props.onProjectChange} />
        <WorkspacePicker value={props.workspace} onChange={props.onWorkspaceChange} />
        <Show when={props.project !== "none"}><BranchPicker value={props.branch} onChange={props.onBranchChange} /></Show>
        <div style={{ flexGrow: 1 }} />
        <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#3B82F6", flexShrink: 0 }} />
      </div>
    </div>
  )
}

function Header(props: { collapsed: boolean; onExpand(): void; title: string; turnCount: number }): SolidElement {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, height: TITLEBAR_HEIGHT, flexShrink: 0, paddingLeft: props.collapsed ? 0 : 14, paddingRight: 14, userSelect: "none" }}>
      <Show when={props.collapsed}>
        <div style={{ width: TRAFFIC_LIGHT_CLEARANCE - 8, height: "100%", flexShrink: 0 }} />
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
          <IconButton icon="sidebar" testId="sidebar-expand" onClick={props.onExpand} />
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2 }}>
            <IconButton icon="arrowLeft" dimmed />
            <IconButton icon="arrowRight" dimmed />
          </div>
        </div>
      </Show>
      <text style={{ fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: "nowrap", textOverflow: "ellipsis", minWidth: 0, flexShrink: 1 }}>{props.title}</text>
      <Show when={props.turnCount > TURNS.length}><text style={{ fontSize: 12, fontWeight: 500, color: C.tertiary, flexShrink: 0 }}>{props.turnCount.toLocaleString("en-US")} messages</text></Show>
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
  const [project, setProject] = createSignal("gpuix")
  const [workspace, setWorkspace] = createSignal("local")
  const [branch, setBranch] = createSignal("main")
  const [turns, setTurns] = createSignal(expandTurns(props.turnCount ?? TURNS.length))
  const context = useGpuix()
  const renderer = context?.renderer
  const insets = useWindowInsets()
  let listRef: PublicInstance | undefined
  let skipScroll = true

  const title = createMemo(() => CONVERSATIONS.find((conversation) => conversation.id === activeId())?.title ?? "")

  createEffect(
    () => turns().length + (props.includeSafeMdx ? 1 : 0),
    (rowCount) => {
      if (skipScroll) {
        skipScroll = false
        return
      }
      const id = listRef?.id
      if (id === undefined || !renderer?.scrollToItem || rowCount === 0) return
      queueMicrotask(() => renderer.scrollToItem?.(id, rowCount - 1))
    },
  )

  return (
    <div style={{ display: "flex", flexDirection: "row", width: "100%", height: "100%", backgroundColor: C.canvas, fontFamily: FONT_SANS, color: C.text }}>
      <animate.div initial={false} to={{ width: collapsed() ? 0 : SIDEBAR_WIDTH + 1 }} transition={{ duration: 0.2, ease: "easeOut" }} style={{ display: "flex", flexDirection: "row", height: "100%", flexShrink: 0, overflow: "hidden" }}>
        <Sidebar activeId={activeId()} onSelect={setActiveId} onCollapse={() => setCollapsed(true)} />
        <div style={{ width: 1, height: "100%", flexShrink: 0, backgroundColor: C.sidebarBorder }} />
      </animate.div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0, height: "100%", paddingBottom: insets.ime.bottom, backgroundColor: C.canvas }}>
        <Header collapsed={collapsed()} onExpand={() => setCollapsed(false)} title={title()} turnCount={turns().length} />
        <Transcript turns={turns()} includeSafeMdx={props.includeSafeMdx ?? false} setListRef={(instance) => { listRef = instance }} />
        <Composer
          value={draft()}
          onChange={setDraft}
          onSend={(value) => { setTurns((current) => [...current, { kind: "user", text: value }]); setDraft("") }}
          model={model()}
          onModelChange={setModel}
          reasoning={reasoning()}
          onReasoningChange={setReasoning}
          access={access()}
          onAccessChange={setAccess}
          mode={mode()}
          onModeChange={setMode}
        />
        <WorkspaceFooter project={project()} onProjectChange={setProject} workspace={workspace()} onWorkspaceChange={setWorkspace} branch={branch()} onBranchChange={setBranch} />
      </div>
    </div>
  )
}
