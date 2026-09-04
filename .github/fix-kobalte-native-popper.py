from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
web_path = ROOT / "packages/solid1/src/web.ts"
web = web_path.read_text()

old_promotion = '''  // SAFETY: HostElementNode.type is writable at runtime while detached; changing it before adoption controls only the native createElement opcode while semantic div metadata remains unchanged for Kobalte.\n  Object.defineProperty(element, "type", {\n    configurable: true,\n    enumerable: true,\n    writable: false,\n    value: "anchored",\n  })\n'''
new_promotion = '''  element.nativeType = "anchored"\n'''
if web.count(old_promotion) != 1:
    raise SystemExit("Kobalte popper promotion anchor changed")
web_path.write_text(web.replace(old_promotion, new_promotion, 1))
