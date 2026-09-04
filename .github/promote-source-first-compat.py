from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

PRODUCT_PATCHES = [
    ".github/source-sidebar-verifier-apply.py",
    ".github/source-sidebar-postprocess.py",
    ".github/inline-grid-compat-probe.py",
    ".github/empty-text-compat-probe.py",
    ".github/interactive-hit-surface-probe.py",
    ".github/range-native-backing-probe.py",
    ".github/pointer-events-inheritance-probe.py",
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
