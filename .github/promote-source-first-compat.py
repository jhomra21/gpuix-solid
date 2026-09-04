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
    # Pointer ownership is promoted only for semantic controls/roles; plain
    # event containers keep their existing native hit behavior.
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
grid = grid.replace(
    "export function parseBrowserGridTemplateColumns(value: unknown): BrowserGridTrack[] | undefined {\n  if (typeof value !== \"string\") return undefined",
    "export function parseBrowserGridTemplateColumns(value: string | undefined): BrowserGridTrack[] | undefined {\n  if (value === undefined) return undefined",
    1,
)
grid_path.write_text(grid)

testing_path = ROOT / "packages/solid1/src/testing.ts"
testing = testing_path.read_text()
testing = testing.replace(
    '''  const value = node.customProps?.[name]\n  if (typeof value === "string" && fragments.every((fragment) => value.includes(fragment))) return value''',
    '''  const value = node.customProps?.[name]\n  const text = value === undefined || value === null ? undefined : String(value)\n  if (text !== undefined && fragments.every((fragment) => text.includes(fragment))) return text''',
    1,
)
testing_path.write_text(testing)

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
