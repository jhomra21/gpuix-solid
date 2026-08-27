export type ClipVisualColors = {
  backgroundColor: string
  borderColor: string
  opacity?: number
}

export function resolveClipColor(
  color: string | undefined,
  tokens: Readonly<Record<string, string>>,
): string {
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
