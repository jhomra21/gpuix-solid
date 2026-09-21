import {
  createElement,
  createTextNode,
  insertNode,
  setProp,
} from "../../../packages/solid/src/host/universal.ts"

export type MediaBunnyFrame = {
  data: Uint8Array
  width: number
  height: number
}

function addText(parent: ReturnType<typeof createElement>, value: string, fontSize: number) {
  const label = createElement("text")
  setProp(label, "style", {
    color: "#d8dee9",
    fontSize,
  })
  insertNode(label, createTextNode(value))
  insertNode(parent, label)
}

function addSurface(
  parent: ReturnType<typeof createElement>,
  label: string,
  objectFit: "contain" | "cover" | "fill",
  frame: MediaBunnyFrame,
) {
  const column = createElement("div")
  setProp(column, "style", {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 0,
    height: "100%",
  })
  addText(column, label, 14)

  const shell = createElement("div")
  setProp(shell, "style", {
    display: "flex",
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
    backgroundColor: "#20252e",
    borderRadius: 8,
    padding: 8,
  })

  const surface = createElement("video-frame")
  setProp(surface, "testId", `mediabunny-${objectFit}`)
  setProp(surface, "style", {
    width: "100%",
    height: "100%",
    minWidth: 0,
    minHeight: 0,
  })
  setProp(surface, "objectFit", objectFit)
  setProp(surface, "alt", `MediaBunny ${objectFit} frame`)
  setProp(surface, "frame", frame)

  insertNode(shell, surface)
  insertNode(column, shell)
  insertNode(parent, column)
  return surface
}

export function createMediaBunnyLiveLayout(frame: MediaBunnyFrame) {
  const root = createElement("div")
  setProp(root, "style", {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    width: "100%",
    height: "100%",
    minWidth: 0,
    minHeight: 0,
    padding: 20,
    backgroundColor: "#101318",
  })

  addText(root, "MediaBunny → GPUix native video-frame", 22)
  addText(root, "Frames update 4×/sec. Resize the window and compare contain / cover / fill.", 13)

  const row = createElement("div")
  setProp(row, "style", {
    display: "flex",
    flexDirection: "row",
    gap: 14,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 0,
    width: "100%",
  })
  insertNode(root, row)

  const surfaces = [
    addSurface(row, "contain", "contain", frame),
    addSurface(row, "cover", "cover", frame),
    addSurface(row, "fill", "fill", frame),
  ]

  return { root, surfaces }
}
