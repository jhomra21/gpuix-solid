import { cn as sourceCn } from "../upstream/lib/utils"

export function cn(...inputs: Parameters<typeof sourceCn>): string {
  return sourceCn(...inputs)
    .split(/\s+/)
    .map((className) => className === "bg-current" ? "bg-muted-foreground" : className)
    .join(" ")
}
