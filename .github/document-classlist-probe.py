from pathlib import Path

path = Path("packages/solid1/src/dom-environment.ts")
source = path.read_text()

old = '''type CompatDocumentNode = CompatEventTarget & {\n  ownerDocument: CompatDocument\n'''
new = '''type CompatClassList = {\n  add(...tokens: string[]): void\n  remove(...tokens: string[]): void\n  contains(token: string): boolean\n  toggle(token: string, force?: boolean): boolean\n}\n\ntype CompatDocumentNode = CompatEventTarget & {\n  ownerDocument: CompatDocument\n'''
if old not in source:
    raise SystemExit("CompatDocumentNode type anchor missing")
source = source.replace(old, new, 1)

old = '''  readonly dataset: CompatDataset\n  clientWidth: number\n'''
new = '''  readonly dataset: CompatDataset\n  readonly classList: CompatClassList\n  clientWidth: number\n'''
if old not in source:
    raise SystemExit("CompatDocumentNode dataset anchor missing")
source = source.replace(old, new, 1)

old = '''  const upperTagName = tagName.toUpperCase()\n  const attributes = new Map<string, string>()\n  const node: CompatDocumentNode = {\n'''
new = '''  const upperTagName = tagName.toUpperCase()\n  const attributes = new Map<string, string>()\n  const classes = new Set<string>()\n  const syncClassAttribute = () => {\n    if (classes.size === 0) attributes.delete("class")\n    else attributes.set("class", [...classes].join(" "))\n  }\n  const classList: CompatClassList = {\n    add(...tokens) {\n      for (const token of tokens) if (token) classes.add(token)\n      syncClassAttribute()\n    },\n    remove(...tokens) {\n      for (const token of tokens) classes.delete(token)\n      syncClassAttribute()\n    },\n    contains(token) {\n      return classes.has(token)\n    },\n    toggle(token, force) {\n      const shouldAdd = force ?? !classes.has(token)\n      if (shouldAdd) classes.add(token)\n      else classes.delete(token)\n      syncClassAttribute()\n      return shouldAdd\n    },\n  }\n  const node: CompatDocumentNode = {\n'''
if old not in source:
    raise SystemExit("createDocumentNode anchor missing")
source = source.replace(old, new, 1)

old = '''    get dataset() {\n      return datasetFromAttributes(attributes)\n    },\n    get clientWidth() {\n'''
new = '''    get dataset() {\n      return datasetFromAttributes(attributes)\n    },\n    classList,\n    get clientWidth() {\n'''
if old not in source:
    raise SystemExit("document node dataset implementation anchor missing")
source = source.replace(old, new, 1)

old = '''    setAttribute(name, value) {\n      attributes.set(name, String(value))\n    },\n    removeAttribute(name) {\n      attributes.delete(name)\n    },\n'''
new = '''    setAttribute(name, value) {\n      const next = String(value)\n      attributes.set(name, next)\n      if (name === "class") {\n        classes.clear()\n        for (const token of next.split(/\\s+/)) if (token) classes.add(token)\n        syncClassAttribute()\n      }\n    },\n    removeAttribute(name) {\n      attributes.delete(name)\n      if (name === "class") classes.clear()\n    },\n'''
if old not in source:
    raise SystemExit("document node attribute implementation anchor missing")
source = source.replace(old, new, 1)

path.write_text(source)
