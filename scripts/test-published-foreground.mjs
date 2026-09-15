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

switch (command) {
  case "prepare":
    prepare()
    break
  case "counter":
    launch("counter")
    break
  case "surface":
    launch("gpuix-08")
    break
  case "all":
    prepare()
    launch("counter")
    launch("gpuix-08")
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
  mkdirSync(join(consumerDir, "src", "gpuix-08"), { recursive: true })

  cpSync(
    join(repoRoot, "examples", "counter", "src", "index.tsx"),
    join(consumerDir, "src", "counter", "index.tsx"),
  )
  cpSync(
    join(repoRoot, "examples", "counter", "src", "gpuix-08", "index.tsx"),
    join(consumerDir, "src", "gpuix-08", "index.tsx"),
  )
  cpSync(
    join(repoRoot, "examples", "counter", "src", "gpuix-08", "app.tsx"),
    join(consumerDir, "src", "gpuix-08", "app.tsx"),
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
      "solid-js": "2.0.0-rc.1",
    },
    devDependencies: {
      "@solidjs/vite-plugin": "3.0.0-next.29",
      "@types/node": "^25.3.3",
      typescript: "5.9.2",
      vite: "8.1.5",
    },
  }, null, 2)}\n`)

  writeConfig("counter")
  writeConfig("gpuix-08")

  run("bun", ["install"], consumerDir)
  assertRegistryIdentity()
  run("bun", ["x", "tsc", "--noEmit"], consumerDir)
  run("bun", ["x", "vite", "build", "--config", "vite.counter.config.ts"], consumerDir)
  run("bun", ["x", "vite", "build", "--config", "vite.gpuix-08.config.ts"], consumerDir)

  console.log("\nPublished foreground consumer prepared.")
  status()
  console.log("Run `node scripts/test-published-foreground.mjs counter` and then `surface`, or use `all` to run both sequentially.")
}

function writeConfig(app) {
  const fileName = app === "counter" ? "vite.counter.config.ts" : "vite.gpuix-08.config.ts"
  writeFileSync(join(consumerDir, fileName), `import solid from "@solidjs/vite-plugin"\nimport { defineConfig } from "vite"\n\nexport default defineConfig({\n  plugins: [\n    solid({\n      solid: { generate: "universal", moduleName: "gpuix-solid" },\n    }),\n  ],\n  resolve: { conditions: ["browser", "development"] },\n  ssr: {\n    noExternal: ["gpuix-solid", "@solidjs/universal", "solid-js"],\n    resolve: { conditions: ["browser", "development", "import", "default"] },\n  },\n  build: {\n    target: "node22",\n    ssr: "src/${app}/index.tsx",\n    outDir: "dist/${app}",\n    rollupOptions: { external: ["@gpuix/native"] },\n  },\n})\n`)
}

function launch(app) {
  assertPrepared()
  const installed = readJson(join(consumerDir, "node_modules", "gpuix-solid", "package.json"))
  const native = readJson(join(consumerDir, "node_modules", "@gpuix", "native", "package.json"))

  console.log(`\nLaunching ${app === "counter" ? "original Counter reproducer" : "GPUIX 0.8 text/input surface"}`)
  console.log(`gpuix-solid@${installed.version} + @gpuix/native@${native.version}`)

  if (app === "counter") {
    console.log("Foreground checklist: paint; hover +; click + repeatedly; click -; click the number; Reset; drag-select text and release; close normally.")
  } else {
    console.log("Foreground checklist: click accessible action repeatedly; type in textarea; press Enter for multiple lines; Tab/focus around; drag-select decorated and textarea text; close normally.")
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
  console.log(JSON.stringify({
    consumerDir,
    requestedPackage: packageSpec,
    gpuixSolid: installed.version,
    gpuixNative: native.version,
    counterEntry: join(consumerDir, "dist", "counter", "index.js"),
    surfaceEntry: join(consumerDir, "dist", "gpuix-08", "index.js"),
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
