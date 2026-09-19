import solid from "@solidjs/vite-plugin"
import type { PluginOption, UserConfig } from "vite"

const CLIENT_CONDITIONS = ["browser", "development"] as const
const SSR_CONDITIONS = ["browser", "development", "import", "default"] as const
const SOLID_NO_EXTERNAL = ["gpuix-solid", "@solidjs/universal", "solid-js"] as const

/**
 * The Vite settings that are invariant for a GPUix Solid application.
 *
 * The application still owns its entry point, output directory, target, and any
 * other build policy. This helper only supplies the renderer/runtime contract.
 */
export function gpuixSolidConfig(): UserConfig {
  return {
    resolve: {
      conditions: [...CLIENT_CONDITIONS],
    },
    ssr: {
      noExternal: [...SOLID_NO_EXTERNAL],
      resolve: {
        conditions: [...SSR_CONDITIONS],
      },
    },
    build: {
      rollupOptions: {
        external: ["@gpuix/native"],
      },
    },
  }
}

/**
 * Compile Solid JSX for the GPUix Solid universal renderer and apply the
 * runtime conditions required by Solid's live client build.
 */
export function gpuixSolid(): PluginOption {
  return [
    solid({
      solid: {
        generate: "universal",
        moduleName: "gpuix-solid",
      },
    }),
    {
      name: "gpuix-solid:runtime-config",
      config: gpuixSolidConfig,
    },
  ]
}

export default gpuixSolid
