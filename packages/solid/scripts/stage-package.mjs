import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"

const packageDir = new URL("../", import.meta.url)
const stageDir = new URL("../.publish/", import.meta.url)
const packageJson = JSON.parse(readFileSync(new URL("package.json", packageDir), "utf8"))

rmSync(stageDir, { recursive: true, force: true })
mkdirSync(stageDir, { recursive: true })

for (const path of [
  "dist",
  "jsx-runtime.d.ts",
  "jsx-dev-runtime.d.ts",
  "README.md",
  "LICENSE",
]) {
  cpSync(new URL(path, packageDir), new URL(path, stageDir), { recursive: true })
}

const published = { ...packageJson }
delete published.scripts
delete published.devDependencies

writeFileSync(new URL("package.json", stageDir), `${JSON.stringify(published, null, 2)}\n`, "utf8")

console.log(`Staged ${published.name}@${published.version} in packages/solid/.publish`)
