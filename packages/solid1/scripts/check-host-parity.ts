import { readFileSync } from "node:fs"
import {
  clearNativeStyleManifest,
  configureNativeStyleManifest,
  resolveNativeClassStyle,
} from "../src/native-style.ts"
import { createHostElement, insertHostNode, setHostProperty } from "../src/host/nodes.ts"

const packageRoot = new URL("../", import.meta.url)
const repoRoot = new URL("../../../", import.meta.url)
const sharedFiles = ["events.ts", "mutations.ts", "nodes.ts", "types.ts"] as const

for (const file of sharedFiles) {
  const solid1 = readFileSync(new URL(`src/host/${file}`, packageRoot), "utf8")
  const solid2 = readFileSync(new URL(`packages/solid/src/host/${file}`, repoRoot), "utf8")
  if (solid1 !== solid2) {
    throw new Error(`Solid 1 host mirror drifted from Solid 2: ${file}`)
  }
}

configureNativeStyleManifest({
  classes: {
    "bg-app-surface": { base: { backgroundColor: "#111111" } },
    "text-foreground": { base: { color: "#eeeeee" } },
  },
})
const combinedClassListStyle = resolveNativeClassStyle(undefined, {
  "bg-app-surface text-foreground": true,
})
clearNativeStyleManifest()
if (combinedClassListStyle?.backgroundColor !== "#111111" || combinedClassListStyle.color !== "#eeeeee") {
  throw new Error("Solid 1 native classList must split multi-class keys before manifest lookup")
}

const selectorRoot = createHostElement("div", "section")
const selectorButton = createHostElement("div", "button")
const selectorLabel = createHostElement("text", "span")
setHostProperty(selectorButton, "data-track-name", "true")
setHostProperty(selectorButton, "role", "button")
setHostProperty(selectorButton, "data-track-id", "track-7")
insertHostNode(selectorRoot, selectorButton)
insertHostNode(selectorButton, selectorLabel)
if (selectorLabel.closest("[data-track-name]") !== selectorButton) throw new Error("closest must resolve ancestor data attributes")
if (selectorLabel.closest("button, input, select, textarea, [role='button']") !== selectorButton) throw new Error("closest must resolve selector lists and semantic tags")
if (!selectorRoot.contains(selectorLabel) || selectorLabel.contains(selectorRoot)) throw new Error("contains must follow host ancestry")
if (selectorButton.dataset.trackId !== "track-7") throw new Error("dataset must expose data-* properties")
selectorButton.removeAttribute("data-track-name")
if (selectorLabel.closest("[data-track-name]") !== null) throw new Error("removeAttribute must update selector matching")

console.log("solid1 host parity: passed")
