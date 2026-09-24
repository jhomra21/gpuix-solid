import solid from "vite-plugin-solid"
import solidSvg from "vite-plugin-solid-svg"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

const diffusionCommit = "666cdced1f6b97a792b63e551f45797649efb27a"
const fromHere = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url))
const sourceRoot = fromHere(`../../.cache/diffusion-editor/${diffusionCommit.slice(0, 12)}/`)
const solid1Entry = fromHere("../../packages/solid1/dist/index.js")
const solidWebCompat = fromHere("../../packages/solid1/dist/web-entry.js")
const runtimeBridge = fromHere("./src/runtime-bridge.ts")
const webSource = fromHere(`../../.cache/diffusion-editor/${diffusionCommit.slice(0, 12)}/apps/web/src/`)
const desktopSource = fromHere(`../../.cache/diffusion-editor/${diffusionCommit.slice(0, 12)}/apps/desktop/src/`)
const kobalteSourceRoot = fromHere(`../../.cache/diffusion-editor/${diffusionCommit.slice(0, 12)}/node_modules/@kobalte/core/src/`)
const domPurifyCompat = fromHere("./src/dompurify-compat.ts")
const domPurifySource = fromHere(`../../.cache/diffusion-editor/${diffusionCommit.slice(0, 12)}/node_modules/dompurify/dist/purify.es.mjs`)

const normalizedSourceRoot = sourceRoot.replaceAll("\\", "/")

const multilineClassAttributeHook = {
  name: "diffusion-multiline-class-attribute-compat",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    const normalizedId = id.replaceAll("\\", "/").split("?")[0]
    if (!normalizedId.startsWith(normalizedSourceRoot) || !normalizedId.endsWith(".tsx")) return null

    let changed = false
    const normalizedCode = code.replace(
      /\b(class|className)\s*=\s*"([^"]*\n[^"]*)"/g,
      (_match, name: string, value: string) => {
        changed = true
        return `${name}="${value.replace(/\s*\n\s*/g, " ")}"`
      },
    )
    return changed ? { code: normalizedCode, map: null } : null
  },
}

const toolbarTestHook = {
  name: "diffusion-toolbar-native-test-hook",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    const normalizedId = id.replaceAll("\\", "/").split("?")[0]
    if (!normalizedId.endsWith("/apps/web/src/components/canvas/toolbar.tsx")) return null

    const rectangleTrigger = `<TooltipTrigger
            as={Button}
            size="icon-square"
            variant={selectedTool() === ToolType.RECT ? 'default' : 'ghost'}`
    if (!code.includes(rectangleTrigger)) {
      throw new Error("Pinned Diffusion Toolbar RECT trigger changed; update native acceptance instrumentation")
    }

    return code.replace(
      rectangleTrigger,
      `<TooltipTrigger
            as={Button}
            testId="diffusion-toolbar-rectangle"
            size="icon-square"
            variant={selectedTool() === ToolType.RECT ? 'default' : 'ghost'}`,
    )
  },
}

const packageSource = (name: string) =>
  fromHere(`../../.cache/diffusion-editor/${diffusionCommit.slice(0, 12)}/packages/${name}/src/index.ts`)

export function diffusionConfig(entry: string, outDir: string) {
  return defineConfig({
    define: {
      "import.meta.env.VITE_DESKTOP": JSON.stringify("false"),
    },
    plugins: [
      multilineClassAttributeHook,
      toolbarTestHook,
      solid({
        solid: {
          generate: "universal",
          moduleName: "@jhomra21/gpuix-solid1",
        },
      }),
      solidSvg({ defaultAsComponent: true }),
    ],
    resolve: {
      alias: [
        { find: "@jhomra21/gpuix-solid1", replacement: solid1Entry },
        { find: /^solid-js\/web$/, replacement: solidWebCompat },
        { find: /^@kobalte\/core$/, replacement: `${kobalteSourceRoot}index.ts` },
        { find: /^@kobalte\/core\/(.+)$/, replacement: `${kobalteSourceRoot}$1/index.tsx` },
        { find: /^dompurify$/, replacement: domPurifyCompat },
        { find: "@diffusion-native/dompurify-source", replacement: domPurifySource },
        { find: /^@\//, replacement: webSource },
        { find: /^@desktop\//, replacement: desktopSource },
        { find: "@diffusionstudio/assets", replacement: packageSource("assets") },
        { find: "@diffusionstudio/jsx", replacement: packageSource("jsx") },
        { find: "@diffusionstudio/koota-solid", replacement: packageSource("koota-solid") },
        { find: "@diffusionstudio/reconciler", replacement: packageSource("reconciler") },
        { find: "@diffusionstudio/runtime-source", replacement: packageSource("runtime") },
        { find: /^@diffusionstudio\/runtime$/, replacement: runtimeBridge },
      ],
      conditions: ["solid", "browser", "development"],
      dedupe: ["solid-js", "@solidjs/router", "koota"],
    },
    ssr: {
      noExternal: [
        "@jhomra21/gpuix-solid1",
        /^@kobalte\/core(?:\/.*)?$/,
        "@kobalte/utils",
        /^@floating-ui\//,
        "solid-js",
      ],
      resolve: {
        conditions: ["solid", "browser", "development", "import", "default"],
      },
    },
    build: {
      target: "node22",
      ssr: entry,
      outDir,
      rollupOptions: {
        external: ["@gpuix/native"],
      },
    },
  })
}

export { diffusionCommit, sourceRoot }
