import solid from "vite-plugin-solid"
import solidSvg from "vite-plugin-solid-svg"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import { decodeJsxTextEntities } from "./src/jsx-text-entities.ts"

const diffusionCommit = "666cdced1f6b97a792b63e551f45797649efb27a"
const fromHere = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url))
const sourceRoot = fromHere(`../../.cache/diffusion-editor/${diffusionCommit.slice(0, 12)}/`)
const webAppRoot = fromHere(`../../.cache/diffusion-editor/${diffusionCommit.slice(0, 12)}/apps/web/`)
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

const scenePresetTestHook = {
  name: "diffusion-scene-preset-native-test-hook",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    const normalizedId = id.replaceAll("\\", "/").split("?")[0]
    if (!normalizedId.endsWith("/apps/web/src/components/sidebar-right/inspector/scene-template.tsx")) return null

    const presetButton = `            <button
              class="flex items-center gap-1 h-8 w-full pl-2 pr-4 hover:bg-muted/50"`
    if (!code.includes(presetButton)) {
      throw new Error("Pinned Diffusion scene preset button changed; update native acceptance instrumentation")
    }

    return code.replace(
      presetButton,
      `            <button
              testId={"diffusion-scene-preset-" + preset.label}
              class="flex items-center gap-1 h-8 w-full pl-2 pr-4 hover:bg-muted/50"`,
    )
  },
}

const usabilityTestHook = {
  name: "diffusion-native-usability-test-hook",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    const normalizedId = id.replaceAll("\\", "/").split("?")[0]

    if (normalizedId.endsWith("/apps/web/src/components/sidebar-left/project-menu/index.tsx")) {
      const trigger = `        <DropdownMenuTrigger
          as="button"
          type="button"`
      if (!code.includes(trigger)) throw new Error("Pinned Diffusion project-menu trigger changed")
      return {
        code: code.replace(
          trigger,
          `        <DropdownMenuTrigger
          testId="diffusion-project-menu-trigger"
          as="button"
          type="button"`,
        ),
        map: null,
      }
    }

    if (normalizedId.endsWith("/apps/web/src/components/sidebar-right/inspector/inspector-header.tsx")) {
      const trigger = `            <Button
              {...triggerProps}
              variant="link"`
      if (!code.includes(trigger)) throw new Error("Pinned Diffusion Inspector zoom trigger changed")
      return {
        code: code.replace(
          trigger,
          `            <Button
              {...triggerProps}
              testId="diffusion-inspector-zoom-trigger"
              variant="link"`,
        ),
        map: null,
      }
    }

    if (normalizedId.endsWith("/apps/web/src/agent-chat/sidebar-tabs.tsx")) {
      const trigger = `          <button
            type="button"
            role="tab"`
      if (!code.includes(trigger)) throw new Error("Pinned Diffusion sidebar tab trigger changed")
      return {
        code: code.replace(
          trigger,
          `          <button
            testId={"diffusion-sidebar-tab-" + tab.id}
            type="button"
            role="tab"`,
        ),
        map: null,
      }
    }

    if (normalizedId.endsWith("/apps/web/src/components/sidebar-right/inspector/transform/transform-settings.tsx")) {
      const field = `          <ControlledTextField
            icon={<Icon name="prop-x-position" />}`
      if (!code.includes(field)) throw new Error("Pinned Diffusion Position X field changed")
      return {
        code: code.replace(
          field,
          `          <ControlledTextField
            testId="diffusion-inspector-position-x"
            icon={<Icon name="prop-x-position" />}`,
        ),
        map: null,
      }
    }

    if (normalizedId.endsWith("/apps/web/src/components/ui/control-scrollarea.tsx")) {
      const scroller = `      <div
        ref={scrollEl}
        class="overflow-y-auto overflow-x-hidden absolute inset-0"`
      if (!code.includes(scroller)) throw new Error("Pinned Diffusion ControlScrollArea scroller changed")
      return {
        code: code.replace(
          scroller,
          `      <div
        ref={scrollEl}
        testId="diffusion-control-scroll-area-scroll"
        class="overflow-y-auto overflow-x-hidden absolute inset-0"`,
        ),
        map: null,
      }
    }

    return null
  },
}

const packageSource = (name: string) =>
  fromHere(`../../.cache/diffusion-editor/${diffusionCommit.slice(0, 12)}/packages/${name}/src/index.ts`)

export function diffusionConfig(entry: string, outDir: string) {
  return defineConfig({
    // Diffusion resolves absolute /src import.meta.glob patterns from apps/web.
    // Keep that upstream Vite root while using the GPUix fixture as the SSR entry.
    root: webAppRoot,
    define: {
      "import.meta.env.VITE_DESKTOP": JSON.stringify("false"),
    },
    plugins: [
      multilineClassAttributeHook,
      toolbarTestHook,
      scenePresetTestHook,
      usabilityTestHook,
      solid({
        babel: { plugins: [decodeJsxTextEntities] },
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
      noExternal: true,
      external: ["@gpuix/native"],
      resolve: {
        conditions: ["solid", "browser", "development", "import", "default"],
      },
    },
    build: {
      target: "node22",
      ssr: fromHere(`./${entry}`),
      outDir: fromHere(`./${outDir}/`),
      emptyOutDir: true,
      rollupOptions: {
        external: ["@gpuix/native"],
      },
    },
  })
}

export { diffusionCommit, sourceRoot }
