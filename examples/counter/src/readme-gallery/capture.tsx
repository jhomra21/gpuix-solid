import { mkdirSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { createTestRoot, hasNativeTestRenderer } from "gpuix-solid"
import { CodeImageNativeDemo } from "../codeimage/app"
import { DashboardDemo } from "../dashboard/source/app"
import { Gpuix08Showcase } from "../gpuix-08/app"
import { TodoApp } from "../todo/app"

type Capture = {
  name: string
  width: number
  height: number
  render: () => unknown
}

const outputDir = resolve(process.cwd(), "docs/images")
mkdirSync(outputDir, { recursive: true })

if (!hasNativeTestRenderer) {
  throw new Error("README gallery capture requires the native TestGpuixRenderer")
}

const captures: Capture[] = [
  {
    name: "gpuix-08",
    width: 860,
    height: 720,
    render: () => <Gpuix08Showcase />,
  },
  {
    name: "dashboard",
    width: 1100,
    height: 720,
    render: () => <DashboardDemo />,
  },
  {
    name: "codeimage",
    width: 1280,
    height: 800,
    render: () => <CodeImageNativeDemo />,
  },
  {
    name: "todo",
    width: 940,
    height: 660,
    render: () => <TodoApp />,
  },
]

for (const capture of captures) {
  const root = createTestRoot(capture.width, capture.height)
  root.renderer.clockPause()
  root.render(capture.render)

  try {
    const path = resolve(outputDir, `${capture.name}.png`)
    root.renderer.captureScreenshot(path)
    const size = statSync(path).size
    if (size <= 0) throw new Error(`Empty screenshot: ${path}`)
    console.log(`${capture.name}: ${capture.width}x${capture.height}, ${size} bytes`)
  } finally {
    root.unmount()
  }
}
