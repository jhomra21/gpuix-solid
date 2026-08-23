# Runnable parity examples

These examples are Solid 2 ports of the corresponding runnable React examples in [`remorses/gpuix`](https://github.com/remorses/gpuix/tree/main/examples). They are deliberately kept close to upstream behavior so renderer differences are easy to spot.

The example bundles include Solid's **client reactive runtime** even though the generated JavaScript executes under Bun. Solid publishes an SSR-oriented `node` export, which is not appropriate for a long-lived native desktop renderer. The Vite configs therefore resolve the `browser` condition only while bundling Solid and GPUix Solid; `@gpuix/native` remains external and loads normally for the host platform.

## Counter

Run from the repository root:

```bash
bun run example:counter
```

This is the Solid parity target for upstream `examples/counter.tsx`. It exercises:

- Solid signals
- raw text children
- click and mouse enter/leave events
- dynamic styles
- repeated host updates through the batched native mutation path

Expected behavior: clicking the number or `+` increments, `-` decrements while the count is positive, hovering `+` changes its background, and Reset returns the value to zero.

## Native Text

Run from the repository root:

```bash
bun run example:native-text
```

This is the Solid parity target for upstream `examples/native-text.tsx`. It exercises:

- Solid `For` and `Show`
- `<markdown>`, `<code>`, and `<diff>` native GPUIX elements
- custom native props
- link, line, and diff toggle events
- dynamic tabs and styles
- scrolling and the native shared text-selection path

Expected behavior: the three tabs switch between native Markdown, highlighted TypeScript, and a scrollable word diff. Native interactions update the status line. On supported desktop platforms, text should remain selectable/copyable using GPUIX's shared native selection registry.

## Validation policy

CI runs lint, package/example typechecks, tests, and builds both examples. CI intentionally does not open GPUI windows on the headless runner. Running the commands above on a supported desktop is the end-to-end native smoke test.
