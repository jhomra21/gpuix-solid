import "@gpuix/native"

declare module "@gpuix/native" {
  interface TestGpuixRenderer {
    createElement(id: number, elementType: string): void
    destroyElement(id: number): number[]
    appendChild(parentId: number, childId: number): void
    removeChild(parentId: number, childId: number): void
    insertBefore(parentId: number, childId: number, beforeId: number): void
    setStyle(id: number, styleJson: string): void
    setText(id: number, content: string): void
    setEventListener(id: number, eventType: string, hasHandler: boolean): void
    setRoot(id: number): void
    setCustomProp(id: number, key: string, valueJson: string): void
    commitMutations(): void
  }
}
