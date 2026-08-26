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
): { backgroundColor: string; borderColor: string; opacity?: number } {
  return {
    backgroundColor: color,
    borderColor: selected ? "#60a5fa" : color,
    ...(ghost ? { opacity: 0.65 } : {}),
  }
}
