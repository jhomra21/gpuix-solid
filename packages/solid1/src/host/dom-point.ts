export class GpuixDOMPoint {
  constructor(public x = 0, public y = 0, public z = 0, public w = 1) {}

  matrixTransform(matrix: DOMMatrixReadOnly): DOMPoint {
    return matrix.transformPoint(this)
  }

  toJSON() {
    return { x: this.x, y: this.y, z: this.z, w: this.w }
  }
}
