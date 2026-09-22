import { mkdir } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

if (process.platform !== "darwin") {
  throw new Error("Native decode scaling matrix requires macOS")
}

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(sourceDirectory, "..")
const reportsDirectory = join(projectDirectory, "reports")

const resolutions = [
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "4K", width: 3840, height: 2160 },
] as const

await mkdir(reportsDirectory, { recursive: true })

const sections: string[] = [
  "# Native decode scaling matrix",
  "",
  "Each section uses the same AVC workload and decoder variants at a different resolution.",
  "",
]

for (const resolution of resolutions) {
  const child = Bun.spawn(
    [process.execPath, "src/run-presentation-iosurface-decode-matrix.ts"],
    {
      cwd: projectDirectory,
      stdout: "inherit",
      stderr: "inherit",
      env: {
        ...process.env,
        MEDIABUNNY_PRESENTATION_WIDTH: String(resolution.width),
        MEDIABUNNY_PRESENTATION_HEIGHT: String(resolution.height),
      },
    },
  )
  const exitCode = await child.exited
  if (exitCode !== 0) {
    throw new Error(`${resolution.label} decode matrix exited with code ${exitCode}`)
  }

  const resolutionKey = `${resolution.width}x${resolution.height}`
  const reportPath = join(
    reportsDirectory,
    `presentation-iosurface-decode-${resolutionKey}-matrix.md`,
  )
  const report = await Bun.file(reportPath).text()
  const body = report.replace(/^# Native decode experiment matrix\n+/, "")

  sections.push(`## ${resolution.label} (${resolutionKey})`, "", body.trim(), "")
}

const combined = sections.join("\n")
await Bun.write(
  join(reportsDirectory, "presentation-iosurface-decode-scaling.md"),
  combined + "\n",
)

console.log("")
console.log("Combined report written to examples/mediabunny/reports/presentation-iosurface-decode-scaling.md")
