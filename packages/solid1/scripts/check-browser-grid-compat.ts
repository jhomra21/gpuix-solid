import {
  browserGridContainerStyle,
  browserGridItemStyle,
  parseBrowserGridTemplateColumns,
} from "../src/browser-grid-compat.js"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const expanded = parseBrowserGridTemplateColumns("minmax(76px, 1fr) minmax(96px, 1.2fr) 101px")
requireCondition(expanded?.length === 3, "expanded track grid should parse three source columns")
requireCondition(browserGridContainerStyle(expanded)?.display === "flex", "browser grid should translate to a native flex row")
requireCondition(browserGridItemStyle(expanded, 1)?.minWidth === 76, "first expanded track column should preserve its 76px minimum")
requireCondition(browserGridItemStyle(expanded, 1)?.flexGrow === 1, "first expanded track column should preserve 1fr")
requireCondition(browserGridItemStyle(expanded, 2)?.minWidth === 96, "second expanded track column should preserve its 96px minimum")
requireCondition(browserGridItemStyle(expanded, 2)?.flexGrow === 1.2, "second expanded track column should preserve 1.2fr")
requireCondition(browserGridItemStyle(expanded, 3)?.width === 101, "expanded track controls should preserve the fixed 101px source column")

const controls = parseBrowserGridTemplateColumns("3fr 1fr 1fr")
requireCondition(browserGridItemStyle(controls, 1)?.flexGrow === 3, "mute/volume column should preserve 3fr")
requireCondition(browserGridItemStyle(controls, 2)?.flexGrow === 1, "solo/automation column should preserve 1fr")
requireCondition(browserGridItemStyle(controls, 3)?.flexGrow === 1, "arm/add column should preserve 1fr")

const collapsed = parseBrowserGridTemplateColumns("18px 12px 12px 1fr")
requireCondition(browserGridItemStyle(collapsed, 1)?.width === 18, "collapsed mute column should preserve 18px")
requireCondition(browserGridItemStyle(collapsed, 2)?.width === 12, "collapsed solo column should preserve 12px")
requireCondition(browserGridItemStyle(collapsed, 3)?.width === 12, "collapsed arm column should preserve 12px")
requireCondition(browserGridItemStyle(collapsed, 4)?.flexGrow === 1, "collapsed volume column should preserve the remaining 1fr")

const master = parseBrowserGridTemplateColumns("minmax(72px,96px) minmax(96px,1fr) 101px")
const masterLeft = browserGridItemStyle(master, 1)
requireCondition(masterLeft?.width === 96 && masterLeft.minWidth === 72 && masterLeft.maxWidth === 96, "master left column should preserve its bounded minmax track")
requireCondition(browserGridItemStyle(master, 2)?.minWidth === 96, "master middle column should preserve its 96px minimum")
requireCondition(browserGridItemStyle(master, 3)?.width === 101, "master controls should preserve 101px")

const eq = parseBrowserGridTemplateColumns("72px minmax(220px, 1fr) 72px")
requireCondition(browserGridItemStyle(eq, 1)?.width === 72, "EQ left rail should preserve 72px")
requireCondition(browserGridItemStyle(eq, 2)?.minWidth === 220 && browserGridItemStyle(eq, 2)?.flexGrow === 1, "EQ graph should preserve minmax(220px,1fr)")
requireCondition(browserGridItemStyle(eq, 3)?.width === 72, "EQ right rail should preserve 72px")

requireCondition(parseBrowserGridTemplateColumns("repeat(3, 1fr)") === undefined, "unsupported grid syntax must fail closed instead of being approximated silently")
requireCondition(parseBrowserGridTemplateColumns("minmax(min-content, 1fr) 1fr") === undefined, "unsupported intrinsic grid tracks must fail closed")

console.log("solid1 browser grid compatibility: passed")
