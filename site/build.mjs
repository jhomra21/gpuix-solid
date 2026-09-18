import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const source = join(here, "src")
const dist = join(here, "dist")
const repo = join(here, "..")

await rm(dist, { recursive: true, force: true })
await mkdir(join(dist, "images"), { recursive: true })

const packageJson = JSON.parse(
  await readFile(join(repo, "packages/solid/package.json"), "utf8"),
)
const html = (await readFile(join(source, "index.html"), "utf8"))
  .replaceAll("__GPUIX_SOLID_VERSION__", packageJson.version)

await writeFile(join(dist, "index.html"), html)
await cp(join(source, "styles.css"), join(dist, "styles.css"))
await cp(join(source, "app.js"), join(dist, "app.js"))

for (const image of ["mail-app.png", "dashboard.png", "codeimage.png", "todo.png"]) {
  await cp(join(repo, "docs/images", image), join(dist, "images", image))
}
