import { readFileSync } from "node:fs"
import {
  clearNativeStyleManifest,
  configureNativeStyleManifest,
  resolveNativeClassStyle,
} from "../src/native-style.ts"

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

console.log("solid1 host parity: passed")
