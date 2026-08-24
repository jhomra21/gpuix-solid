import { readdirSync, rmSync } from "node:fs"

const packageRoot = new URL("../", import.meta.url)
rmSync(new URL("dist", packageRoot), { recursive: true, force: true })

for (const entry of readdirSync(packageRoot)) {
  if (entry.endsWith(".tsbuildinfo")) {
    rmSync(new URL(entry, packageRoot), { force: true })
  }
}
