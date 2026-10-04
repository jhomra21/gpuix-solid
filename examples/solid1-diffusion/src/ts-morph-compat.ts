import { createRequire } from "node:module"

const requireFromDiffusionDesktop = createRequire(__GPUIX_DIFFUSION_DESKTOP_PACKAGE__)
const tsMorph = requireFromDiffusionDesktop("ts-morph") as Record<string, unknown>

// Diffusion's desktop source imports these values directly. Keep ts-morph as
// the pinned desktop package's CommonJS runtime instead of folding TypeScript's
// Node helpers into the GPUIX ESM host bundle.
export const IndentationText = tsMorph.IndentationText
export const Project = tsMorph.Project
export const SyntaxKind = tsMorph.SyntaxKind
