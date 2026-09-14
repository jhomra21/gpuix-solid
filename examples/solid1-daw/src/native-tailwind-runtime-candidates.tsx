import type { JSX } from "solid-js"

// Build-only candidate probe for class strings that reach the native runtime
// through variables, classList keys, or returned object fields instead of JSX
// class literals. Keep each entry source-shaped and point at its owner so drift
// is obvious.
export function NativeTailwindRuntimeCandidates(): JSX.Element {
  return (
    <>
      {/* TransportControls.tsx: centerIconButtonClass */}
      <div class="h-7 w-7 text-muted-foreground hover:bg-timeline-surface-muted hover:text-foreground" />
      {/* compat/utils.ts: bg-current fallback for the source record dot; GPUIX 0.7 cannot resolve inherited currentColor for native backgrounds */}
      <div class="bg-muted-foreground" />
      {/* timeline-left-browser.tsx: active/inactive tab classList keys */}
      <div class="bg-app-surface text-foreground" />
      <div class="text-muted-foreground" />
      {/* toolbar-context.tsx: nativeMenuTriggerClass */}
      <div class="h-7 px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground" />
      {/* compat/project-save-status.ts: getProjectSaveStatus().class */}
      <div class="border-neutral-800 bg-neutral-900/70 text-neutral-400" />
      <div class="border-sky-900/70 bg-sky-950/40 text-sky-300" />
      <div class="border-amber-900/70 bg-amber-950/40 text-amber-300" />
      <div class="border-emerald-900/70 bg-emerald-950/40 text-emerald-300" />
    </>
  )
}
