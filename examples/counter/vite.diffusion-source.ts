import { fileURLToPath } from "node:url"

const fromHere = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url))

export const diffusionSourceAliases = {
  "@/components/ui/icon": fromHere("./src/diffusion/source-adapters/icon.tsx"),
  "@/components/ui/dropdown-menu": fromHere("./src/diffusion/source-adapters/dropdown-menu.tsx"),
  "@/components/ui/button": fromHere("./src/diffusion/source-adapters/button.tsx"),
  "@/context/layout": fromHere("./src/diffusion/source-adapters/layout.ts"),
  "@diffusionstudio/koota-solid": fromHere("./src/diffusion/source-adapters/koota-solid.ts"),
  "@/engine": fromHere("./src/diffusion/source-adapters/engine.ts"),
} as const
