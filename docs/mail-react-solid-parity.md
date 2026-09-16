# React and Solid Mail parity

This repository keeps a live-native differential harness for the Mail example:

    bun run mail:parity

The harness builds the current Solid package, checks out the exact GPUIX 0.9.0 React reference in the ignored cache/gpuix directory, and launches both implementations as native processes. It sends the same scenario definitions from scripts/mail-parity/scenarios.mjs to each process through the GPUIX stdio automation API.

The release lane is exact React 0.9.0 versus the current Solid implementation. The harness does not modify the React source, call application state setters, or substitute TestRenderer for live input. It captures paired screenshots in the ignored artifacts/mail-parity/react and artifacts/mail-parity/solid directories and writes a generated report to artifacts/mail-parity/report.md.

The scenario inventory comes from the exact React source. It covers the initial shell, all six channels, all 17 threads, sender/subject/snippet search, channel filtering, direct-message and newsletter readers, closed/split/full reader modes, composer replacement typing, independent scrolling, text-selection drag/release followed by another input, hover, HTTP images, and intentionally inert upstream IconButtons.

The generated report records:

- the Solid starting SHA;
- the exact React checkout SHA, package version, and Mail source blob SHA;
- checkpoint-by-checkpoint React/Solid semantic comparisons;
- important node counts, visible text, image counts, inputs, bounds, and scroll offsets;
- configured fatal native signatures from both stderr streams;
- the source-derived surface inventory, including exact conditional-state evidence;
- a separate diff between the exact 0.9.0 Mail source and current upstream main.

## Manual side-by-side launch

Build the Solid example and launch it from the repository:

    bun run example:mail

For the React reference, prepare the ignored exact checkout and launch its source:

    node --input-type=module -e 'import("./scripts/mail-parity/reference.mjs").then(({ensureReactReference}) => console.log(ensureReactReference(process.cwd()).checkout))'
    cd .cache/gpuix/remorses--gpuix-7ac9880abd8e
    bun examples/mail.tsx

The exact upstream source is pinned by scripts/mail-parity/reference.mjs. Use the generated report for the SHA and artifact paths from the most recent run.

## Limits

Framework-specific retained-tree details, CSS-computed styles, and native rasterization are not treated as parity requirements. Bounds comparisons allow an 8 px tolerance for native font and layout differences. If one automation API cannot expose a property, the report records that limitation rather than silently treating it as equal.

The Solid stdio automation backend currently does not expose `getScrollOffset`. The harness still performs independent scroll input against all three panes and records React offsets where available; it skips scroll-offset equality when Solid cannot report the value.
