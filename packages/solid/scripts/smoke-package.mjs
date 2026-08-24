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

function bin(root, name) {
  const suffix = process.platform === "win32" ? ".cmd" : ""
  return path.join(root, "node_modules", ".bin", `${name}${suffix}`)
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
  const npmConsumerSrc = path.join(npmConsumer, "src")
  run(process.execPath, ["-e", "require('node:fs').mkdirSync(process.argv[1], { recursive: true })", npmConsumerSrc])
  writeFileSync(
    path.join(npmConsumer, "package.json"),
    `${JSON.stringify({ name: "gpuix-solid-clean-consumer", private: true, type: "module" }, null, 2)}\n`,
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
        for (const key of ["render", "animate", "Tooltip", "Select", "Combobox", "createTestRoot"]) {
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

  const consumerSource = `
    import {
      Combobox,
      ComboboxContent,
      ComboboxInput,
      ComboboxItem,
      ComboboxList,
      Select,
      SelectContent,
      SelectItem,
      SelectTrigger,
      SelectValue,
      Tooltip,
      TooltipContent,
      TooltipProvider,
      TooltipTrigger,
      animate,
      type AnimationStyle,
      type HostProps,
    } from "@jhomra21/gpuix-solid"
    import { launch, type AutomationBackend } from "@jhomra21/gpuix-solid/automation"
    import { createSignal } from "solid-js"

    const animationStyle: AnimationStyle = { width: 120, opacity: 1 }
    const hostProps: HostProps = { style: { width: 120 } }
    type Backend = AutomationBackend
    const backend = null as unknown as Backend
    void launch
    void animationStyle
    void hostProps
    void backend

    export function ConsumerFixture() {
      const [count, setCount] = createSignal(0)

      return (
        <TooltipProvider delayDuration={0}>
          <div style={{ padding: 16, gap: 8, flexDirection: "column" }}>
            <Tooltip>
              <TooltipTrigger onClick={() => setCount((value) => value + 1)}>
                <text>Count: {count()}</text>
              </TooltipTrigger>
              <TooltipContent>
                <text>Increment counter</text>
              </TooltipContent>
            </Tooltip>

            <Select defaultValue="one">
              <SelectTrigger>
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one">One</SelectItem>
                <SelectItem value="two">Two</SelectItem>
              </SelectContent>
            </Select>

            <Combobox items={["Alpha", "Beta"]} defaultValue="Alpha">
              <ComboboxInput placeholder="Search" />
              <ComboboxContent>
                <ComboboxList>
                  {(item) => <ComboboxItem value={item}>{item}</ComboboxItem>}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>

            <animate.div
              initial={{ opacity: 0, width: 80 }}
              to={{ opacity: 1, width: 160 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ height: 32 }}
            >
              <text>Native animation</text>
            </animate.div>
          </div>
        </TooltipProvider>
      )
    }
  `
  writeFileSync(path.join(npmConsumerSrc, "index.tsx"), consumerSource)
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
          jsxImportSource: "@jhomra21/gpuix-solid",
        },
        include: ["src", "vite.config.mjs"],
      },
      null,
      2,
    )}\n`,
  )
  writeFileSync(
    path.join(npmConsumer, "vite.config.mjs"),
    `import solid from "@solidjs/vite-plugin"\nimport { defineConfig } from "vite"\n\nexport default defineConfig({\n  plugins: [\n    solid({\n      solid: {\n        generate: "universal",\n        moduleName: "@jhomra21/gpuix-solid",\n      },\n    }),\n  ],\n  resolve: {\n    conditions: ["browser", "development"],\n  },\n  ssr: {\n    noExternal: ["@jhomra21/gpuix-solid", "@solidjs/universal", "solid-js"],\n    resolve: {\n      conditions: ["browser", "development", "import", "default"],\n    },\n  },\n  build: {\n    target: "node22",\n    ssr: "src/index.tsx",\n    outDir: "dist",\n    rollupOptions: {\n      external: ["@gpuix/native"],\n    },\n  },\n})\n`,
  )
  run(
    npm,
    [
      "install",
      "--save-dev",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "typescript@5.9.2",
      "vite@8.1.5",
      "@solidjs/vite-plugin@3.0.0-next.29",
    ],
    { cwd: npmConsumer },
  )
  run(bin(npmConsumer, "tsc"), [], { cwd: npmConsumer })
  run(bin(npmConsumer, "vite"), ["build"], { cwd: npmConsumer })
  const builtSource = readFileSync(path.join(npmConsumer, "dist", "index.js"), "utf8")
  if (!builtSource.includes("ConsumerFixture")) {
    throw new Error("Clean-consumer Vite build did not emit the Solid fixture")
  }
  console.log("npm clean-consumer Solid TSX build: PASS")

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
