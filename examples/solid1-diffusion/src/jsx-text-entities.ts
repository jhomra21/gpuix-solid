import type { PluginObj, NodePath, types as BabelTypes } from "@babel/core"
import { decode } from "html-entities"

export function decodeJsxTextEntities(): PluginObj {
  return {
    name: "gpuix-solid-jsx-text-entities",
    // The pinned browser source uses named entities adjacent to JSX expressions;
    // decode them before Solid turns each fragment into a native text child.
    visitor: {
      Program: {
        enter(path) {
          path.traverse({
            JSXText(textPath: NodePath<BabelTypes.JSXText>) {
              const raw = textPath.node.extra?.raw ?? textPath.node.value
              const decoded = decode(raw)
              if (decoded === textPath.node.value && raw === decoded) return

              textPath.node.value = decoded
              if (textPath.node.extra) {
                textPath.node.extra.raw = decoded
                textPath.node.extra.rawValue = decoded
              }
            },
          })
        },
      },
    },
  }
}
