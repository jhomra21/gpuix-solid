import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const repositoryRoot = path.resolve(packageRoot, "../..")
const npm = process.platform === "win32" ? "npm.cmd" : "npm"
const bun = process.platform === "win32" ? "bun.exe" : "bun"

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  })
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n")
    throw new Error(
      output
        ? `Command failed: ${command} ${args.join(" ")}\n${output}`
        : `Command failed: ${command} ${args.join(" ")}`,
    )
  }
  return result.stdout ?? ""
}

function bin(root, name) {
  const suffix = process.platform === "win32" ? ".cmd" : ""
  return path.join(root, "node_modules", ".bin", `${name}${suffix}`)
}

run(process.execPath, [path.join(packageRoot, "scripts/stage-package.mjs")], { cwd: repositoryRoot })

const packOutput = run(npm, ["pack", ".publish", "--json"], {
  cwd: packageRoot,
  capture: true,
})
const packed = JSON.parse(packOutput)
const manifest = Array.isArray(packed) ? packed[0] : packed
if (!manifest?.filename || !manifest?.integrity) throw new Error("npm pack did not return artifact metadata")
if (manifest.name !== "@jhomra21/gpuix-solid1") {
  throw new Error(`Unexpected packed package name: ${manifest.name}`)
}

const tarball = path.resolve(packageRoot, manifest.filename)
const packageJson = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"))
if (manifest.version !== packageJson.version) {
  throw new Error(`Packed version ${manifest.version} does not match package version ${packageJson.version}`)
}

const root = mkdtempSync(path.join(tmpdir(), "gpuix-solid1-package-smoke-"))
try {
  const npmConsumer = path.join(root, "npm")
  const src = path.join(npmConsumer, "src")
  mkdirSync(src, { recursive: true })
  writeFileSync(
    path.join(npmConsumer, "package.json"),
    `${JSON.stringify({ name: "gpuix-solid1-clean-consumer", private: true, type: "module" }, null, 2)}\n`,
  )

  run(
    npm,
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball, "solid-js@1.9.15"],
    { cwd: npmConsumer },
  )

  run(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
        const solid1 = await import("@jhomra21/gpuix-solid1")
        for (const key of ["render", "createRoot", "createTestRoot", "For", "Show"]) {
          if (!(key in solid1)) throw new Error("Missing Solid 1 export: " + key)
        }
        console.log("npm clean-consumer Solid 1 imports: PASS")
      `,
    ],
    { cwd: npmConsumer },
  )

  writeFileSync(
    path.join(src, "index.tsx"),
    `import { createSignal } from "solid-js"\nimport { For, Show, render, type EventPayload } from "@jhomra21/gpuix-solid1"\n\nconst names = ["Drums", "Bass", "Synth"]\n\nexport function ConsumerFixture() {\n  const [count, setCount] = createSignal(1)\n  return (\n    <div style={{ width: 360, padding: 16, gap: 8 }}>\n      <div onClick={() => setCount((value) => value + 1)}>\n        <text>{\`Count: \${count()}\`}</text>\n      </div>\n      <input value={String(count())} onChange={(event: EventPayload) => setCount(Number(event.value ?? count()))} />\n      <Show when={count() > 0}><text>Visible</text></Show>\n      <For each={names}>{(name) => <text>{name}</text>}</For>\n    </div>\n  )\n}\n\nvoid render\n`,
  )
  writeFileSync(
    path.join(npmConsumer, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ESNext",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          skipLibCheck: false,
          noEmit: true,
          jsx: "preserve",
          jsxImportSource: "@jhomra21/gpuix-solid1",
        },
        include: ["src", "vite.config.mjs"],
      },
      null,
      2,
    )}\n`,
  )
  writeFileSync(
    path.join(npmConsumer, "vite.config.mjs"),
    `import solid from "vite-plugin-solid"\nimport { defineConfig } from "vite"\n\nexport default defineConfig({\n  plugins: [\n    solid({\n      solid: {\n        generate: "universal",\n        moduleName: "@jhomra21/gpuix-solid1",\n      },\n    }),\n  ],\n  resolve: {\n    conditions: ["browser", "development"],\n    dedupe: ["solid-js"],\n  },\n  ssr: {\n    noExternal: ["@jhomra21/gpuix-solid1", "solid-js"],\n    resolve: { conditions: ["browser", "development", "import", "default"] },\n  },\n  build: {\n    target: "node22",\n    ssr: "src/index.tsx",\n    outDir: "dist",\n    rollupOptions: { external: ["@gpuix/native"] },\n  },\n})\n`,
  )

  run(
    npm,
    [
      "install",
      "--save-dev",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "typescript@5.9.3",
      "vite@8.2.2",
      "vite-plugin-solid@2.11.14",
    ],
    { cwd: npmConsumer },
  )
  run(bin(npmConsumer, "tsc"), [], { cwd: npmConsumer })
  run(bin(npmConsumer, "vite"), ["build"], { cwd: npmConsumer })
  const builtSource = readFileSync(path.join(npmConsumer, "dist", "index.js"), "utf8")
  if (!builtSource.includes("ConsumerFixture")) {
    throw new Error("Clean-consumer Vite build did not emit the Solid 1 fixture")
  }
  console.log("npm clean-consumer Solid 1 TSX build: PASS")

  const bunConsumer = path.join(root, "bun")
  mkdirSync(bunConsumer, { recursive: true })
  writeFileSync(
    path.join(bunConsumer, "package.json"),
    `${JSON.stringify({ name: "gpuix-solid1-bun-consumer", private: true, type: "module" }, null, 2)}\n`,
  )
  run(bun, ["add", "--ignore-scripts", tarball, "solid-js@1.9.15"], { cwd: bunConsumer })
  run(
    bun,
    [
      "-e",
      `
        import * as solid1 from "@jhomra21/gpuix-solid1"
        if (!("render" in solid1) || !("createRoot" in solid1)) throw new Error("Bun Solid 1 import failed")
        console.log("Bun clean-consumer Solid 1 imports: PASS")
      `,
    ],
    { cwd: bunConsumer },
  )

  console.log(`Smoked ${manifest.name}@${manifest.version}: ${manifest.filename}, ${manifest.integrity}`)
} finally {
  rmSync(root, { recursive: true, force: true })
  rmSync(tarball, { force: true })
}
