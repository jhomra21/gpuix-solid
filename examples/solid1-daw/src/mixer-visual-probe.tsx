import {
  configureNativeStyleManifest,
  createTestRoot,
  hasNativeTestRenderer,
  setNativeStyleColorMode,
  type TestRoot,
} from "@jhomra21/gpuix-solid1"
import { DawSolid1Showcase } from "./app"
import { nativeTailwindManifest } from "./native-tailwind.generated"

type TreeNode = {
  id: number
  testId?: string
  customProps?: Record<string, unknown>
  style?: Record<string, unknown>
  children?: TreeNode[]
}

type ProbeRenderer = TestRoot["renderer"] & { benchmarkTreeJson(): string }
const volume = { "aria-label": "Track 1 volume" } as const

function findNode(node: TreeNode | undefined, predicate: (node: TreeNode) => boolean): TreeNode | undefined {
  if (!node) return undefined
  if (predicate(node)) return node
  for (const child of node.children ?? []) {
    const found = findNode(child, predicate)
    if (found) return found
  }
  return undefined
}

function findAll(node: TreeNode | undefined, predicate: (node: TreeNode) => boolean, output: TreeNode[] = []): TreeNode[] {
  if (!node) return output
  if (predicate(node)) output.push(node)
  for (const child of node.children ?? []) findAll(child, predicate, output)
  return output
}

function bounds(app: TestRoot, id: number) {
  const raw = app.renderer.getElementBounds(id)
  return raw && raw.length >= 4 ? { x: raw[0], y: raw[1], width: raw[2], height: raw[3] } : null
}

function snapshot(app: TestRoot, label: string): void {
  const renderer = app.renderer as ProbeRenderer
  const root = JSON.parse(renderer.benchmarkTreeJson()) as TreeNode
  const input = findNode(root, (node) => node.customProps?.["aria-label"] === volume["aria-label"])
  if (!input) throw new Error("Track 1 volume input missing from native tree")
  const descendant = findNode(input, (node) => node.testId === "gpuix-css-hard-split-fill")
  const globalFills = findAll(root, (node) => node.testId === "gpuix-css-hard-split-fill")
  console.log(`[mixer.visual] ${JSON.stringify({
    label,
    aria: input.customProps?.["aria-valuetext"],
    inputId: input.id,
    inputBounds: bounds(app, input.id),
    descendantFill: descendant ? { id: descendant.id, style: descendant.style, bounds: bounds(app, descendant.id) } : null,
    globalFills: globalFills.map((node) => ({ id: node.id, style: node.style, bounds: bounds(app, node.id) })),
  })}`)
}

async function mountDaw(): Promise<TestRoot> {
  const app = createTestRoot(1440, 900)
  app.render(() => (
    <div testId="daw-test-viewport" style={{ width: "100%", height: "100%", overflow: "scroll" }}>
      <DawSolid1Showcase />
    </div>
  ))
  for (let frame = 0; frame < 3; frame++) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }
  await Promise.resolve()
  app.root.flush()
  app.renderer.flush()
  app.renderer.scrollTestId("daw-test-viewport", -320, 0)
  return app
}

if (!hasNativeTestRenderer) throw new Error("mixer visual probe requires native GPUIX test support")
configureNativeStyleManifest(nativeTailwindManifest)
setNativeStyleColorMode("dark")

const app = await mountDaw()
snapshot(app, "initial")
app.renderer.clickCustomProps({ "aria-label": "Deactivate track 1" })
snapshot(app, "deactivated")
app.renderer.clickCustomProps({ "aria-label": "Solo track 1" })
snapshot(app, "soloed")
app.renderer.clickCustomProps({ "aria-label": "Arm track 1 for recording" })
snapshot(app, "armed")
app.renderer.dragCustomProps(volume, 20, 0)
snapshot(app, "dragged-after-state-changes")
app.unmount()

const second = await mountDaw()
snapshot(second, "second-mount-initial")
second.unmount()
