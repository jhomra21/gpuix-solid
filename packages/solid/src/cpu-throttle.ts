/// macOS CPU clamp helpers matching the published GPUIX 0.7 React surface.

export const MAC_CPU_THROTTLES = ["utility", "background", "maintenance"] as const

export type MacCpuThrottle = (typeof MAC_CPU_THROTTLES)[number]

function isMacCpuThrottle(value: string): value is MacCpuThrottle {
  for (const clamp of MAC_CPU_THROTTLES) {
    if (clamp === value) return true
  }
  return false
}

export function readMacCpuThrottle(): MacCpuThrottle | null {
  const raw = (process.env.THROTTLE ?? "").trim().toLowerCase()
  if (!raw) return null
  if (!isMacCpuThrottle(raw)) {
    throw new Error(
      `THROTTLE=${raw} is invalid. Use utility, background, or maintenance.`,
    )
  }
  return raw
}

/** Re-exec under `taskpolicy -c`. Call from the process entry, not a test worker. */
export function applyMacCpuThrottleFromEnv(): MacCpuThrottle | null {
  const mode = readMacCpuThrottle()
  if (!mode) return null
  if (process.env.GPUIX_CPU_THROTTLE_APPLIED === mode) return mode
  if (process.platform !== "darwin") {
    throw new Error(`THROTTLE=${mode} needs macOS taskpolicy`)
  }
  if (process.argv.some((arg) => arg.includes("vitest/dist/workers"))) {
    throw new Error(
      `THROTTLE=${mode} must wrap the test process instead of a test worker.`,
    )
  }

  console.log(`[throttle] taskpolicy -c ${mode}`)
  const { spawnSync } = process.getBuiltinModule("node:child_process")
  const result = spawnSync("taskpolicy", ["-c", mode, ...process.argv], {
    stdio: "inherit",
    env: { ...process.env, GPUIX_CPU_THROTTLE_APPLIED: mode },
  })
  process.exit(result.status ?? 1)
}
