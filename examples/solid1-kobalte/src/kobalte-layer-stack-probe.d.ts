declare module "kobalte-layer-stack-probe" {
  export const layerStack: {
    layers: Array<{ node: HTMLElement; isPointerBlocking?: boolean; dismiss?: () => void }>
    isTopMostLayer(node: HTMLElement | null): boolean
    isBelowPointerBlockingLayer(node: HTMLElement): boolean
  }
}
