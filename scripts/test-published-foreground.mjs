import { spawnSync } from "node:child_process"
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const consumerDir = join(
  process.env.GPUIX_FOREGROUND_TMP ?? tmpdir(),
  "gpuix-solid-published-foreground",
)
const packageSpec = process.env.GPUIX_SOLID_VERSION ?? "latest"
const command = process.argv[2] ?? "all"
const surfaceApp = "gpuix-surface"

switch (command) {
  case "prepare":
    prepare()
    break
  case "counter":
    launch("counter")
    break
  case "surface":
    launch(surfaceApp)
    break
  case "all":
    prepare()
    launch("counter")
    if (preparedPackageSupportsCurrentSurface()) {
      launch(surfaceApp)
    } else {
      console.log("Skipping the current GPUIX surface because the installed published package predates gpuix-solid@0.2.0.")
    }
    cleanup()
    break
  case "status":
    status()
    break
  case "cleanup":
    cleanup()
    break
  default:
    throw new Error(`Unknown command ${JSON.stringify(command)}. Use all, prepare, counter, surface, status, or cleanup.`)
}

function prepare() {
  rmSync(consumerDir, { recursive: true, force: true })
  mkdirSync(join(consumerDir, "src", "counter"), { recursive: true })

  cpSync(
    join(repoRoot, "examples", "counter", "src", "index.tsx"),
    join(consumerDir, "src", "counter", "index.tsx"),
  )
  cpSync(
    join(repoRoot, "templates", "solid2-vite-bun", "tsconfig.json"),
    join(consumerDir, "tsconfig.json"),
  )

  writeFileSync(join(consumerDir, "package.json"), `${JSON.stringify({
    name: "gpuix-solid-published-foreground",
    private: true,
    type: "module",
    packageManager: "bun@1.3.14",
    dependencies: {
      "gpuix-solid": packageSpec,
      "solid-js": "2.0.0-rc.8",
    },
    devDependencies: {
      "@solidjs/vite-plugin": "3.0.0-next.29",
      "@types/node": "^25.3.3",
      typescript: "5.9.2",
      vite: "8.1.5",
    },
  }, null, 2)}\n`)

  writeConfig("counter")

  run("bun", ["install"], consumerDir)
  assertRegistryIdentity()

  if (preparedPackageSupportsCurrentSurface()) {
    mkdirSync(join(consumerDir, "src", surfaceApp), { recursive: true })
    cpSync(
      join(repoRoot, "examples", "counter", "src", surfaceApp, "index.tsx"),
      join(consumerDir, "src", surfaceApp, "index.tsx"),
    )
    cpSync(
      join(repoRoot, "examples", "counter", "src", surfaceApp, "app.tsx"),
      join(consumerDir, "src", surfaceApp, "app.tsx"),
    )
    writeConfig(surfaceApp)
  }

  run("bun", ["x", "tsc", "--noEmit"], consumerDir)
  run("bun", ["x", "vite", "build", "--config", "vite.counter.config.ts"], consumerDir)
  if (preparedPackageSupportsCurrentSurface()) {
    run("bun", ["x", "vite", "build", "--config", "vite.gpuix-surface.config.ts"], consumerDir)
  }

  console.log("\nPublished foreground consumer prepared.")
  status()
  if (preparedPackageSupportsCurrentSurface()) {
    console.log("Run `node scripts/test-published-foreground.mjs counter` and then `surface`, or use `all` to run both sequentially.")
  } else {
    console.log("The installed package predates the current GPUIX surface; Counter remains available for published foreground acceptance.")
  }
}

function writeConfig(app) {
  const fileName = app === "counter" ? "vite.counter.config.ts" : "vite.gpuix-surface.config.ts"
  writeFileSync(join(consumerDir, fileName), `import solid from "@solidjs/vite-plugin"\nimport { defineConfig } from "vite"\n\nexport default defineConfig({\n  plugins: [\n    solid({\n      solid: { generate: "universal", moduleName: "gpuix-solid" },\n    }),\n  ],\n  resolve: { conditions: ["browser", "development"] },\n  ssr: {\n    noExternal: ["gpuix-solid", "@solidjs/universal", "solid-js"],\n    resolve: { conditions: ["browser", "development", "import", "default"] },\n  },\n  build: {\n    target: "node22",\n    ssr: "src/${app}/index.tsx",\n    outDir: "dist/${app}",\n    rollupOptions: { external: ["@gpuix/native"] },\n  },\n})\n`)
}

function launch(app) {
  assertPrepared()
  const installed = readJson(join(consumerDir, "node_modules", "gpuix-solid", "package.json"))
  const native = readJson(join(consumerDir, "node_modules", "@gpuix", "native", "package.json"))

  if (app === surfaceApp && !supportsCurrentSurface(installed.version)) {
    throw new Error(`The current GPUIX surface requires gpuix-solid@0.2.0 or newer; prepared ${installed.version}.`)
  }

  console.log(`\nLaunching ${app === "counter" ? "original Counter reproducer" : "current GPUIX text/input/selection surface"}`)
  console.log(`gpuix-solid@${installed.version} + @gpuix/native@${native.version}`)

  if (app === "counter") {
    console.log("Foreground checklist: paint; hover +; click + repeatedly; click -; click the number; Reset; drag-select text and release; close normally.")
  } else {
    console.log("Foreground checklist: click accessible action repeatedly; type in textarea; press Enter for multiple lines; Tab/focus around; drag-select surface text; clear selection; close normally.")
  }

  const result = spawnSync("bun", [`dist/${app}/index.js`], {
    cwd: consumerDir,
    stdio: "inherit",
    env: { ...process.env, RUST_BACKTRACE: process.env.RUST_BACKTRACE ?? "1" },
  })
  if (result.error) throw result.error
  if (result.signal) throw new Error(`${app} terminated by ${result.signal}`)
  if (result.status !== 0) throw new Error(`${app} exited with code ${result.status}`)
  console.log(`${app} exited normally.`)
}

function supportsCurrentSurface(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version)
  if (!match) throw new Error(`Could not parse gpuix-solid version ${JSON.stringify(version)}`)
  const major = Number(match[1])
  const minor = Number(match[2])
  return major > 0 || minor >= 2
}

function preparedPackageSupportsCurrentSurface() {
  const installed = readJson(join(consumerDir, "node_modules", "gpuix-solid", "package.json"))
  return supportsCurrentSurface(installed.version)
}

function assertRegistryIdentity() {
  const installed = readJson(join(consumerDir, "node_modules", "gpuix-solid", "package.json"))
  const native = readJson(join(consumerDir, "node_modules", "@gpuix", "native", "package.json"))
  if (installed.name !== "gpuix-solid") {
    throw new Error(`Expected gpuix-solid registry package, got ${installed.name}`)
  }
  if (native.name !== "@gpuix/native") {
    throw new Error(`Expected @gpuix/native registry package, got ${native.name}`)
  }
  console.log(`Registry packages: gpuix-solid@${installed.version} + @gpuix/native@${native.version}`)
}

function assertPrepared() {
  const packagePath = join(consumerDir, "node_modules", "gpuix-solid", "package.json")
  try {
    readFileSync(packagePath)
  } catch {
    throw new Error(`No prepared consumer at ${consumerDir}. Run prepare first.`)
  }
}

function status() {
  assertPrepared()
  const installed = readJson(join(consumerDir, "node_modules", "gpuix-solid", "package.json"))
  const native = readJson(join(consumerDir, "node_modules", "@gpuix", "native", "package.json"))
  const surfaceSupported = supportsCurrentSurface(installed.version)
  console.log(JSON.stringify({
    consumerDir,
    requestedPackage: packageSpec,
    gpuixSolid: installed.version,
    gpuixNative: native.version,
    counterEntry: join(consumerDir, "dist", "counter", "index.js"),
    surfaceSupported,
    surfaceEntry: surfaceSupported ? join(consumerDir, "dist", surfaceApp, "index.js") : null,
  }, null, 2))
}

function cleanup() {
  rmSync(consumerDir, { recursive: true, force: true })
  console.log(`Removed ${consumerDir}`)
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function run(executable, args, cwd) {
  const result = spawnSync(executable, args, { cwd, stdio: "inherit", env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${executable} ${args.join(" ")} failed with exit code ${result.status ?? result.signal}`)
  }
}
