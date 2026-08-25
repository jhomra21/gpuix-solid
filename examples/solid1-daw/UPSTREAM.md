# DAW Browser Convex Solid 1 dogfood source

This native example adapts a focused UI slice from `jhomra21/daw-browser-convex`.

- source branch: `feat/model-independent-control-platform`
- pinned revision: `3fb6ae9a10b8317feb23e77832e0894da7420f9b`
- framework: Solid 1

## Upstream surfaces represented

- `src/components/Timeline.tsx` — application/timeline composition
- `src/components/timeline/TransportControls.tsx` — record, play/pause, stop, BPM, metronome, loop, grid, grid resolution, browser toggle
- `src/components/timeline/TrackSidebar.tsx` / `TrackSidebarRow.tsx` — track selection, mute/solo/record-arm, meters and mix controls
- `src/components/timeline/TimelineBottomPanelShell.tsx` — persistent bottom device panel
- `src/components/timeline/EffectsPanel.tsx` — selected-track device chain
- `src/components/effects/Compressor.tsx` — compressor device structure and parameter vocabulary
- `src/index.css` — current dark timeline/device color system

The source application also contains cloud collaboration, Convex, TanStack Router, Web Audio/native audio hosting, drag/drop, persistence, automation, VST3 and a much larger device catalog. Those systems are intentionally not copied into this renderer fixture. Deterministic local state replaces them so the example isolates the Solid 1 UI/reconciliation workload while preserving the recognizable DAW composition and controls.

The native fixture includes a browser, track sidebar, arrangement clips, right inspector, transport, collapsible bottom panel, Compressor and EQ device cards, controlled native inputs, conditional subtrees and keyed lists.
