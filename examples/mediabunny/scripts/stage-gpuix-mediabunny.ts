import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const exampleDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const repositoryDirectory = resolve(exampleDirectory, "../..")
const packageDirectory = join(repositoryDirectory, "packages", "mediabunny")
const targetDirectory = join(
  exampleDirectory,
  "node_modules",
  "@jhomra21",
  "gpuix-mediabunny",
)

const distDirectory = join(packageDirectory, "dist")
const addonDirectory = join(
  packageDirectory,
  "native",
  "videotoolbox",
  "build",
  "Release",
)
const addonPath = join(addonDirectory, "gpuix_videotoolbox.node")

if (!existsSync(distDirectory)) {
  throw new Error(
    "gpuix-mediabunny dist is missing; run the package build before staging",
  )
}
if (process.platform === "darwin" && !existsSync(addonPath)) {
  throw new Error(
    "gpuix-mediabunny VideoToolbox addon is missing; build it before staging",
  )
}

rmSync(targetDirectory, { recursive: true, force: true })
mkdirSync(targetDirectory, { recursive: true })

const sourcePackage = JSON.parse(
  readFileSync(join(packageDirectory, "package.json"), "utf8"),
) as Record<string, unknown>

const stagedPackage = {
  ...sourcePackage,
  scripts: undefined,
  devDependencies: undefined,
}
writeFileSync(
  join(targetDirectory, "package.json"),
  JSON.stringify(stagedPackage, null, 2) + "\n",
)

cpSync(distDirectory, join(targetDirectory, "dist"), {
  recursive: true,
})

if (process.platform === "darwin") {
  const targetAddonDirectory = join(
    targetDirectory,
    "native",
    "videotoolbox",
    "build",
    "Release",
  )
  mkdirSync(targetAddonDirectory, { recursive: true })
  cpSync(addonPath, join(targetAddonDirectory, "gpuix_videotoolbox.node"))
}

console.log(
  "Staged @jhomra21/gpuix-mediabunny into the dogfood consumer with peer dependencies resolved from examples/mediabunny.",
)
