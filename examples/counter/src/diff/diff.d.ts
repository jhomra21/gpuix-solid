declare module "diff" {
  export interface Change {
    value: string
    added?: boolean
    removed?: boolean
    count?: number
  }

  export function diffWords(oldText: string, newText: string): Change[]

  export interface StructuredPatchHunk {
    oldStart: number
    oldLines: number
    newStart: number
    newLines: number
    lines: string[]
    linedelimiters?: string[]
  }
}
