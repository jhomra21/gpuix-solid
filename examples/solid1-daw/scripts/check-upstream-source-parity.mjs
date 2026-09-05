import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const upstreamRevision = "2eaad47813b15aa8511bab8dc04625510c977b12"

const copiedSources = [
  ["src/upstream/index.css", "src/index.css", "49cd4caf64052b7bc042af98d83a4f550cb4f88e"],
  ["src/upstream/packages/timeline-core/types.ts", "packages/timeline-core/src/types.ts", "98fd4d48599e618a3e50964269ab2ba55617696a"],
  ["src/upstream/packages/timeline-core/clip-fades.ts", "packages/timeline-core/src/clip-fades.ts", "cbb99bf3a58390cb12fbe2c99cc93c83b15eca58"],
  ["src/upstream/packages/timeline-core/clip-placement.ts", "packages/timeline-core/src/clip-placement.ts", "28cc2d615614d72eae44e8f2645624c36e2c8104"],
  ["src/upstream/packages/timeline-core/track-routing.ts", "packages/timeline-core/src/track-routing.ts", "c37e51f5f1181c335d17d3be794b26f5db1f4a4d"],
  ["src/upstream/packages/shared/master-volume.ts", "packages/shared/src/master-volume.ts", "e461e8bddab32adffda433d022765d3ba9fd0097"],
  ["src/upstream/packages/shared/track-routing-core.ts", "packages/shared/src/track-routing-core.ts", "4fa18be3524d717273d461e56e3e3cc2e7c5235d"],
  ["src/upstream/packages/shared/track-tree.ts", "packages/shared/src/track-tree.ts", "f8d26ad60564d8260deb3d1adbdd17c0c29c3380"],
  ["src/upstream/packages/shared/clip-color.ts", "packages/shared/src/clip-color.ts", "a5b4812bfc201b2f5ffc01c70f2b317de3418a19"],
  ["src/upstream/lib/timeline-layout.ts", "src/lib/timeline-layout.ts", "79f9876245fbb5b357778f5d40974803d338663c"],
  ["src/upstream/lib/timeline-utils.ts", "src/lib/timeline-utils.ts", "4ddf52866d6f616ffe6b9da2e8c1362dfe9dad39"],
  ["src/upstream/lib/timeline-runtime-types.ts", "src/lib/timeline-runtime-types.ts", "7b5c026817b3a22428862999815e93501e9d75bc"],
  ["src/upstream/lib/timeline-range-selection.ts", "src/lib/timeline-range-selection.ts", "d197450a36b15e1f909f5ab3713d6535f1a60217"],
  ["src/upstream/lib/timeline-track-layout.ts", "src/lib/timeline-track-layout.ts", "564cbf63fb3e2cffbb6211cbf207a4d4ba45f4b4"],
  ["src/upstream/lib/track-sidebar-mixer.ts", "src/lib/track-sidebar-mixer.ts", "6839a4b5a9b18b3c01df4d11b3370f8470085758"],
  ["src/upstream/lib/track-group-ops.ts", "src/lib/track-group-ops.ts", "f972910d0db21776a3b3948fee87f12b6c16bba7"],
  ["src/upstream/lib/color.ts", "src/lib/color.ts", "45aeae66c920ae4aecc7241a396cb054c0ec027b"],
  ["src/upstream/lib/clip-color.ts", "src/lib/clip-color.ts", "227b11ddf401770a0b7fdf2a89ec6bdb17ff5f01"],
  ["src/upstream/components/ui/avatar.tsx", "src/components/ui/avatar.tsx", "d09d0be1c256fac704ab97f3c32dd8bc9457c221"],
  ["src/upstream/components/ui/button.tsx", "src/components/ui/button.tsx", "8e4bd51105ee7c39bff9f813eefc9e51047396fd"],
  ["src/upstream/components/ui/context-menu.tsx", "src/components/ui/context-menu.tsx", "1d260f8079c0dd11cbfb85fb98d56d54684fc588"],
  ["src/upstream/components/ui/dialog.tsx", "src/components/ui/dialog.tsx", "d2dbeaefee74c8d5adc208c2aff68ca96537dfbd"],
  ["src/upstream/components/ui/dropdown-menu.tsx", "src/components/ui/dropdown-menu.tsx", "ab916c8cf177a559b7db73524cc5b78daac53b59"],
  ["src/upstream/components/ui/Icon.tsx", "src/components/ui/Icon.tsx", "2991370111030da685bed45d9cd4eb1cc1494868"],
  ["src/upstream/components/ui/menubar.tsx", "src/components/ui/menubar.tsx", "47052c08ebb225a427e3079e973ae46c2ff414d1"],
  ["src/upstream/components/ui/separator.tsx", "src/components/ui/separator.tsx", "3b30bdeb3e4e279e3e36d0dc0179c1d0b4714929"],
  ["src/upstream/components/ui/text-field.tsx", "src/components/ui/text-field.tsx", "cfdf5cd7442fc95c84fc6d49a4122950ce16d528"],
  ["src/upstream/components/ui/tooltip.tsx", "src/components/ui/tooltip.tsx", "d2c24f507e056e58d6058b302f57f048d182be67"],
  ["src/upstream/components/effects/eq-filter-type-select.tsx", "src/components/effects/eq-filter-type-select.tsx", "5dd5b8ff0bf426b29c0c4c9cbb247c08e534580b"],
  ["src/upstream/components/effects/Compressor.tsx", "src/components/effects/Compressor.tsx", "9ef86711b844b93cc647ef9a9d9c98c82441cba6"],
  ["src/upstream/components/effects/EffectShell.tsx", "src/components/effects/EffectShell.tsx", "bf2d4642b623d683099c430201daffac4f7b61cf"],
  ["src/upstream/components/ui/device-control.tsx", "src/components/ui/device-control.tsx", "dc2695685384e3db17ad216e18a3f7e21d3f0613"],
  ["src/upstream/components/ui/knob.tsx", "src/components/ui/knob.tsx", "78eae9b67c603e0f25154241aa3dcb806a7d7c64"],
  ["src/upstream/hooks/useSteppedValueControl.ts", "src/hooks/useSteppedValueControl.ts", "2a9c056f1632d258c62f099c3e65bdbda3286179"],
  ["src/upstream/hooks/useDrag.ts", "src/hooks/useDrag.ts", "a0fa4e76b10dd504a3ca3204cf9135ff50e73243"],
  ["src/upstream/components/timeline/create-effects-panel-device-collapse.tsx", "src/components/timeline/create-effects-panel-device-collapse.tsx", "98cd13fcb1464ea5c47d5e7c63b3416dc05d297c"],
  ["src/upstream/components/timeline/device-interaction.ts", "src/components/timeline/device-interaction.ts", "8d017592bce6f3a4b47688c79c6306822c37872d"],
  ["src/upstream/components/timeline/TransportControls.tsx", "src/components/timeline/TransportControls.tsx", "811dfb8e7b11247a1ec0533fda4a43d10293344f"],
  ["src/upstream/components/timeline/TrackSidebar.tsx", "src/components/timeline/TrackSidebar.tsx", "e90a541da665dca11b92032fd1897fdaebc6c1c9"],
  ["src/upstream/components/timeline/TrackSidebarRow.tsx", "src/components/timeline/TrackSidebarRow.tsx", "67899679d2b930515762ed7535cad824f1f85108"],
  ["src/upstream/components/timeline/MasterSidebarRow.tsx", "src/components/timeline/MasterSidebarRow.tsx", "616ea84c78a0d2f8d7846e9cb76bdc7f1317dfdd"],
  ["src/upstream/components/timeline/MixerVolumeSlider.tsx", "src/components/timeline/MixerVolumeSlider.tsx", "07f61bdf09ad9ad1c90df1df95dd72e8693e2a0c"],
  ["src/upstream/components/timeline/automation-parameter-picker.tsx", "src/components/timeline/automation-parameter-picker.tsx", "1357c5f304c01cd2cb9addca9ae6295597e1e3bd"],
  ["src/upstream/components/timeline/automation-lane.tsx", "src/components/timeline/automation-lane.tsx", "43d266773b18cf67d907dfb62daf9ce8b8869534"],
  ["src/upstream/components/timeline/context-menu/timeline-context-menu.tsx", "src/components/timeline/context-menu/timeline-context-menu.tsx", "7221bbbd7fa68e34a68075088f54015080e387b6"],
  ["src/upstream/components/timeline/track-send-targets.ts", "src/components/timeline/track-send-targets.ts", "67fd947928f59166196e89e6fe7b9f429edf7fa4"],
  ["src/upstream/components/timeline/menus/edit-menu.tsx", "src/components/timeline/menus/edit-menu.tsx", "2fc091eee5a4d5e6cb29fd4674cdd0c2729068ca"],
  ["src/upstream/components/timeline/menus/file-menu.tsx", "src/components/timeline/menus/file-menu.tsx", "e09813fa344af7f2e66fb8301aca7bd52dcbdd16"],
  ["src/upstream/components/timeline/menus/menu-action-types.ts", "src/components/timeline/menus/menu-action-types.ts", "bcb177c06029b655994bbb75fd47db880b10c62b"],
  ["src/upstream/components/timeline/menus/menu-check-mark.tsx", "src/components/timeline/menus/menu-check-mark.tsx", "64fdbca6972361fd83ac6044094c6cbab421975b"],
  ["src/upstream/components/timeline/menus/settings-menu.tsx", "src/components/timeline/menus/settings-menu.tsx", "34b14b06a362e91ba842ba9b3edf296cc72c2c18"],
  ["src/upstream/components/timeline/menus/tracks-menu.tsx", "src/components/timeline/menus/tracks-menu.tsx", "25be5bab952a0b49c8daecac44250bb5a5642ae7"],
  ["src/upstream/components/timeline/menus/view-menu.tsx", "src/components/timeline/menus/view-menu.tsx", "f6d01b1161f7d78e3a9193fbf0f7328d1dd50b17"],
  ["src/upstream/components/timeline/browser/timeline-left-browser.tsx", "src/components/timeline/browser/timeline-left-browser.tsx", "e4c94b535c1a628c618bb39928d9c7a160557d39"],
  ["src/upstream/components/timeline/ArrangementOverview.tsx", "src/components/timeline/ArrangementOverview.tsx", "cd451fa1e5f7b920ff07659626994c7a4a5c22b7"],
  ["src/upstream/components/timeline/TimelineRuler.tsx", "src/components/timeline/TimelineRuler.tsx", "279a63babe012a772e4aa81ed3bbcd3489d9f86b"],
  ["src/upstream/components/timeline/TrackLane.tsx", "src/components/timeline/TrackLane.tsx", "82850963b07f67a3655068d8fe14122e290ece96"],
  ["src/upstream/components/timeline/ClipComponent.tsx", "src/components/timeline/ClipComponent.tsx", "c3a04366bba4de6bc4b64973d859bb62e154b3af"],
  ["src/upstream/components/timeline/ClipFadeOverlay.tsx", "src/components/timeline/ClipFadeOverlay.tsx", "a59881604bc1bef7199946883e2d763df957df8d"],
  ["src/upstream/components/timeline/clip-fade-interaction.ts", "src/components/timeline/clip-fade-interaction.ts", "732e2355096848ce3a84f3bd5e42dd6b50d0c5e9"],
  ["src/upstream/components/timeline/TimelineBottomPanelFooter.tsx", "src/components/timeline/TimelineBottomPanelFooter.tsx", "159c03bb50998a19bd90f7960fa4991ce8d2a8ce"],
  ["src/upstream/components/timeline/TimelineBottomPanelShell.tsx", "src/components/timeline/TimelineBottomPanelShell.tsx", "c5e3ab05e6b9ea09471dddd2038541ceb7a7a1ed"],
  ["src/upstream/components/timeline/grid-options.ts", "src/components/timeline/grid-options.ts", "6fb7bf39c0535502ee0fae794a30ce7569a9d85e"],
  ["src/upstream/components/timeline/local-save-failure-banner.tsx", "src/components/timeline/local-save-failure-banner.tsx", "7c44e05d51bdd203bcad05d52de3bafec6bc42ed"],
  ["src/upstream/components/timeline/toolbar-context.tsx", "src/components/timeline/toolbar-context.tsx", "01202ad367494f81f4a10b394d08ddf39673f07c"],
  ["src/upstream/lib/bottom-panel-layout.ts", "src/lib/bottom-panel-layout.ts", "aa7e348a31969ba8a1c16957464ddc9e2a3fb884"],
  ["src/upstream/lib/bottom-panel-preferences.ts", "src/lib/bottom-panel-preferences.ts", "b91be08986cffe7cab1d21a7f9790bb897f7098f"],
  ["src/upstream/lib/utils.ts", "src/lib/utils.ts", "d084ccade0d8b5bd77fd5174993bcef7b57644c9"],
  ["src/upstream/components/timeline/SampleDetailPanel.tsx", "src/components/timeline/SampleDetailPanel.tsx", "0bff56a5d6ba7f2792c744c22c2b63de10a07f0a"],
  ["src/upstream/components/timeline/SampleClipPanel.tsx", "src/components/timeline/SampleClipPanel.tsx", "de98fc3e8c9fa372390b2e66e332b326d434062d"],
  ["src/upstream/components/timeline/SampleDetailWaveform.tsx", "src/components/timeline/SampleDetailWaveform.tsx", "9b219e2d2e318a8c08c0b91d07d052b0abee5ee1"],
  ["src/upstream/lib/audio-warp-patch.ts", "src/lib/audio-warp-patch.ts", "3dda1b964e078e4bf6270738fe7e66e660f12c5b"],
  ["src/upstream/lib/audio-waveform-layout.ts", "src/lib/audio-waveform-layout.ts", "c934e48ac108931aa81b2e0dafff4e7c555fc3ce"],
  ["src/upstream/packages/timeline-core/audio-clip-time-map.ts", "packages/timeline-core/src/audio-clip-time-map.ts", "6e9bbc5882e3acdca7612cfe54a64abd362c5a30"],
  ["src/compat/timeline-view.ts", "src/lib/timeline-view.ts", "9457d9d86a9cea1a9931c9a4f4aa2137bd239976"],
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
