# Performance

GPUix Solid keeps benchmark output reproducible and machine-specific. The goal is to catch regressions in named workloads, not to manufacture framework rankings from unrelated hardware.

## Run the report

```bash
bun install --frozen-lockfile
bun run perf:report
```

The command prints the exact Git SHA, operating system, CPU, memory, Bun version, and Node version before running the benchmark suite.

## Workloads

| Workload | Scenario | Measurement |
| --- | --- | --- |
| Chat | mount | 1,000-turn source-shaped chat mount |
| Chat | idle flush | native GPU test-renderer flush with no application change |
| Chat | wheel | real GPUI wheel dispatch and resulting Solid/native work |
| Chat | highlight keystroke | reactive text-highlight query updates |
| Chat | highlight cursor | active highlighted-match updates |
| Chat | sidebar click | locator click plus native animated state transition |
| Timeline | mount | 24 tracks over a 900-second project |
| Timeline | pan, culling on | two-axis GPUI wheel input with viewport culling |
| Timeline | pan, culling off | control case without viewport culling |
| Timeline | drag move | pointer-captured native clip drag updates |
| Serialization | JSON encode/decode | actual Solid `applyBatch` mutation tuples |
| Serialization | UTF-8 buffer | JSON plus Buffer conversion |
| Serialization | style-ref experiment | measured style-interning candidate |
| Canvas serialization | DAW-style waveform | exact Canvas v1 `drawList` custom-prop envelope with 2,048 path points by default |

Sampled interaction and serialization paths report **p50, p95, p99**, sample count where applicable, and a max for latency samples. Mounts are one-shot measurements and are labeled as such. Set `CANVAS_POINTS` to change the Canvas waveform sample size when measuring protocol growth.

## Measurement policy

- Compare commits on the **same machine**, with the same workload/environment variables.
- Do not treat hosted CI timing as a product benchmark. CI builds and tests correctness; local benchmark runs measure performance.
- Upstream React thresholds printed by the Chat and Timeline workloads are historical reference budgets from the source-pinned GPUIX fixtures, not claims that a run on different hardware is faster or slower.
- A proposed optimization should improve a named metric without weakening correctness, source fidelity, native event semantics, retained-tree cleanup, or test coverage.
- Failed or skipped native renderer setup is not a valid performance sample.

The benchmark suite intentionally stays outside the required release gate. A release must remain correct across supported platforms even when no controlled benchmark machine is available.
