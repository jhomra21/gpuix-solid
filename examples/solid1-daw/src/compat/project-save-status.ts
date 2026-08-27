type ProjectSaveStatusInput = {
  projectId: string
  userId?: string
  mode?: unknown
  sharedOutboxStatus?: { pending: number; failed: number } | null
  cloudBackupStatus?: unknown
}

export function getProjectSaveStatus(input: ProjectSaveStatusInput) {
  if (!input.projectId) {
    return {
      label: "No project open",
      shortLabel: "No project",
      compactLabel: "None",
      class: "border-neutral-800 bg-neutral-900/70 text-neutral-400",
    }
  }

  const pending = input.sharedOutboxStatus?.pending ?? 0
  const failed = input.sharedOutboxStatus?.failed ?? 0
  if (pending + failed > 0) {
    return {
      label: `${pending} shared change${pending === 1 ? "" : "s"} pending, ${failed} failed`,
      shortLabel: "Sync pending",
      compactLabel: "Cloud",
      class: input.userId
        ? "border-sky-900/70 bg-sky-950/40 text-sky-300"
        : "border-amber-900/70 bg-amber-950/40 text-amber-300",
    }
  }

  return {
    label: "Saved locally on this device",
    shortLabel: "Saved locally",
    compactLabel: "Local",
    class: "border-emerald-900/70 bg-emerald-950/40 text-emerald-300",
  }
}
