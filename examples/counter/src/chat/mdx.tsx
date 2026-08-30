import type { Root } from "mdast"
import { mdxParse } from "safe-mdx/parse"
import { createMemo, type Element as SolidElement } from "solid-js"
import type { StyleDesc } from "gpuix-solid"

const C = {
  canvas: "#1A1A1A",
  raised: "#232323",
  border: "#E6EAF212",
  text: "#E2E2E2",
  secondary: "#A3A3A3",
  ghost: "#575757",
  accent: "#E2795B",
} as const

const FONT_MONO = process.platform === "darwin" ? "Menlo" : "monospace"

const MD_TEXT: StyleDesc = {
  fontSize: 15,
  lineHeight: 26,
  color: C.text,
  maxWidth: "100%",
  minWidth: 0,
}

const CODE_BODY_STYLE: StyleDesc = {
  minWidth: 0,
  paddingLeft: 12,
  paddingRight: 12,
  paddingTop: 10,
  paddingBottom: 10,
}

const CHAT_THEME = {
  text: C.text,
  textMuted: C.secondary,
  textFaint: C.ghost,
  textDim: C.secondary,
  border: C.border,
  bg: C.canvas,
  accent: C.accent,
  caret: C.accent,
  codeText: "#E0A882",
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

interface MdxText {
  type: "text"
  value: string
}

interface MdxInlineCode {
  type: "inlineCode"
  value: string
}

interface MdxBreak {
  type: "break"
}

interface MdxStrong {
  type: "strong"
  children: ChatMdxInline[]
}

interface MdxEmphasis {
  type: "emphasis"
  children: ChatMdxInline[]
}

interface MdxDelete {
  type: "delete"
  children: ChatMdxInline[]
}

interface MdxLink {
  type: "link"
  url: string
  children: ChatMdxInline[]
}

interface MdxJsxTextElement {
  type: "mdxJsxTextElement"
  name: string | null
  children: ChatMdxInline[]
}

type ChatMdxInline =
  | MdxText
  | MdxInlineCode
  | MdxBreak
  | MdxStrong
  | MdxEmphasis
  | MdxDelete
  | MdxLink
  | MdxJsxTextElement

interface MdxHeading {
  type: "heading"
  depth: 1 | 2 | 3 | 4 | 5 | 6
  children: ChatMdxInline[]
}

interface MdxParagraph {
  type: "paragraph"
  children: ChatMdxInline[]
}

interface MdxBlockquote {
  type: "blockquote"
  children: ChatMdxBlock[]
}

interface MdxThematicBreak {
  type: "thematicBreak"
}

interface MdxList {
  type: "list"
  children: MdxListItem[]
}

interface MdxListItem {
  type: "listItem"
  checked?: boolean | null
  children: Array<MdxParagraph | MdxList>
}

interface MdxTableCell {
  type: "tableCell"
  children: ChatMdxInline[]
}

interface MdxTableRow {
  type: "tableRow"
  children: MdxTableCell[]
}

interface MdxTable {
  type: "table"
  children: MdxTableRow[]
}

interface MdxCode {
  type: "code"
  value: string
  lang?: string | null
}

interface MdxJsxAttribute {
  type: "mdxJsxAttribute"
  name: string
  value: string | null
}

interface MdxJsxFlowElement {
  type: "mdxJsxFlowElement"
  name: string | null
  attributes: MdxJsxAttribute[]
  children: ChatMdxBlock[]
}

interface MdxHtml {
  type: "html"
  value: string
}

interface MdxYaml {
  type: "yaml"
  value: string
}

type ChatMdxBlock =
  | MdxHeading
  | MdxParagraph
  | MdxBlockquote
  | MdxThematicBreak
  | MdxList
  | MdxTable
  | MdxCode
  | MdxJsxFlowElement
  | MdxHtml
  | MdxYaml

type ChatMdxTextNode = ChatMdxBlock | MdxListItem | MdxTableRow | MdxTableCell
type LinkHandler = (href: string) => void

type ChatMdxRoot = Omit<Root, "children"> & {
  children: ChatMdxBlock[]
}

function parseChatMdx(source: string): ChatMdxRoot {
  // SAFETY: safe-mdx returns an mdast Root after remark-mdx, remark-gfm, and
  // frontmatter parsing. ChatMdxRoot names the subset this example renders.
  return mdxParse(source) as ChatMdxRoot
}

function inlineText(node: ChatMdxInline): string {
  switch (node.type) {
    case "text":
    case "inlineCode":
      return node.value
    case "break":
      return "\n"
    case "strong":
    case "emphasis":
    case "delete":
    case "link":
    case "mdxJsxTextElement":
      return node.children.map(inlineText).join("")
  }
}

function blockText(node: ChatMdxTextNode): string {
  switch (node.type) {
    case "heading":
    case "paragraph":
    case "tableCell":
      return node.children.map(inlineText).join("")
    case "blockquote":
    case "mdxJsxFlowElement":
    case "listItem":
      return node.children.map(blockText).join("")
    case "list":
    case "table":
    case "tableRow":
      return node.children.map(blockText).join("")
    case "code":
    case "html":
    case "yaml":
      return node.value
    case "thematicBreak":
      return ""
  }
}

function jsxAttribute(node: MdxJsxFlowElement, name: string): string | undefined {
  return node.attributes.find((attribute) => attribute.name === name)?.value ?? undefined
}

function renderInline(
  node: ChatMdxInline,
  key: string,
  onLinkClick?: LinkHandler,
): SolidElement {
  switch (node.type) {
    case "text":
      return <text testId={`mdx-${key}`} style={MD_TEXT}>{node.value}</text>
    case "inlineCode":
      return (
        <text
          testId={`mdx-${key}`}
          style={{
            ...MD_TEXT,
            fontFamily: FONT_MONO,
            fontSize: 13,
            backgroundColor: C.raised,
            borderRadius: 5,
            paddingLeft: 5,
            paddingRight: 5,
          }}
        >
          {node.value}
        </text>
      )
    case "strong":
      return <text style={{ ...MD_TEXT, fontWeight: 700 }}>{inlineText(node)}</text>
    case "emphasis":
      return <text style={{ ...MD_TEXT, color: C.secondary }}>{inlineText(node)}</text>
    case "delete":
      return <text style={{ ...MD_TEXT, color: C.ghost }}>{inlineText(node)}</text>
    case "link": {
      const text = inlineText(node)
      if (!onLinkClick) return <text style={{ ...MD_TEXT, color: C.accent }}>{text}</text>
      return (
        <text
          testId={`mdx-link-${key}`}
          onClick={() => onLinkClick(node.url)}
          style={{ ...MD_TEXT, color: C.accent, cursor: "pointer" }}
        >
          {text}
        </text>
      )
    }
    case "break":
      return <text style={MD_TEXT}>{"\n"}</text>
    case "mdxJsxTextElement":
      return <text style={MD_TEXT}>{inlineText(node)}</text>
  }
}

function renderTable(node: MdxTable, key: string): SolidElement {
  const columns = node.children.reduce(
    (count, row) => Math.max(count, row.children.length),
    0,
  )
  const cells: SolidElement[] = []

  for (let rowIndex = 0; rowIndex < node.children.length; rowIndex += 1) {
    const row = node.children[rowIndex]
    if (!row) continue
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      const cell = row.children[columnIndex]
      cells.push(
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            padding: 8,
            minWidth: 96,
            flexShrink: 0,
            whiteSpace: "nowrap",
            backgroundColor: C.canvas,
          }}
        >
          <text style={{ ...MD_TEXT, fontWeight: rowIndex === 0 ? 700 : 400 }}>
            {cell ? blockText(cell) : ""}
          </text>
        </div>,
      )
    }
  }

  return (
    <div
      testId={`mdx-table-${key}`}
      style={{ display: "flex", width: "100%", minWidth: 0, overflowX: "scroll" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: Math.max(columns, 1),
          gridColumnMin: "max-content",
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
}

function renderBlock(
  node: ChatMdxBlock,
  key: string,
  onLinkClick?: LinkHandler,
): SolidElement {
  switch (node.type) {
    case "heading": {
      const size = node.depth === 1 ? 22 : node.depth === 2 ? 18 : 16
      return (
        <text
          testId={`mdx-heading-${key}`}
          style={{
            fontSize: size,
            lineHeight: size + 8,
            fontWeight: 700,
            color: C.text,
            maxWidth: "100%",
            minWidth: 0,
          }}
        >
          {blockText(node)}
        </text>
      )
    }
    case "paragraph":
      return (
        <div
          testId={`mdx-paragraph-${key}`}
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "start",
            width: "100%",
            minWidth: 0,
          }}
        >
          {node.children.map((child, index) =>
            renderInline(child, `${key}-${index}`, onLinkClick),
          )}
        </div>
      )
    case "blockquote":
      return (
        <div style={{ display: "flex", flexDirection: "row", gap: 12, width: "100%", minWidth: 0 }}>
          <div style={{ width: 3, flexShrink: 0, backgroundColor: C.accent }} />
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0, gap: 6 }}>
            {node.children.map((child, index) =>
              renderBlock(child, `${key}-${index}`, onLinkClick),
            )}
          </div>
        </div>
      )
    case "thematicBreak":
      return <div style={{ height: 1, width: "100%", backgroundColor: C.border }} />
    case "list":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
          {node.children.map((child, index) =>
            renderListItem(child, `${key}-${index}`, onLinkClick),
          )}
        </div>
      )
    case "table":
      return renderTable(node, key)
    case "code":
      return <CodeBlock code={node.value} language={node.lang ?? undefined} />
    case "mdxJsxFlowElement":
      if (node.name !== "Callout") {
        return <>{node.children.map((child, index) =>
          renderBlock(child, `${key}-${index}`, onLinkClick),
        )}</>
      }
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            width: "100%",
            padding: 12,
            backgroundColor: C.raised,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <text style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>
            {jsxAttribute(node, "title") ?? "Callout"}
          </text>
          {node.children.map((child, index) =>
            renderBlock(child, `${key}-${index}`, onLinkClick),
          )}
        </div>
      )
    case "html":
    case "yaml":
      return <text style={MD_TEXT}>{node.value}</text>
  }
}

function renderListItem(
  node: MdxListItem,
  key: string,
  onLinkClick?: LinkHandler,
): SolidElement {
  const marker = node.checked == null ? "•" : node.checked ? "✓" : "○"
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: 9, width: "100%", minWidth: 0 }}>
      <text style={{ fontSize: 15, lineHeight: 26, color: C.secondary, flexShrink: 0 }}>{marker}</text>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0 }}>
        {node.children.map((child, index) =>
          renderBlock(child, `${key}-${index}`, onLinkClick),
        )}
      </div>
    </div>
  )
}

interface CodeBlockProps {
  code: string
  language?: string | undefined
}

function CodeBlock(props: CodeBlockProps): SolidElement {
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
      {props.language ? (
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
          <text style={{ fontSize: 12, color: C.secondary }}>{props.language}</text>
        </div>
      ) : null}
      {props.language ? (
        <code
          code={props.code}
          language={props.language}
          showLineNumbers
          theme={CHAT_THEME}
          style={CODE_BODY_STYLE}
        />
      ) : (
        <code
          code={props.code}
          showLineNumbers
          theme={CHAT_THEME}
          style={CODE_BODY_STYLE}
        />
      )}
    </div>
  )
}

const mdxCache = new Map<string, ChatMdxRoot>()

function cachedMdx(source: string): ChatMdxRoot {
  const cached = mdxCache.get(source)
  if (cached) return cached
  const tree = parseChatMdx(source)
  mdxCache.set(source, tree)
  return tree
}

export interface SafeMdxContentProps {
  source: string
  onLinkClick?: LinkHandler | undefined
}

export function SafeMdxContent(props: SafeMdxContentProps): SolidElement {
  const tree = createMemo(() => cachedMdx(props.source))
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
        minWidth: 0,
      }}
    >
      {tree().children.map((node, index) =>
        renderBlock(node, `root-${index}`, props.onLinkClick),
      )}
    </div>
  )
}
