import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const upstreamRevision = "3fb6ae9a10b8317feb23e77832e0894da7420f9b"

const copiedSources = [
  ["src/upstream/components/ui/avatar.tsx", "src/components/ui/avatar.tsx", "d09d0be1c256fac704ab97f3c32dd8bc9457c221"],
  ["src/upstream/components/ui/button.tsx", "src/components/ui/button.tsx", "8e4bd51105ee7c39bff9f813eefc9e51047396fd"],
  ["src/upstream/components/ui/context-menu.tsx", "src/components/ui/context-menu.tsx", "1d260f8079c0dd11cbfb85fb98d56d54684fc588"],
  ["src/upstream/components/ui/dialog.tsx", "src/components/ui/dialog.tsx", "d2dbeaefee74c8d5adc208c2aff68ca96537dfbd"],
  ["src/upstream/components/ui/dropdown-menu.tsx", "src/components/ui/dropdown-menu.tsx", "ab916c8cf177a559b7db73524cc5b78daac53b59"],
  ["src/upstream/components/ui/menubar.tsx", "src/components/ui/menubar.tsx", "47052c08ebb225a427e3079e973ae46c2ff414d1"],
  ["src/upstream/components/ui/separator.tsx", "src/components/ui/separator.tsx", "3b30bdeb3e4e279e3e36d0dc0179c1d0b4714929"],
  ["src/upstream/components/ui/text-field.tsx", "src/components/ui/text-field.tsx", "cfdf5cd7442fc95c84fc6d49a4122950ce16d528"],
  ["src/upstream/components/ui/tooltip.tsx", "src/components/ui/tooltip.tsx", "d2c24f507e056e58d6058b302f57f048d182be67"],
  ["src/upstream/components/timeline/TimelineBottomPanelFooter.tsx", "src/components/timeline/TimelineBottomPanelFooter.tsx", "159c03bb50998a19bd90f7960fa4991ce8d2a8ce"],
  ["src/upstream/components/timeline/local-save-failure-banner.tsx", "src/components/timeline/local-save-failure-banner.tsx", "7c44e05d51bdd203bcad05d52de3bafec6bc42ed"],
  ["src/upstream/lib/bottom-panel-layout.ts", "src/lib/bottom-panel-layout.ts", "aa7e348a31969ba8a1c16957464ddc9e2a3fb884"],
]

for (const [localPath, upstreamPath, expectedBlob] of copiedSources) {
  const content = normalizeCheckoutLineEndings(await readFile(path.join(projectRoot, localPath)))
  const actualBlob = gitBlobSha(content)
  if (actualBlob !== expectedBlob) {
    throw new Error([
      `${localPath} is no longer a verbatim copy of the pinned DAW source.`,
      `upstream: jhomra21/daw-browser-convex@${upstreamRevision}:${upstreamPath}`,
      `expected git blob: ${expectedBlob}`,
      `actual git blob:   ${actualBlob}`,
      "Fix compatibility underneath the copied component instead of editing its UI source.",
    ].join("\n"))
  }
}

console.log(`DAW verbatim source parity: ${copiedSources.length} files match ${upstreamRevision}`)

function normalizeCheckoutLineEndings(content) {
  return Buffer.from(content.toString("utf8").replaceAll("\r\n", "\n"))
}

function gitBlobSha(content) {
  const header = Buffer.from(`blob ${content.byteLength}\0`)
  return createHash("sha1").update(header).update(content).digest("hex")
}
