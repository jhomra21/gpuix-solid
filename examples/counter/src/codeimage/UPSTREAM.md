# CodeImage upstream reference

This native example is an adaptation of the editor composition and visual ideas from CodeImage:

- Project: CodeImage
- Author: Riccardo Perra
- Repository: https://github.com/riccardoperra/codeimage
- Upstream revision consulted: `27b185f18d36f2baec3a8cc5a43e8794586096c3`
- Upstream editor entry point: `apps/codeimage/src/pages/Editor/App.tsx`
- Upstream Solid version at that revision: `1.9.12`

The GPUix Solid example is a fresh Solid 2 + GPUIX implementation. It does not vendor CodeImage's backend, CodeMirror editor, UI kit, vanilla-extract styles, authentication, export pipeline, or application state packages. The example keeps the broad editor composition—toolbar, tool rail, central preview canvas, frame/window controls, theme controls—and implements deterministic native equivalents specifically to exercise GPUix Solid.

## MIT License

Copyright (c) 2022 Riccardo Perra

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
