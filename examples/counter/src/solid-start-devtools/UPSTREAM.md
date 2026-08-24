# Solid Start Devtools upstream reference

This native example adapts the UI structure of the official Solid Start Devtools project:

- Project: `@solidjs/start-devtools`
- Organization: SolidJS
- Repository: https://github.com/solidjs/solid-start-devtools
- Upstream revision consulted: `c11dcca2d1e90ef182265d76d7f28b3c4f74f135`
- Upstream toolbar entry point: `src/dev-toolbar/index.tsx`
- Upstream server-function viewer: `src/dev-toolbar/functions/index.tsx`
- Upstream Solid peer dependency at that revision: `solid-js ^2.0.0-rc.0`
- License: MIT

The GPUix Solid example is a fresh native implementation. It preserves the application shape most useful for renderer dogfooding—dev toolbar, server-function list/detail split view, request/response tabs, status badges, body/header/information sections, error viewer, filtering, and conditional state—while replacing DOM, Terracotta, CSS, network capture, and browser-specific APIs with deterministic local data and native GPUIX elements.

## MIT License

Copyright (c) SolidJS contributors

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
