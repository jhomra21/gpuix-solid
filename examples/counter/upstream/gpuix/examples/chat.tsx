/**
 * The GPUIX chat example, rendered directly on the GPU.
 *
 * It demonstrates a transparent titlebar, traffic lights in the sidebar,
 * graphite surfaces, composer chips, and a workspace footer. Data is hardcoded.
 *
 * Run on desktop: cd examples && bun --hot chat.tsx
 * Run in a browser: bun run web
 * Slow CPU: THROTTLE=utility bun --hot chat.tsx
 */

import React, { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyMacCpuThrottleFromEnv,
  motion,
  render,
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  useGpuix,
  useWindowInsets,
  type PublicInstance,
  type StyleDesc,
} from '@gpuix/react'
import { SafeMdxRenderer } from 'safe-mdx'
import { mdxParse } from 'safe-mdx/parse'
import type { Root } from 'mdast'
import iconCompose from './assets/icons/compose.svg' with { type: 'text' }
import iconSearch from './assets/icons/search.svg' with { type: 'text' }
import iconSidebar from './assets/icons/panel-left.svg' with { type: 'text' }
import iconPanelRight from './assets/icons/panel-right.svg' with { type: 'text' }
import iconArrowLeft from './assets/icons/arrow-left.svg' with { type: 'text' }
import iconArrowRight from './assets/icons/arrow-right.svg' with { type: 'text' }
import iconFolder from './assets/icons/folder.svg' with { type: 'text' }
import iconSettings from './assets/icons/settings.svg' with { type: 'text' }
import iconGitBranch from './assets/icons/git-branch.svg' with { type: 'text' }
import iconLaptop from './assets/icons/laptop.svg' with { type: 'text' }
import iconLockOpen from './assets/icons/lock-open.svg' with { type: 'text' }
import iconLock from './assets/icons/lock.svg' with { type: 'text' }
import iconList from './assets/icons/list.svg' with { type: 'text' }
import iconZap from './assets/icons/zap.svg' with { type: 'text' }
import iconPencil from './assets/icons/pencil.svg' with { type: 'text' }
import iconChevronDown from './assets/icons/chevron-down.svg' with { type: 'text' }
import iconChevronRight from './assets/icons/chevron-right.svg' with { type: 'text' }
import iconListFilter from './assets/icons/list-filter.svg' with { type: 'text' }
import iconSparkle from './assets/icons/sparkle.svg' with { type: 'text' }
import iconWrench from './assets/icons/wrench.svg' with { type: 'text' }
import iconSend from './assets/icons/arrow-up.svg' with { type: 'text' }
import iconCopy from './assets/icons/copy.svg' with { type: 'text' }
import iconCheck from './assets/icons/check.svg' with { type: 'text' }
import iconRetry from './assets/icons/rotate-ccw.svg' with { type: 'text' }
import iconThumbsUp from './assets/icons/thumbs-up.svg' with { type: 'text' }
import iconThumbsDown from './assets/icons/thumbs-down.svg' with { type: 'text' }
import iconShare from './assets/icons/share.svg' with { type: 'text' }
import iconMore from './assets/icons/ellipsis.svg' with { type: 'text' }

const C = {
  canvas: '#1A1A1A',
  sidebar: '#181818',
  raised: '#232323',
  composer: '#212121',
  overlay: '#E6EAF20D',
  overlayStrong: '#E6EAF217',
  item: '#F0F0F00F',
  border: '#E6EAF212',
  borderStrong: '#E6EAF224',
  sidebarBorder: '#292929',
  text: '#E2E2E2',
  secondary: '#A3A3A3',
  tertiary: '#7D7D7D',
  ghost: '#575757',
  accent: '#E2795B',
  inverse: '#E7E9EC',
  onInverse: '#17181C',
  codeText: '#E0A882',
}

const SIDEBAR_WIDTH = 252
const TRAFFIC_LIGHT_CLEARANCE =
  typeof process !== 'undefined' && process.platform === 'darwin' ? 86 : 8
const CONTENT_MAX_WIDTH = 720
const TITLEBAR_HEIGHT = 48

const FONT_SANS = typeof window === 'undefined' ? 'Helvetica' : 'IBM Plex Sans'
const FONT_MONO = typeof window === 'undefined' ? 'Menlo' : 'Lilex'

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

function Icon({ name, size = 14, color }: { name: IconName; size?: number; color: string }) {
  return <svg source={ICONS[name]} style={{ width: size, height: size, flexShrink: 0, color }} />
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
  codeWash: '#E6EAF214',
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
  { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', group: 'DeepSeek', icon: 'sparkle' as const },
  { id: 'deepseek-v4', label: 'DeepSeek V4', group: 'DeepSeek', icon: 'sparkle' as const },
  { id: 'opus-4.6', label: 'Claude Opus 4.6', group: 'Claude', icon: 'sparkle' as const },
  { id: 'sonnet-4.6', label: 'Claude Sonnet 4.6', group: 'Claude', icon: 'sparkle' as const },
  { id: 'gpt-5.4', label: 'GPT-5.4', group: 'OpenAI', icon: 'sparkle' as const },
  { id: 'grok-4', label: 'Grok 4', group: 'xAI', icon: 'sparkle' as const },
]

const REASONING = [
  { id: 'high', label: 'High', hint: 'Default' },
  { id: 'medium', label: 'Medium', hint: undefined },
  { id: 'low', label: 'Low', hint: undefined },
]

const ACCESS = [
  {
    id: 'ask',
    label: 'Supervised',
    description: 'Ask before every tool call',
    icon: 'lock' as const,
  },
  {
    id: 'edits',
    label: 'Auto-accept edits',
    description: 'Edit files without asking',
    icon: 'pencil' as const,
  },
  {
    id: 'auto',
    label: 'Auto',
    description: 'Run most tools without asking',
    icon: 'sparkle' as const,
  },
  {
    id: 'full',
    label: 'Full access',
    description: 'No permission prompts',
    icon: 'lockOpen' as const,
  },
]

const PROJECTS = [
  { id: 'gpuix', label: 'gpuix' },
  { id: 'example-app', label: 'example-app' },
  { id: 'none', label: 'No project' },
]

const WORKSPACES = [
  { id: 'local', label: 'Local', icon: 'laptop' as const },
  { id: 'worktree', label: 'New worktree', icon: 'gitBranch' as const },
]

const BRANCHES = [
  { id: 'main', label: 'main' },
  { id: 'feat-selectors', label: 'feat/selectors' },
  { id: 'chat-example', label: 'chat-example' },
]

const CONVERSATIONS: Conversation[] = [
  { id: 'c1', title: 'give me a quick overview', group: 'Yesterday', project: 'gpuix', time: '16m' },
  {
    id: 'c2',
    title: 'Native SDK vs GPUI comparison',
    group: 'Yesterday',
    project: 'No project',
    time: '14h',
  },
  {
    id: 'c3',
    title: 'Vercel Labs scriptc implementat...',
    group: 'Yesterday',
    project: 'No project',
    time: '15h',
  },
  {
    id: 'c4',
    title: 'check if any memory optimizatio...',
    group: 'This Month',
    project: 'gpuix',
    time: '2d',
  },
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
  'diff --git a/packages/native/src/diff/mod.rs b/packages/native/src/diff/mod.rs',
  'index 8f2a1c4..d91b7e0 100644',
  '--- a/packages/native/src/diff/mod.rs',
  '+++ b/packages/native/src/diff/mod.rs',
  '@@ -78,12 +78,15 @@ impl FileDiff {',
  ' /// Width of one line-number gutter, fitted to the largest line number.',
  '-pub fn gutter_width(file: &FileDiff) -> f32 {',
  '-    GUTTER_WIDTH',
  '+pub fn gutter_width(file: &FileDiff, metrics: &Metrics) -> f32 {',
  '+    let digits = file.max_line.max(1).ilog10() + 1;',
  '+    (digits as f32 * 6.6 + 8.0 + 6.0).max(metrics.diff_gutter_width)',
  ' }',
].join('\n')

const HOT_RELOAD = `**No.** A \`.node\` cannot unload. The loop rebuilds and restarts.`

const SKILLS = `Skills are \`SKILL.md\` files. A mail-style list on the left, the body on the right.`

const WIRE_MODELS = `Default is DeepSeek V4 Flash. Keep Opus for long diffs. Hide GPT-5.4 behind the picker.`

type Turn =
  | { kind: 'user'; text: string }
  | { kind: 'fold'; duration: string }
  | { kind: 'markdown'; source: string }
  | { kind: 'code'; language: string; source: string }
  | { kind: 'diff'; patch: string }

const TURNS: Turn[] = [
  { kind: 'user', text: 'give me a quick overview' },
  { kind: 'fold', duration: 'Worked for 10 seconds' },
  { kind: 'markdown', source: OVERVIEW },
  { kind: 'user', text: 'How does React reach GPUI?' },
  { kind: 'fold', duration: 'Worked for 6 seconds' },
  { kind: 'markdown', source: ARCHITECTURE },
  { kind: 'user', text: 'How does cross-element text selection work?' },
  { kind: 'fold', duration: 'Worked for 14 seconds' },
  { kind: 'markdown', source: SELECTION },
  { kind: 'code', language: 'rust', source: SELECTION_CODE },
  { kind: 'user', text: 'Make the diff gutter width adapt to the largest line number.' },
  { kind: 'fold', duration: 'Worked for 8 seconds' },
  { kind: 'markdown', source: GUTTER },
  { kind: 'diff', patch: GUTTER_DIFF },
  { kind: 'user', text: 'Do I get hot reload when I edit the Rust side?' },
  { kind: 'fold', duration: 'Worked for 4 seconds' },
  { kind: 'markdown', source: HOT_RELOAD },
  { kind: 'user', text: 'How do skills show up in the app?' },
  { kind: 'fold', duration: 'Worked for 7 seconds' },
  { kind: 'markdown', source: SKILLS },
  { kind: 'user', text: 'Which models should I wire up?' },
  { kind: 'fold', duration: 'Worked for 5 seconds' },
  { kind: 'markdown', source: WIRE_MODELS },
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

function IconButton({
  icon,
  onClick,
  dimmed,
  size = 14,
  testId,
}: {
  icon: IconName
  onClick?: () => void
  dimmed?: boolean
  size?: number
  testId?: string
}) {
  return (
    <div
      testId={testId}
      style={{
        width: 26,
        height: 26,
        flexShrink: 0,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        opacity: dimmed ? 0.35 : 1,
        hover: dimmed ? undefined : { backgroundColor: C.overlay },
        active: dimmed ? undefined : { backgroundColor: C.overlayStrong },
      }}
      onClick={onClick}
    >
      <Icon name={icon} size={size} color={C.tertiary} />
    </div>
  )
}

function SidebarAction({ icon, label }: { icon: IconName; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 32,
        paddingLeft: 4,
        paddingRight: 4,
        borderRadius: 7,
        cursor: 'pointer',
        hover: { backgroundColor: C.item },
        active: { backgroundColor: C.overlayStrong },
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={14} color={C.secondary} />
      </div>
      <text style={{ fontSize: 13, color: C.secondary }}>{label}</text>
    </div>
  )
}

function ConversationRow({
  conversation,
  active,
  onSelect,
}: {
  conversation: Conversation
  active: boolean
  onSelect: (id: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 7,
        paddingBottom: 7,
        borderRadius: 7,
        cursor: 'pointer',
        backgroundColor: active ? C.item : '#00000000',
        hover: { backgroundColor: C.item },
      }}
      onClick={() => onSelect(conversation.id)}
    >
      <text
        style={{
          fontSize: 13.5,
          lineHeight: 18,
          color: C.text,
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {conversation.title}
      </text>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name="folder" size={12.5} color={C.tertiary} />
        <text
          style={{
            fontSize: 13,
            lineHeight: 15,
            color: C.tertiary,
            flexGrow: 1,
            minWidth: 0,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {conversation.project}
        </text>
        <text style={{ fontSize: 12.5, color: C.ghost, flexShrink: 0 }}>{conversation.time}</text>
      </div>
    </div>
  )
}

function Sidebar({
  activeId,
  onSelect,
  onCollapse,
}: {
  activeId: string
  onSelect: (id: string) => void
  onCollapse: () => void
}) {
  const groups = useMemo(() => {
    const out: { name: string; items: Conversation[] }[] = []
    for (const conversation of CONVERSATIONS) {
      const last = out[out.length - 1]
      if (last && last.name === conversation.group) last.items.push(conversation)
      else out.push({ name: conversation.group, items: [conversation] })
    }
    return out
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        height: '100%',
        backgroundColor: C.sidebar,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          height: TITLEBAR_HEIGHT,
          flexShrink: 0,
        }}
      >
        <div style={{ width: TRAFFIC_LIGHT_CLEARANCE, height: '100%', flexShrink: 0 }} />
        <IconButton
          icon="sidebar"
          size={16}
          testId="sidebar-collapse"
          onClick={onCollapse}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            marginLeft: 6,
          }}
        >
          <IconButton icon="arrowLeft" dimmed />
          <IconButton icon="arrowRight" dimmed />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 10, paddingRight: 10 }}>
        <SidebarAction icon="compose" label="New Task" />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          minHeight: 0,
          overflowY: 'scroll',
          paddingLeft: 10,
          paddingRight: 10,
        }}
      >
        <div style={{ paddingBottom: 6 }}>
          <SidebarAction icon="search" label="Search" />
        </div>
        {groups.map((group, groupIndex) => (
          <div
            key={group.name}
            style={{ display: 'flex', flexDirection: 'column', paddingBottom: 10 }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                height: 28,
                paddingLeft: 8,
                paddingRight: 8,
              }}
            >
              <text
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: C.secondary,
                  flexGrow: 1,
                  minWidth: 0,
                }}
              >
                {group.name}
              </text>
              {groupIndex === 0 && <Icon name="listFilter" size={14} color={C.secondary} />}
            </div>
            {group.items.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === activeId}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          height: 40,
          flexShrink: 0,
          paddingLeft: 10,
          paddingRight: 10,
        }}
      >
        <IconButton icon="settings" />
      </div>
    </div>
  )
}

function UserTurn({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        width: '100%',
      }}
    >
      <div
        style={{
          maxWidth: 540,
          minWidth: 0,
          backgroundColor: C.raised,
          borderRadius: 12,
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 12,
          paddingRight: 12,
        }}
      >
        <text style={{ fontSize: 14, lineHeight: 20, color: C.text, minWidth: 0, maxWidth: '100%' }}>{text}</text>
      </div>
    </div>
  )
}

function WorkedFor({ duration }: { duration: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 24,
        width: '100%',
      }}
    >
      <div style={{ height: 1, flexGrow: 1, backgroundColor: C.border }} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          flexShrink: 0,
        }}
      >
        <text style={{ fontSize: 13.5, lineHeight: 18, fontWeight: 500, color: C.tertiary }}>
          {duration}
        </text>
        <Icon name="chevronRight" size={11.5} color={C.tertiary} />
      </div>
      <div style={{ height: 1, flexGrow: 1, backgroundColor: C.border }} />
    </div>
  )
}

const ROW_INNER_STYLE = { width: CONTENT_MAX_WIDTH, maxWidth: '100%' } as const
const ROW_STYLE = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  width: '100%',
  paddingTop: 8,
  paddingBottom: 8,
  paddingLeft: 20,
  paddingRight: 20,
} as const
const ROW_STYLE_FIRST = { ...ROW_STYLE, paddingTop: 22 } as const
const ROW_STYLE_LAST = { ...ROW_STYLE, paddingBottom: 22 } as const
const ROW_STYLE_ONLY = { ...ROW_STYLE, paddingTop: 22, paddingBottom: 22 } as const

function TranscriptRow({
  children,
  first,
  last,
}: {
  children: React.ReactNode
  first?: boolean
  last?: boolean
}) {
  const style = first && last ? ROW_STYLE_ONLY : first ? ROW_STYLE_FIRST : last ? ROW_STYLE_LAST : ROW_STYLE
  return (
    <div style={style}>
      <div style={ROW_INNER_STYLE}>{children}</div>
    </div>
  )
}

const CODE_CARD_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  minWidth: 0,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: C.border,
  backgroundColor: '#FFFFFF09',
  overflow: 'hidden',
} as const
const CODE_HEADER_STYLE = {
  paddingLeft: 12,
  paddingRight: 12,
  paddingTop: 5,
  paddingBottom: 5,
  borderBottomWidth: 1,
  borderColor: C.border,
  backgroundColor: '#FFFFFF05',
} as const
const CODE_BODY_STYLE = {
  minWidth: 0,
  paddingLeft: 12,
  paddingRight: 12,
  paddingTop: 10,
  paddingBottom: 10,
} as const

/**
 * The card `<code>` used to paint for you. The native element is a bare
 * surface now, so the roundness, the fill and the language header live here,
 * in app code, where they can match the rest of the design.
 */
function CodeBlock({
  code,
  language,
  showLineNumbers,
}: {
  code: string
  language?: string
  showLineNumbers?: boolean
}) {
  return (
    <div style={CODE_CARD_STYLE}>
      {language && (
        <div style={CODE_HEADER_STYLE}>
          <text style={{ fontSize: 12, color: C.secondary }}>{language}</text>
        </div>
      )}
      <code
        code={code}
        language={language}
        showLineNumbers={showLineNumbers}
        theme={CHAT_THEME}
        style={CODE_BODY_STYLE}
      />
    </div>
  )
}

function expandTurns(count: number): Turn[] {
  if (count <= TURNS.length) return TURNS.slice(0, count)
  const out = new Array<Turn>(count)
  for (let i = 0; i < count; i++) {
    out[i] = TURNS[i % TURNS.length]!
  }
  return out
}

const Transcript = memo(function Transcript({
  turns,
  includeSafeMdx = false,
  listRef,
}: {
  turns: Turn[]
  includeSafeMdx?: boolean
  listRef?: React.Ref<PublicInstance>
}) {
  return (
    <virtual-list
      ref={listRef}
      overdraw={240}
      estimatedItemHeight={220}
      style={{ flexGrow: 1, minHeight: 0, width: '100%' }}
    >
      {includeSafeMdx && (
        <TranscriptRow key="safemdx" first>
          <UserTurn text="Can Markdown be composed as normal React elements instead?" />
          <SafeMdxContent source={SAFE_MDX_STRESS} />
        </TranscriptRow>
      )}
      {turns.map((turn, index) => (
        <TranscriptRow
          key={index}
          first={!includeSafeMdx && index === 0}
          last={index === turns.length - 1}
        >
          {turn.kind === 'user' && <UserTurn text={turn.text} />}
          {turn.kind === 'fold' && <WorkedFor duration={turn.duration} />}
          {turn.kind === 'markdown' && <SafeMdxContent source={turn.source} />}
          {turn.kind === 'code' && (
            <CodeBlock code={turn.source} language={turn.language} showLineNumbers />
          )}
          {turn.kind === 'diff' && <diff patch={turn.patch} wordDiff theme={CHAT_THEME} />}
        </TranscriptRow>
      ))}
    </virtual-list>
  )
})

function Header({
  collapsed,
  onExpand,
  title,
  turnCount,
}: {
  collapsed: boolean
  onExpand: () => void
  title: string
  turnCount: number
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: TITLEBAR_HEIGHT,
        flexShrink: 0,
        paddingLeft: collapsed ? 0 : 14,
        paddingRight: 14,
        userSelect: 'none',
      }}
    >
      {collapsed && (
        <>
          <div style={{ width: TRAFFIC_LIGHT_CLEARANCE - 8, height: '100%', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <IconButton icon="sidebar" testId="sidebar-expand" onClick={onExpand} />
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <IconButton icon="arrowLeft" dimmed />
              <IconButton icon="arrowRight" dimmed />
            </div>
          </div>
        </>
      )}
      <text
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: C.text,
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          minWidth: 0,
          flexShrink: 1,
        }}
      >
        {title}
      </text>
      {turnCount > TURNS.length && (
        <text style={{ fontSize: 12, fontWeight: 500, color: C.tertiary, flexShrink: 0 }}>
          {turnCount.toLocaleString('en-US')} messages
        </text>
      )}
      <div style={{ flexGrow: 1 }} />
      <IconButton icon="panelRight" />
    </div>
  )
}

const MENU = {
  minWidth: 220,
  paddingTop: 4,
  paddingBottom: 4,
  paddingLeft: 4,
  paddingRight: 4,
  backgroundColor: C.raised,
  borderWidth: 1,
  borderColor: C.borderStrong,
  borderRadius: 12,
} satisfies StyleDesc

function MenuRow({
  label,
  description,
  icon,
  selected,
  highlighted,
  hint,
}: {
  label: string
  description?: string
  icon?: IconName
  selected: boolean
  highlighted: boolean
  hint?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        paddingTop: description ? 6 : 5,
        paddingBottom: description ? 6 : 5,
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: 7,
        backgroundColor: highlighted ? '#404040' : selected ? '#2C2C2C' : C.raised,
        hover: { backgroundColor: '#404040' },
      }}
    >
      {icon && <Icon name={icon} size={14} color={C.tertiary} />}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        <text
          style={{
            fontSize: 12.5,
            fontWeight: selected ? 600 : 500,
            color: C.text,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </text>
        {description && (
          <text style={{ fontSize: 12.5, lineHeight: 14, color: C.tertiary, paddingTop: 2 }}>
            {description}
          </text>
        )}
      </div>
      {hint && <text style={{ fontSize: 11.5, color: C.ghost, flexShrink: 0 }}>{hint}</text>}
      {selected && <Icon name="check" size={11} color={C.tertiary} />}
    </div>
  )
}

function ChipSelect({
  value,
  onChange,
  icon,
  label,
  caret = true,
  accent,
  menuWidth,
  testId,
  children,
}: {
  value: string
  onChange: (next: string) => void
  icon: IconName
  label: string
  caret?: boolean
  accent?: boolean
  menuWidth?: number
  testId?: string
  children: React.ReactNode
}) {
  return (
    <Select value={value} onValueChange={onChange} style={{ flexShrink: 0 }}>
      <div style={{ position: 'relative', display: 'flex' }}>
        <SelectTrigger
          testId={testId}
          style={(state) => ({
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            height: 26,
            paddingLeft: 7,
            paddingRight: 7,
            borderRadius: 6,
            cursor: 'pointer',
            backgroundColor: state.open ? C.overlay : '#00000000',
            hover: { backgroundColor: C.overlay },
          })}
        >
          <Icon name={icon} size={12} color={accent ? C.accent : C.tertiary} />
          <text
            style={{
              fontSize: 13,
              lineHeight: 16,
              color: accent ? C.accent : C.secondary,
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </text>
          {caret && <Icon name="chevronDown" size={10.5} color={C.ghost} />}
        </SelectTrigger>
        <SelectContent side="top" sideOffset={4} style={{ ...MENU, minWidth: menuWidth ?? 220 }}>
          {children}
        </SelectContent>
      </div>
    </Select>
  )
}

function ModelPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const selected = MODELS.find((model) => model.id === value) ?? MODELS[0]
  const groups = useMemo(() => {
    const out: { name: string; items: typeof MODELS }[] = []
    for (const model of MODELS) {
      const last = out[out.length - 1]
      if (last && last.name === model.group) last.items.push(model)
      else out.push({ name: model.group, items: [model] })
    }
    return out
  }, [])

  return (
    <ChipSelect
      value={value}
      onChange={onChange}
      icon={selected.icon}
      label={selected.label}
      testId="model-picker"
    >
      {groups.map((group, index) => (
        <div key={group.name} style={{ display: 'flex', flexDirection: 'column' }}>
          {index > 0 && (
            <div style={{ height: 1, backgroundColor: C.border, marginTop: 4, marginBottom: 4 }} />
          )}
          <SelectLabel
            style={{
              height: 22,
              paddingLeft: 8,
              paddingRight: 8,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <text style={{ fontSize: 11.5, fontWeight: 500, color: C.ghost }}>{group.name}</text>
          </SelectLabel>
          {group.items.map((model) => (
            <SelectItem key={model.id} value={model.id} textValue={model.label}>
              {(state) => (
                <MenuRow
                  label={model.label}
                  icon={model.icon}
                  selected={state.selected}
                  highlighted={state.highlighted}
                />
              )}
            </SelectItem>
          ))}
        </div>
      ))}
    </ChipSelect>
  )
}

function ReasoningPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const selected = REASONING.find((option) => option.id === value) ?? REASONING[0]
  return (
    <ChipSelect
      value={value}
      onChange={onChange}
      icon={value === 'low' ? 'zap' : 'sparkle'}
      label={selected.label}
      caret={false}
    >
      <SelectLabel
        style={{
          height: 22,
          paddingLeft: 8,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <text style={{ fontSize: 11.5, fontWeight: 500, color: C.ghost }}>Reasoning</text>
      </SelectLabel>
      {REASONING.map((option) => (
        <SelectItem key={option.id} value={option.id} textValue={option.label}>
          {(state) => (
            <MenuRow
              label={option.label}
              hint={option.hint}
              selected={state.selected}
              highlighted={state.highlighted}
            />
          )}
        </SelectItem>
      ))}
    </ChipSelect>
  )
}

function AccessPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const selected = ACCESS.find((option) => option.id === value) ?? ACCESS[3]
  return (
    <ChipSelect
      value={value}
      onChange={onChange}
      icon={selected.icon}
      label={selected.label}
      caret={false}
      menuWidth={288}
    >
      {ACCESS.map((option) => (
        <SelectItem key={option.id} value={option.id} textValue={option.label}>
          {(state) => (
            <MenuRow
              label={option.label}
              description={option.description}
              icon={option.icon}
              selected={state.selected}
              highlighted={state.highlighted}
            />
          )}
        </SelectItem>
      ))}
    </ChipSelect>
  )
}

function ProjectPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const selected = PROJECTS.find((option) => option.id === value) ?? PROJECTS[0]
  return (
    <ChipSelect
      value={value}
      onChange={onChange}
      icon="folder"
      label={selected.label}
      caret={false}
    >
      {PROJECTS.map((option) => (
        <SelectItem key={option.id} value={option.id} textValue={option.label}>
          {(state) => (
            <MenuRow
              label={option.label}
              icon="folder"
              selected={state.selected}
              highlighted={state.highlighted}
            />
          )}
        </SelectItem>
      ))}
    </ChipSelect>
  )
}

function WorkspacePicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const selected = WORKSPACES.find((option) => option.id === value) ?? WORKSPACES[0]
  return (
    <ChipSelect
      value={value}
      onChange={onChange}
      icon={selected.icon}
      label={selected.label}
      caret={false}
    >
      <SelectLabel
        style={{
          height: 22,
          paddingLeft: 8,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <text style={{ fontSize: 11.5, fontWeight: 500, color: C.ghost }}>Work in</text>
      </SelectLabel>
      {WORKSPACES.map((option) => (
        <SelectItem key={option.id} value={option.id} textValue={option.label}>
          {(state) => (
            <MenuRow
              label={option.label}
              icon={option.icon}
              selected={state.selected}
              highlighted={state.highlighted}
            />
          )}
        </SelectItem>
      ))}
    </ChipSelect>
  )
}

function BranchPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const selected = BRANCHES.find((option) => option.id === value) ?? BRANCHES[0]
  return (
    <ChipSelect value={value} onChange={onChange} icon="gitBranch" label={selected.label}>
      {BRANCHES.map((option) => (
        <SelectItem key={option.id} value={option.id} textValue={option.label}>
          {(state) => (
            <MenuRow
              label={option.label}
              icon="gitBranch"
              selected={state.selected}
              highlighted={state.highlighted}
            />
          )}
        </SelectItem>
      ))}
    </ChipSelect>
  )
}

function ModeToggle({
  value,
  onChange,
}: {
  value: 'build' | 'plan'
  onChange: (next: 'build' | 'plan') => void
}) {
  const plan = value === 'plan'
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 26,
        paddingLeft: 7,
        paddingRight: 7,
        borderRadius: 6,
        cursor: 'pointer',
        hover: { backgroundColor: C.overlay },
      }}
      onClick={() => onChange(plan ? 'build' : 'plan')}
    >
      <Icon name={plan ? 'list' : 'wrench'} size={12} color={plan ? C.accent : C.tertiary} />
      <text style={{ fontSize: 13, lineHeight: 16, color: plan ? C.accent : C.secondary }}>
        {plan ? 'Plan' : 'Build'}
      </text>
    </div>
  )
}

function Composer({
  value,
  onChange,
  onSend,
  model,
  onModelChange,
  reasoning,
  onReasoningChange,
  access,
  onAccessChange,
  mode,
  onModeChange,
}: {
  value: string
  onChange: (next: string) => void
  onSend: (text: string) => void
  model: string
  onModelChange: (next: string) => void
  reasoning: string
  onReasoningChange: (next: string) => void
  access: string
  onAccessChange: (next: string) => void
  mode: 'build' | 'plan'
  onModeChange: (next: 'build' | 'plan') => void
}) {
  const ready = value.trim().length > 0
  const send = (text: string) => {
    const next = text.trim()
    if (!next) return
    onSend(next)
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
        paddingLeft: 20,
        paddingRight: 20,
        overflow: 'visible',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: CONTENT_MAX_WIDTH,
          overflow: 'visible',
          backgroundColor: C.composer,
          borderRadius: 13,
          borderWidth: 1,
          borderColor: C.border,
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
        <textarea
          testId="composer"
          value={value}
          placeholder="Do anything..."
          minRows={1}
          maxRows={3}
          autoFocus
          theme={CHAT_THEME}
          style={{
            width: '100%',
            minWidth: 0,
            fontSize: 14,
            lineHeight: 20,
            color: C.text,
            backgroundColor: '#00000000',
            borderWidth: 0,
            paddingLeft: 10,
            paddingRight: 10,
          }}
          onChange={(event) => onChange(event.value ?? '')}
          onSubmit={(event) => send(event.value ?? value)}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginTop: 8,
            paddingLeft: 10,
            paddingRight: 10,
          }}
        >
          <ModelPicker value={model} onChange={onModelChange} />
          <ReasoningPicker value={reasoning} onChange={onReasoningChange} />
          <AccessPicker value={access} onChange={onAccessChange} />
          <ModeToggle value={mode} onChange={onModeChange} />
          <div style={{ flexGrow: 1 }} />
          <div
            testId="send"
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: ready ? 'pointer' : undefined,
              backgroundColor: ready ? C.inverse : C.overlayStrong,
              hover: ready ? { opacity: 0.9 } : undefined,
            }}
            onClick={() => send(value)}
          >
            <Icon name="send" size={16} color={ready ? C.onInverse : C.ghost} />
          </div>
        </div>
      </div>
    </div>
  )
}

function WorkspaceFooter({
  project,
  onProjectChange,
  workspace,
  onWorkspaceChange,
  branch,
  onBranchChange,
}: {
  project: string
  onProjectChange: (next: string) => void
  workspace: string
  onWorkspaceChange: (next: string) => void
  branch: string
  onBranchChange: (next: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 4,
        paddingBottom: 8,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          width: '100%',
          maxWidth: CONTENT_MAX_WIDTH,
          height: 28,
          paddingLeft: 10,
          paddingRight: 10,
        }}
      >
        <ProjectPicker value={project} onChange={onProjectChange} />
        <WorkspacePicker value={workspace} onChange={onWorkspaceChange} />
        {project !== 'none' && <BranchPicker value={branch} onChange={onBranchChange} />}
        <div style={{ flexGrow: 1 }} />
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#3B82F6',
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  )
}

function GhostButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: IconName
  label?: string
  active?: boolean
  onClick?: () => void
}) {
  const color = active ? C.text : C.ghost
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 30,
        paddingLeft: label ? 9 : 0,
        paddingRight: label ? 11 : 0,
        width: label ? undefined : 30,
        justifyContent: 'center',
        borderRadius: 10,
        cursor: 'pointer',
        backgroundColor: active ? C.overlayStrong : '#00000000',
        hover: { backgroundColor: C.overlay },
      }}
      onClick={onClick}
    >
      <Icon name={icon} size={16} color={color} />
      {label && <text style={{ fontSize: 12.5, color }}>{label}</text>}
    </div>
  )
}

function ActionBar() {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingTop: 6,
        marginLeft: -7,
        userSelect: 'none',
      }}
    >
      <GhostButton
        icon={copied ? 'check' : 'copy'}
        active={copied}
        onClick={() => setCopied((was) => !was)}
      />
      <GhostButton
        icon="thumbsUp"
        active={feedback === 'up'}
        onClick={() => setFeedback((value) => (value === 'up' ? null : 'up'))}
      />
      <GhostButton
        icon="thumbsDown"
        active={feedback === 'down'}
        onClick={() => setFeedback((value) => (value === 'down' ? null : 'down'))}
      />
      <GhostButton icon="retry" />
      <GhostButton icon="share" />
      <GhostButton icon="more" />
    </div>
  )
}

type MdxChildren = { children?: React.ReactNode }

function flattenMdxTable(children: React.ReactNode): {
  cols: number
  cells: React.ReactElement[]
} {
  const rows: React.ReactElement[][] = []
  React.Children.forEach(children, (section) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(section)) return
    React.Children.forEach(section.props.children, (row) => {
      if (!React.isValidElement<{ children?: React.ReactNode }>(row)) return
      const cells: React.ReactElement[] = []
      React.Children.forEach(row.props.children, (cell) => {
        if (React.isValidElement(cell)) cells.push(cell)
      })
      if (cells.length > 0) rows.push(cells)
    })
  })
  const cols = rows.reduce((max, row) => Math.max(max, row.length), 0)
  const cells: React.ReactElement[] = []
  for (const [rowIndex, row] of rows.entries()) {
    for (let col = 0; col < cols; col++) {
      cells.push(
        col < row.length
          ? React.cloneElement(row[col]!, { key: `${rowIndex}-${col}` })
          : <div key={`pad-${rowIndex}-${col}`} />
      )
    }
  }
  return { cols, cells }
}

function MdxCell({ children, header }: MdxChildren & { header?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        padding: 8,
        minWidth: 96,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        backgroundColor: C.canvas,
        fontSize: 15,
        lineHeight: 26,
        fontWeight: header ? 700 : 400,
        color: C.text,
      }}
    >
      {children}
    </div>
  )
}

function MdxBlock({ children }: MdxChildren) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', minWidth: 0 }}>
      {children}
    </div>
  )
}

const MD_TEXT = {
  fontSize: 15,
  lineHeight: 26,
  color: C.text,
  maxWidth: '100%',
  minWidth: 0,
} as const

function MdxInline({ children, style }: MdxChildren & { style?: StyleDesc }) {
  return <text style={{ ...MD_TEXT, ...style }}>{children}</text>
}

function mdxStringChild(children: React.ReactNode) {
  const items = React.Children.toArray(children)
  if (items.length === 1 && (typeof items[0] === 'string' || typeof items[0] === 'number')) {
    return items[0]
  }
  return null
}

function MdxParagraph({ children }: MdxChildren) {
  const only = mdxStringChild(children)
  if (only != null) {
    return <text style={{ ...MD_TEXT, width: '100%' }}>{only}</text>
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'start',
        width: '100%',
        minWidth: 0,
        fontSize: 15,
        lineHeight: 26,
        color: C.text,
      }}
    >
      {React.Children.map(children, (child) =>
        typeof child === 'string' || typeof child === 'number' ? (
          <text style={MD_TEXT}>{child}</text>
        ) : (
          child
        ),
      )}
    </div>
  )
}

const SAFE_MDX_COMPONENTS = {
  h1: ({ children }: MdxChildren) => (
    <text style={{ fontSize: 22, lineHeight: 30, fontWeight: 700, color: C.text, maxWidth: '100%', minWidth: 0 }}>
      {children}
    </text>
  ),
  h2: ({ children }: MdxChildren) => (
    <text style={{ fontSize: 18, lineHeight: 26, fontWeight: 700, color: C.text, maxWidth: '100%', minWidth: 0 }}>
      {children}
    </text>
  ),
  h3: ({ children }: MdxChildren) => (
    <text style={{ fontSize: 16, lineHeight: 24, fontWeight: 700, color: C.text, maxWidth: '100%', minWidth: 0 }}>
      {children}
    </text>
  ),
  h4: MdxInline,
  h5: MdxInline,
  h6: MdxInline,
  p: MdxParagraph,
  blockquote: ({ children }: MdxChildren) => (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 12, width: '100%', minWidth: 0 }}>
      <div style={{ width: 3, flexShrink: 0, backgroundColor: C.accent }} />
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, gap: 6, color: C.secondary }}>
        {children}
      </div>
    </div>
  ),
  hr: () => <div style={{ height: 1, width: '100%', backgroundColor: C.border }} />,
  ul: MdxBlock,
  ol: MdxBlock,
  li: ({
    children,
    'data-checked': checked,
  }: MdxChildren & { 'data-checked'?: boolean }) => {
    const only = mdxStringChild(children)
    return (
      <div style={{ display: 'flex', flexDirection: 'row', gap: 9, width: '100%', minWidth: 0 }}>
        <text style={{ fontSize: 15, lineHeight: 26, color: C.secondary, flexShrink: 0 }}>
          {checked === undefined ? '•' : checked ? '✓' : '○'}
        </text>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
          {only != null ? <text style={{ ...MD_TEXT, width: '100%' }}>{only}</text> : children}
        </div>
      </div>
    )
  },
  strong: ({ children }: MdxChildren) => <MdxInline style={{ fontWeight: 700 }}>{children}</MdxInline>,
  em: ({ children }: MdxChildren) => <MdxInline style={{ color: C.secondary }}>{children}</MdxInline>,
  del: ({ children }: MdxChildren) => <MdxInline style={{ color: C.ghost }}>{children}</MdxInline>,
  code: ({ children }: MdxChildren) => (
    <MdxInline
      style={{
        fontFamily: FONT_MONO,
        fontSize: 13,
        backgroundColor: C.raised,
        borderRadius: 5,
        paddingLeft: 5,
        paddingRight: 5,
      }}
    >
      {children}
    </MdxInline>
  ),
  a: ({ children }: MdxChildren & { href?: string }) => (
    <MdxInline style={{ color: C.accent }}>{children}</MdxInline>
  ),
  table: ({ children }: MdxChildren) => {
    const { cols, cells } = flattenMdxTable(children)
    if (cols === 0) return null
    return (
      <div style={{ display: 'flex', width: '100%', minWidth: 0, overflowX: 'scroll' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: cols,
            gridColumnMin: 'max-content',
            flexShrink: 0,
            backgroundColor: C.border,
            rowGap: 1,
            columnGap: 1,
          }}
        >
          {cells}
        </div>
      </div>
    )
  },
  thead: MdxBlock,
  tbody: MdxBlock,
  tr: ({ children }: MdxChildren) => <>{children}</>,
  th: ({ children }: MdxChildren) => <MdxCell header>{children}</MdxCell>,
  td: ({ children }: MdxChildren) => <MdxCell>{children}</MdxCell>,
  Callout: ({ children, title }: MdxChildren & { title?: string }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: '100%',
        padding: 12,
        backgroundColor: C.raised,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <text style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{title}</text>
      {children}
    </div>
  ),
}

const mdxCache = new Map<string, Root>()

function parseMdx(source: string) {
  const cached = mdxCache.get(source)
  if (cached) return cached
  const tree = mdxParse(source)
  mdxCache.set(source, tree)
  return tree
}

export function SafeMdxContent({
  source,
  onLinkClick,
}: {
  source: string
  onLinkClick?: (href: string) => void
}) {
  const mdast = useMemo(() => parseMdx(source), [source])
  const components = useMemo(
    () =>
      onLinkClick
        ? {
            ...SAFE_MDX_COMPONENTS,
            a: ({ children, href }) => (
              <div
                style={{ display: 'flex', flexDirection: 'row', cursor: href ? 'pointer' : undefined }}
                onClick={() => href && onLinkClick(href)}
              >
                <MdxInline style={{ color: C.accent }}>{children}</MdxInline>
              </div>
            ),
          }
        : SAFE_MDX_COMPONENTS,
    [onLinkClick]
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', minWidth: 0 }}>
      <SafeMdxRenderer
        markdown={source}
        mdast={mdast}
        components={components}
        renderNode={(node) => {
          if (node.type !== 'code') return undefined
          return <CodeBlock code={node.value} language={node.lang ?? undefined} showLineNumbers />
        }}
      />
    </div>
  )
}

export function SafeMdxTranscript() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30, width: 748 }}>
      <UserTurn text="Can Markdown be composed as normal React elements instead?" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SafeMdxContent source={SAFE_MDX_STRESS} />
        <ActionBar />
      </div>
    </div>
  )
}

export function ChatApp({
  turnCount = TURNS.length,
  includeSafeMdx = false,
}: {
  turnCount?: number
  includeSafeMdx?: boolean
} = {}) {
  const [activeId, setActiveId] = useState('c1')
  const [collapsed, setCollapsed] = useState(false)
  const [draft, setDraft] = useState('')
  const [model, setModel] = useState('deepseek-v4-flash')
  const [reasoning, setReasoning] = useState('high')
  const [access, setAccess] = useState('full')
  const [mode, setMode] = useState<'build' | 'plan'>('build')
  const [project, setProject] = useState('gpuix')
  const [workspace, setWorkspace] = useState('local')
  const [branch, setBranch] = useState('main')

  const [turns, setTurns] = useState(() => expandTurns(turnCount))
  const listRef = useRef<PublicInstance | null>(null)
  const skipScroll = useRef(true)
  const { renderer } = useGpuix()
  const { ime } = useWindowInsets()
  const title = CONVERSATIONS.find((conversation) => conversation.id === activeId)?.title ?? ''
  const rowCount = turns.length + (includeSafeMdx ? 1 : 0)

  useEffect(() => {
    if (skipScroll.current) {
      skipScroll.current = false
      return
    }
    const id = listRef.current?.id
    if (id == null || !renderer?.scrollToItem) return
    renderer.scrollToItem(id, rowCount - 1)
  }, [renderer, rowCount])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        backgroundColor: C.canvas,
        fontFamily: FONT_SANS,
        color: C.text,
      }}
    >
      <motion.div
        initial={false}
        animate={{ width: collapsed ? 0 : SIDEBAR_WIDTH + 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <Sidebar
          activeId={activeId}
          onSelect={setActiveId}
          onCollapse={() => setCollapsed(true)}
        />
        <div style={{ width: 1, height: '100%', flexShrink: 0, backgroundColor: C.sidebarBorder }} />
      </motion.div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          minWidth: 0,
          height: '100%',
          paddingBottom: ime.bottom,
          backgroundColor: C.canvas,
        }}
      >
        <Header
          collapsed={collapsed}
          onExpand={() => setCollapsed(false)}
          title={title}
          turnCount={turns.length}
        />
        <Transcript turns={turns} includeSafeMdx={includeSafeMdx} listRef={listRef} />
        <Composer
          value={draft}
          onChange={setDraft}
          onSend={(text) => {
            setTurns((current) => [...current, { kind: 'user', text }])
            setDraft('')
          }}
          model={model}
          onModelChange={setModel}
          reasoning={reasoning}
          onReasoningChange={setReasoning}
          access={access}
          onAccessChange={setAccess}
          mode={mode}
          onModeChange={setMode}
        />
        <WorkspaceFooter
          project={project}
          onProjectChange={setProject}
          workspace={workspace}
          onWorkspaceChange={setWorkspace}
          branch={branch}
          onBranchChange={setBranch}
        />
      </div>
    </div>
  )
}

const isEntryPoint =
  typeof Bun !== 'undefined'
    ? Bun.isStandaloneExecutable || Bun.main === import.meta.path
    : typeof process !== 'undefined' && process.argv[1]?.endsWith('chat.tsx')

if (isEntryPoint) {
  applyMacCpuThrottleFromEnv()
  render(<ChatApp turnCount={1_000} includeSafeMdx />, {
    title: 'GPUIX Chat · 1,000 messages',
    width: 1180,
    height: 820,
    titlebarTransparent: true,
    windowBackground: 'blurred',
    trafficLightX: 16,
    trafficLightY: 17,
    debugFrameOverlay: 'full',
    // An agent launching this to check its own work must not take the keyboard
    // away from whoever is typing. Automation needs no focus.
    focus: process.env.GPUIX_BACKGROUND !== '1',
  })
}
