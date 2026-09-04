from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

PRODUCT_PATCHES = [
    # This first pass only narrows the verifier rewrite range. It exits before
    # adding its later diagnostic log because the rewritten verifier is not yet present.
    ".github/source-sidebar-geometry-probe.py",
    ".github/source-sidebar-verifier-apply.py",
    ".github/source-sidebar-postprocess.py",
    ".github/inline-grid-compat-probe.py",
    ".github/empty-text-compat-probe.py",
    ".github/range-native-backing-probe.py",
    # Pointer ownership composes after the range patch and is promoted only for
    # semantic controls/roles; plain event containers keep their native hit behavior.
    # Compatibility adapters that intentionally own an overlay hit surface declare
    # pointerEvents:auto explicitly in their own source.
    ".github/pointer-events-inheritance-probe.py",
    ".github/pointer-events-contract-probe.py",
    ".github/document-classlist-probe.py",
    ".github/custom-props-center-click-probe.py",
    ".github/automation-verifier-source-marker-probe.py",
    ".github/clip-verifier-source-marker-probe.py",
]

for relative in PRODUCT_PATCHES:
    path = ROOT / relative
    if not path.exists():
        raise SystemExit(f"required validated patch is missing: {relative}")
    subprocess.run(["python3", str(path)], cwd=ROOT, check=True)

# Tighten I/O contracts exposed by the exploratory helpers before the root
# anti-slop lint gate. These boundaries already receive parsed domain values.
grid_path = ROOT / "packages/solid1/src/browser-grid-compat.ts"
grid = grid_path.read_text()
grid_old = "export function parseBrowserGridTemplateColumns(value: unknown): BrowserGridTrack[] | undefined {\n  if (typeof value !== \"string\") return undefined"
grid_new = "export function parseBrowserGridTemplateColumns(value: string | undefined): BrowserGridTrack[] | undefined {\n  if (value === undefined) return undefined"
if grid_old not in grid:
    raise SystemExit("browser grid parser boundary anchor missing")
grid_path.write_text(grid.replace(grid_old, grid_new, 1))

testing_path = ROOT / "packages/solid1/src/testing.ts"
testing = testing_path.read_text()
testing_old = '''  const value = node.customProps?.[name]\n  if (typeof value === "string" && fragments.every((fragment) => value.includes(fragment))) return value'''
testing_new = '''  const value = node.customProps?.[name]\n  const text = value === undefined || value === null ? undefined : String(value)\n  if (text !== undefined && fragments.every((fragment) => text.includes(fragment))) return text'''
if testing_old not in testing:
    raise SystemExit("testing custom-prop boundary anchor missing")
testing_path.write_text(testing.replace(testing_old, testing_new, 1))

# The reconstructed project menu is a native compatibility surface. Its rows are
# semantic menu items, and the floating subtree must be later than the sidebar body
# in retained-tree order because GPUIX 0.7 does not expose browser z-index stacking.
# Keep the original 28px trigger slot and exact x/y geometry while mounting the
# actual menu as the sidebar's final absolute child so lower menu rows are not
# intercepted by later asset/search siblings.
sidebar_path = ROOT / "examples/counter/src/diffusion/sidebar-left-native.tsx"
sidebar = sidebar_path.read_text()
menu_row_old = '''  return (\n    <div testId={props.testId} onClick={props.onClick} style={{ height: 28,'''
menu_row_new = '''  return (\n    <div role="menuitem" testId={props.testId} onClick={props.onClick} style={{ height: 28,'''
if menu_row_old not in sidebar:
    raise SystemExit("Diffusion MenuRow semantic-role anchor missing")
sidebar = sidebar.replace(menu_row_old, menu_row_new, 1)

menu_slot_old = '''        <ProjectMenu state={props.state} onImport={importAsset} onRemoveUnused={removeUnused} onDownloadAssets={downloadAssets} />'''
menu_slot_new = '''        <div style={{ width: 28, height: 28, flexShrink: 0 }} />'''
if menu_slot_old not in sidebar:
    raise SystemExit("Diffusion ProjectMenu inline slot anchor missing")
sidebar = sidebar.replace(menu_slot_old, menu_slot_new, 1)

sidebar_tail = '''        </div>\n      </div>\n    </div>\n  )\n}'''
if not sidebar.endswith(sidebar_tail):
    raise SystemExit("Diffusion SidebarLeft final-child anchor missing")
sidebar_tail_new = '''        </div>\n      </div>\n      <div style={{ position: "absolute", left: 10, top: 50 }}>\n        <ProjectMenu state={props.state} onImport={importAsset} onRemoveUnused={removeUnused} onDownloadAssets={downloadAssets} />\n      </div>\n    </div>\n  )\n}'''
sidebar = sidebar[:-len(sidebar_tail)] + sidebar_tail_new
sidebar_path.write_text(sidebar)

# The promoted product must not retain diagnostic output from the exploratory probes.
for relative in [
    "packages/solid1/src/host/nodes.ts",
    "packages/solid1/src/host/events.ts",
    "packages/solid1/src/universal.ts",
    "packages/solid1/src/testing.ts",
    "packages/solid1/src/dom-environment.ts",
    "examples/solid1-daw/src/test.tsx",
]:
    text = (ROOT / relative).read_text()
    forbidden = (
        "source sidebar geometry probe",
        "source sidebar adapted state",
        "source sidebar custom click target",
        "source sidebar arm hit stack",
        "input native dispatch",
        "input pointer capture request",
        "exact clip hit stack",
    )
    for marker in forbidden:
        if marker in text:
            raise SystemExit(f"diagnostic marker {marker!r} leaked into {relative}")

# Remove all disposable investigation machinery. Keep only normal repository workflows.
for path in (ROOT / ".github").glob("*probe.py"):
    path.unlink()
for path in (ROOT / ".github").glob("source-sidebar-*.py"):
    path.unlink()
for relative in [
    ".github/workflows/eq-source-closure-probe.yml",
    ".github/workflows/source-sidebar-verifier-apply.yml",
]:
    path = ROOT / relative
    if path.exists():
        path.unlink()
