from pathlib import Path


def replace_once(path: str, anchor: str, replacement: str) -> None:
    target = Path(path)
    text = target.read_text()
    if anchor not in text:
        raise SystemExit(f"probe anchor missing in {path}")
    target.write_text(text.replace(anchor, replacement, 1))


generator = "examples/solid1-daw/scripts/generate-native-tailwind.mjs"
shadow_anchor = '  ["shadow-black/50", "this only recolors the copied automation picker shadow-xl; GPUIX 0.7 cannot represent that layered source shadow exactly"],\n'
replace_once(
    generator,
    shadow_anchor,
    shadow_anchor + '  ["shadow-black/30", "this only recolors the copied automation lane readout shadow-lg; GPUIX 0.7 cannot represent that layered source shadow exactly"],\n',
)

compat_anchor = 'const nativeCompatEntries = new Map([\n'
replace_once(
    generator,
    compat_anchor,
    compat_anchor
    + '  // Probe only: final entries must translate the pinned index.css rules or document a real native limitation.\n'
    + '  ["mixer-volume-slider", { base: {} }],\n'
    + '  ["mixer-volume-slider-automated", { base: {} }],\n'
    + '  ["track-row-divider", { base: {} }],\n'
    + '  ["track-row-selected-wash", { base: {} }],\n',
)

cva_anchor = '''      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "cva") {
        for (const argument of node.arguments) collectClassExpression(argument, candidates)
        return
      }
'''
replace_once(
    generator,
    cva_anchor,
    '''      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && (node.expression.text === "cn" || node.expression.text === "clsx")) {
        for (const argument of node.arguments) collectClassExpression(argument, candidates)
        return
      }

      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "cva") {
        collectCvaCall(node, candidates)
        return
      }
''',
)

old_collector = '''function collectClassExpression(node, candidates) {
  if (!node) return

  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    addClassString(node.text, candidates)
    return
  }

  if (ts.isTemplateExpression(node)) {
    addClassString(node.head.text, candidates)
    for (const span of node.templateSpans) {
      collectClassExpression(span.expression, candidates)
      addClassString(span.literal.text, candidates)
    }
    return
  }

  ts.forEachChild(node, (child) => collectClassExpression(child, candidates))
}
'''
new_collector = '''function collectClassExpression(node, candidates) {
  if (!node) return

  if (ts.isJsxExpression(node) || ts.isParenthesizedExpression(node)) {
    collectClassExpression(node.expression, candidates)
    return
  }

  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    addClassString(node.text, candidates)
    return
  }

  if (ts.isTemplateExpression(node)) {
    addClassString(node.head.text, candidates)
    for (const span of node.templateSpans) {
      collectClassExpression(span.expression, candidates)
      addClassString(span.literal.text, candidates)
    }
    return
  }

  if (ts.isConditionalExpression(node)) {
    collectClassExpression(node.whenTrue, candidates)
    collectClassExpression(node.whenFalse, candidates)
    return
  }

  if (ts.isBinaryExpression(node)) {
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      collectClassExpression(node.right, candidates)
      return
    }
    if (
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      node.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      collectClassExpression(node.left, candidates)
      collectClassExpression(node.right, candidates)
    }
    return
  }

  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && (node.expression.text === "cn" || node.expression.text === "clsx")) {
    for (const argument of node.arguments) collectClassExpression(argument, candidates)
    return
  }

  if (ts.isArrayLiteralExpression(node)) {
    for (const element of node.elements) collectClassExpression(element, candidates)
    return
  }

  if (ts.isObjectLiteralExpression(node)) {
    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
        collectClassListKey(property.name, candidates)
      }
    }
  }
}

function propertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNoSubstitutionTemplateLiteral(name)) return name.text
  return undefined
}

function collectCvaCall(node, candidates) {
  collectClassExpression(node.arguments[0], candidates)
  const config = node.arguments[1]
  if (!config || !ts.isObjectLiteralExpression(config)) return

  for (const property of config.properties) {
    if (!ts.isPropertyAssignment(property)) continue
    const name = propertyNameText(property.name)
    if (name === "variants" && ts.isObjectLiteralExpression(property.initializer)) {
      for (const variant of property.initializer.properties) {
        if (!ts.isPropertyAssignment(variant) || !ts.isObjectLiteralExpression(variant.initializer)) continue
        for (const option of variant.initializer.properties) {
          if (ts.isPropertyAssignment(option)) collectClassExpression(option.initializer, candidates)
        }
      }
      continue
    }
    if (name === "compoundVariants" && ts.isArrayLiteralExpression(property.initializer)) {
      for (const compound of property.initializer.elements) {
        if (!ts.isObjectLiteralExpression(compound)) continue
        for (const entry of compound.properties) {
          if (!ts.isPropertyAssignment(entry)) continue
          const entryName = propertyNameText(entry.name)
          if (entryName === "class" || entryName === "className") collectClassExpression(entry.initializer, candidates)
        }
      }
    }
  }
}
'''
replace_once(generator, old_collector, new_collector)

replace_once(
    generator,
    'const classes = {}\nconst omissions = []\n',
    'const classes = {}\nconst omissions = []\nconst unknownCandidates = []\n',
)
replace_once(
    generator,
    '  const rule = findCandidateRule(root, candidate)\n  if (!rule) continue\n',
    '  const rule = findCandidateRule(root, candidate)\n  if (!rule) {\n    unknownCandidates.push(candidate)\n    continue\n  }\n',
)
replace_once(
    generator,
    'const omissionsComment = omissions.length === 0\n',
    'if (unknownCandidates.length > 0) {\n  throw new Error(`Source class candidates have no Tailwind rule or explicit native compatibility entry: ${unknownCandidates.map((candidate) => JSON.stringify(candidate)).join(", ")}`)\n}\n\nconst omissionsComment = omissions.length === 0\n',
)

replace_once(
    "packages/solid1/jsx-runtime.d.ts",
    "type InlineSvgChildProps = NativeClassProps & {",
    "type InlineSvgChildProps = NativeClassProps & SolidJSX.DOMAttributes<SVGElement> & {",
)

svg_property_anchor = '''      if (semanticTag && isSvgMarkupTag(semanticTag)) {
        if (semanticTag !== "svg") {
          setSvgAttribute(node, name, value)
          refreshInlineSvg(node)
          return
        }
        if (isSvgMarkupAttribute(name)) {
          setSvgAttribute(node, name, value)
          refreshInlineSvg(node)
          return
        }
      }
'''
svg_property_replacement = '''      if (semanticTag && isSvgMarkupTag(semanticTag)) {
        if (semanticTag !== "svg") {
          if (isSvgMarkupAttribute(name)) {
            setSvgAttribute(node, name, value)
            refreshInlineSvg(node)
            return
          }
        } else if (isSvgMarkupAttribute(name)) {
          setSvgAttribute(node, name, value)
          refreshInlineSvg(node)
          return
        }
      }
'''
replace_once("packages/solid1/src/universal.ts", svg_property_anchor, svg_property_replacement)
