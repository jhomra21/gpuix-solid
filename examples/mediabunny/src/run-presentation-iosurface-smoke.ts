import { rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

if (process.platform !== "darwin") {
  console.log("IOSurface presentation smoke skipped: macOS only")
  process.exit(0)
}

const fixturePath = path.join(os.tmpdir(), `gpuix-mediabunny-iosurface-smoke-${process.pid}.mp4`)
const env = {
  ...process.env,
  MEDIABUNNY_PRESENTATION_CODEC: "avc",
  MEDIABUNNY_PRESENTATION_WIDTH: "128",
  MEDIABUNNY_PRESENTATION_HEIGHT: "72",
  MEDIABUNNY_PRESENTATION_FRAMES: "4",
  MEDIABUNNY_PRESENTATION_ITERATIONS: "1",
  MEDIABUNNY_PRESENTATION_WARMUPS: "0",
}

async function run(
  script: string,
  args: string[] = [],
  overrides: Record<string, string> = {},
) {
  const child = Bun.spawn([process.execPath, script, ...args], {
    cwd: path.resolve(import.meta.dir, ".."),
    stdout: "inherit",
    stderr: "inherit",
    env: { ...env, ...overrides },
  })
  const exitCode = await child.exited
  if (exitCode !== 0) throw new Error(`${script} exited with code ${exitCode}`)
}

try {
  await run("src/create-presentation-fixture.ts", [fixturePath])
  await run("src/run-presentation-iosurface-native.ts", [fixturePath])
  await run(
    "src/run-presentation-iosurface-native.ts",
    [fixturePath],
    { GPUIX_MEDIA_PACKET_BATCH: "2" },
  )
} finally {
  await rm(fixturePath, { force: true })
}
