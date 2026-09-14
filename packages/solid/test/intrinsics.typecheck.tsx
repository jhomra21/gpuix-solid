import type { EventPayload } from "@gpuix/native"
import type { GpuixTheme, PublicInstance, StyleDesc } from "../src/host/types.js"

const style: StyleDesc = {
  display: "flex",
  visibility: "visible",
  flexDirection: "column",
  flexWrap: "wrap",
  flexGrow: 1,
  flexShrink: 0,
  flexBasis: 120,
  alignItems: "center",
  alignSelf: "stretch",
  alignContent: "center",
  justifyContent: "space-between",
  gap: 8,
  rowGap: 6,
  columnGap: 10,
  gridTemplateColumns: 2,
  gridTemplateRows: 3,
  gridColumnMin: "min-content",
  gridRowMin: "max-content",
  width: "100%",
  height: 320,
  minWidth: 120,
  minHeight: 80,
  maxWidth: "90%",
  maxHeight: 640,
  padding: 12,
  paddingTop: 1,
  paddingRight: 2,
  paddingBottom: 3,
  paddingLeft: 4,
  margin: 8,
  marginTop: 1,
  marginRight: 2,
  marginBottom: 3,
  marginLeft: 4,
  position: "absolute",
  top: 1,
  right: 2,
  bottom: 3,
  left: 4,
  background: {
    type: "linear-gradient",
    angle: 90,
    stops: [
      { color: "#7c3aed", position: 0 },
      { color: "#06b6d4", position: 1 },
    ],
    colorSpace: "oklab",
  },
  backgroundColor: "#111",
  color: "#fff",
  opacity: 0.9,
  borderWidth: 1,
  borderColor: "#333",
  borderRadius: 8,
  borderTopLeftRadius: 1,
  borderTopRightRadius: 2,
  borderBottomLeftRadius: 3,
  borderBottomRightRadius: 4,
  fontSize: 14,
  fontFamily: "Inter",
  fontWeight: 600,
  textAlign: "left",
  lineHeight: 20,
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  lineClamp: 2,
  overflow: "hidden",
  overflowX: "hidden",
  overflowY: "scroll",
  cursor: "pointer",
  pointerEvents: "auto",
  userSelect: "text",
  selectionColor: "#3366ff55",
  hover: { opacity: 1 },
  active: { opacity: 0.8 },
}

const theme: GpuixTheme = {
  appearance: "dark",
  bg: "#111",
  border: "#333",
  text: "#fff",
  textMuted: "#bbb",
  textFaint: "#888",
  textDim: "#999",
  accent: "#7aa2f7",
  caret: "#fff",
  codeText: "#ddd",
  codeWash: "#181818",
  diffAdd: "#16351f",
  diffDel: "#3b1b1b",
  diffHunkBg: "#20263a",
  fontSans: "Inter",
  fontMono: "Berkeley Mono",
  syntax: {
    comment: "#777",
    keyword: "#c099ff",
    string: "#9ece6a",
    stringSpecial: "#73daca",
    escape: "#ff9e64",
    number: "#ff9e64",
    boolean: "#ff9e64",
    typeName: "#2ac3de",
    typeBuiltin: "#2ac3de",
    constructor: "#7dcfff",
    function: "#7aa2f7",
    functionBuiltin: "#7aa2f7",
    macroName: "#bb9af7",
    property: "#73daca",
    constant: "#ff9e64",
    variable: "#c0caf5",
    variableSpecial: "#f7768e",
    parameter: "#e0af68",
    operator: "#89ddff",
    punctuation: "#a9b1d6",
    tag: "#f7768e",
    attribute: "#bb9af7",
    label: "#7dcfff",
    invalid: "#f7768e",
  },
  metrics: {
    codeTextSize: 13,
    codeLineHeight: 20,
    codeGutterDigitWidth: 8,
    codeGutterPaddingRight: 8,
    codeGutterMinWidth: 28,
    diffTextSize: 13,
    diffLineHeight: 20,
    diffFileHeaderHeight: 32,
    diffHunkHeaderHeight: 28,
    diffNoticeHeight: 24,
    diffBodyBottomPad: 8,
    diffGutterWidth: 44,
    diffMarkerWidth: 16,
    diffAccentBarWidth: 3,
    diffRowPaddingX: 8,
    mdTextSize: 14,
    mdLineHeight: 22,
    mdBlockGap: 12,
    mdHeadingSizes: [28, 24, 20, 16],
    mdHeadingLineHeights: [34, 30, 26, 22],
    mdTableCellPadding: 8,
    mdTableMinColumnWidth: 80,
    mdTableMinColumnContent: 40,
    mdInlineCodeRadius: 4,
    mdCodePaddingX: 12,
    mdCodePaddingY: 10,
    mdCodeRadius: 8,
    mdCodeHeaderPaddingY: 6,
    mdCodeHeaderTextSize: 11,
  },
}

const onEvent = (_event: EventPayload) => {}

export function IntrinsicSurfaceFixture() {
  let refInstance: PublicInstance | undefined

  return (
    <div
      style={style}
      ref={(instance) => { refInstance = instance }}
      highlight={{ query: "GPUix", activeIndex: 0, radius: 2 }}
      onClick={onEvent}
      onAuxClick={onEvent}
      onMouseDown={onEvent}
      onMouseUp={onEvent}
      onMouseEnter={onEvent}
      onMouseLeave={onEvent}
      onMouseMove={onEvent}
      onMouseDownOutside={onEvent}
      onKeyDown={onEvent}
      onKeyUp={onEvent}
      onFocus={onEvent}
      onBlur={onEvent}
      onScroll={onEvent}
      onChange={onEvent}
      onSubmit={onEvent}
      onToggleFile={onEvent}
      onShowMore={onEvent}
      onLineClick={onEvent}
      onLinkClick={onEvent}
      onHighlight={onEvent}
      autoFocus
      tabIndex={0}
      testId="surface-root"
    >
      <text style={{ color: "#fff" }}>text</text>
      <img src="fixture.png" objectFit="contain" alt="fixture" />
      <svg src="fixture.svg" style={{ color: "#fff" }} />
      <canvas style={{ width: 100, height: 100 }} />
      <input value="value" placeholder="Type" readOnly theme={theme} />
      <textarea value="value" minRows={2} maxRows={6} theme={theme} />
      <anchored
        position={{ x: 20, y: 30 }}
        side="bottom"
        align="center"
        gap={8}
        anchor="bottomCenter"
        offset={{ x: 1, y: 2 }}
        fit="switch"
        snapMargin={10}
        deferred
        priority={1}
        occlude
      >
        <text>anchored</text>
      </anchored>
      <code
        code="const solid = 2"
        language="ts"
        path="fixture.ts"
        showLineNumbers
        showHeader
        theme={theme}
      />
      <diff
        patch="@@ -1 +1 @@\n-old\n+new"
        wordDiff
        collapsedPaths={["old.ts"]}
        scroll
        maxLines={100}
        theme={theme}
        onToggleFile={onEvent}
        onShowMore={onEvent}
        onLineClick={onEvent}
      />
      <markdown source="# GPUIX Solid" theme={theme} onLinkClick={onEvent} />
      <virtual-list
        alignment="bottom"
        followTail
        overdraw={4}
        estimatedItemHeight={28}
        style={{ height: 200 }}
      >
        <text>row</text>
      </virtual-list>
      <virtual-list
        itemCount={200}
        estimatedItemHeight={28}
        windowStart={40}
        style={{ height: 200 }}
      >
        <text>windowed row</text>
      </virtual-list>
      {refInstance ? <text>{refInstance.type}</text> : null}
    </div>
  )
}
