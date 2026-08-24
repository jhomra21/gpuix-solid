# Roadmap

## M0 — repository and contracts

- [x] Solid 2 workspace
- [x] upstream attribution / notices
- [x] architecture and agent guidance
- [x] native renderer TypeScript contract
- [x] root-scoped host-node model
- [x] mutation driver skeleton
- [x] event registry skeleton
- [x] universal renderer adapter skeleton
- [x] counter fixture

## M1 — host kernel parity

- [x] validate build against installed Solid 2 + `@gpuix/native`
- [x] complete intrinsic style/custom-prop typing from public GPUIX surface
- [x] exact built-in/universal custom-prop forwarding parity
- [x] text/fragment/reorder parity fixtures
- [x] ref behavior tests
- [x] multiple-root lifecycle tests
- [x] hot remount semantics

## M2 — native elements

- [x] img
- [x] svg
- [x] canvas
- [x] input
- [x] textarea
- [x] anchored
- [x] code
- [x] diff
- [x] markdown
- [x] virtual-list

## M3 — native capabilities

- [x] focus APIs
- [x] scroll APIs
- [x] selection APIs
- [x] window APIs
- [x] debug frame overlay
- [x] native animation bridge

## M4 — Solid components

- [x] Tooltip
- [x] Select
- [x] Combobox
- [x] Solid-native slot/as contract
- [x] unified `animate.*` API over the native animation bridge
- [x] keep raw `motion` wire format out of public JSX

## M5 — testing and automation

- [x] native TestRenderer adapter
- [x] retained-tree snapshot parity against React fixtures
- [x] event/input parity
- [x] selection/layout parity
- [x] Playwright-like locator API
- [x] live launch/connect transport
- [x] deterministic animation clock
- [x] screenshot parity suite

## M6 — release

- [ ] CI matrix
- [ ] package provenance
- [ ] changesets/release workflow
- [ ] beta package publication
- [ ] upstream compatibility matrix
