import type { RuntimeClip } from "./timeline-core-types"

export type ClipVisualColors = {
  backgroundColor: string
  borderColor: string
  opacity?: number
}

export const getDefaultClipColor = (clip: Pick<RuntimeClip, "sourceKind" | "midi">) => {
  if (clip.sourceKind === "recording") return "clip-recording"
  return clip.midi ? "clip-midi" : "clip-audio"
}

export const trackColorForClip = (color: string | undefined) =>
  color && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : undefined

export function resolveClipColor(
  color: string | undefined,
  tokens: Readonly<Record<string, string>>,
): string {
  if (color === "clip-audio") return tokens["clip-audio"] ?? "#00a76c"
  if (color === "clip-midi") return tokens["clip-midi"] ?? "#0089ed"
  if (color === "clip-recording") return tokens["clip-recording"] ?? "#ef4444"
  return color ?? tokens["clip-audio"] ?? "#00a76c"
}

export function createClipVisualColors(
  color: string,
  selected: boolean,
  ghost: boolean,
): ClipVisualColors {
  const visual: ClipVisualColors = {
    backgroundColor: color,
    borderColor: selected ? "#60a5fa" : color,
  }
  if (ghost) visual.opacity = 0.65
  return visual
}
