import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
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

run(process.execPath, [path.join(packageRoot, "scripts/stage-package.mjs")], {
  cwd: path.resolve(packageRoot, "../.."),
})

const packOutput = run(npm, ["pack", ".publish", "--json"], {
  cwd: packageRoot,
  capture: true,
})
const packed = JSON.parse(packOutput)
const manifest = Array.isArray(packed) ? packed[0] : packed
if (!manifest?.filename || !manifest?.integrity) throw new Error("npm pack did not return artifact metadata")
if (manifest.name !== "@jhomra21/gpuix-solid") {
  throw new Error(`Unexpected packed package name: ${manifest.name}`)
}

const tarball = path.resolve(packageRoot, manifest.filename)
const packageJson = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"))
if (manifest.version !== packageJson.version) {
  throw new Error(`Packed version ${manifest.version} does not match package version ${packageJson.version}`)
}

const root = mkdtempSync(path.join(tmpdir(), "gpuix-solid-package-smoke-"))
try {
  const npmConsumer = path.join(root, "npm")
  run(process.execPath, ["-e", "require('node:fs').mkdirSync(process.argv[1], { recursive: true })", npmConsumer])
  writeFileSync(
    path.join(npmConsumer, "package.json"),
    `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`,
  )
  run(
    npm,
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball, "solid-js@2.0.0-rc.1"],
    { cwd: npmConsumer },
  )
  run(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
        const main = await import("@jhomra21/gpuix-solid")
        const automation = await import("@jhomra21/gpuix-solid/automation")
        for (const key of ["render", "animate", "createTestRoot"]) {
          if (!(key in main)) throw new Error("Missing root export: " + key)
        }
        for (const key of ["launch", "Locator", "connectStdio"]) {
          if (!(key in automation)) throw new Error("Missing automation export: " + key)
        }
        console.log("npm clean-consumer imports: PASS")
      `,
    ],
    { cwd: npmConsumer },
  )

  const typeSource = `
    import { animate, type AnimationStyle, type HostProps } from "@jhomra21/gpuix-solid"
    import { launch, type AutomationBackend } from "@jhomra21/gpuix-solid/automation"
    const style: AnimationStyle = { width: 120, opacity: 1 }
    const props: HostProps = { style: { width: 120 } }
    void animate.div
    void launch
    void style
    void props
    type Backend = AutomationBackend
    const backend = null as unknown as Backend
    void backend
  `
  writeFileSync(path.join(npmConsumer, "index.ts"), typeSource)
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
        },
        include: ["index.ts"],
      },
      null,
      2,
    )}\n`,
  )
  run(npm, ["install", "--save-dev", "--ignore-scripts", "typescript@5.9.2"], { cwd: npmConsumer })
  run(path.join(npmConsumer, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc"), [], {
    cwd: npmConsumer,
  })

  const bunConsumer = path.join(root, "bun")
  run(process.execPath, ["-e", "require('node:fs').mkdirSync(process.argv[1], { recursive: true })", bunConsumer])
  writeFileSync(
    path.join(bunConsumer, "package.json"),
    `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`,
  )
  run(bun, ["add", "--ignore-scripts", tarball, "solid-js@2.0.0-rc.1"], { cwd: bunConsumer })
  run(
    bun,
    [
      "-e",
      `
        import * as main from "@jhomra21/gpuix-solid"
        import * as automation from "@jhomra21/gpuix-solid/automation"
        if (!("render" in main) || !("animate" in main)) throw new Error("Bun root import failed")
        if (!("launch" in automation) || !("Locator" in automation)) throw new Error("Bun automation import failed")
        console.log("Bun clean-consumer imports: PASS")
      `,
    ],
    { cwd: bunConsumer },
  )

  console.log(
    `Smoked ${manifest.name}@${manifest.version}: ${manifest.filename}, ${manifest.integrity}`,
  )
} finally {
  rmSync(root, { recursive: true, force: true })
}
