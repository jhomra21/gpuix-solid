import { readFileSync } from "node:fs"

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

console.log("solid1 host parity: passed")
