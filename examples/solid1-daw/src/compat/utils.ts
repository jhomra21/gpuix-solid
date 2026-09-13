import { cn as sourceCn } from "../upstream/lib/utils"

// GPUIX 0.7 parses absolute background colors but has no inherited currentColor
// background contract. The only pinned DAW bg-current use is the inactive record
// dot inside a text-muted-foreground button, so preserve that source base-state
// color until native parent-state/currentColor inheritance is representable.
export function cn(...inputs: Parameters<typeof sourceCn>): string {
  return sourceCn(...inputs)
    .split(/\s+/)
    .map((className) => className === "bg-current" ? "bg-muted-foreground" : className)
    .join(" ")
}
