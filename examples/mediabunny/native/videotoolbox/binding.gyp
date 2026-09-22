{
  "targets": [
    {
      "target_name": "gpuix_videotoolbox",
      "sources": ["decoder.mm", "videotoolbox_support.mm"],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "libraries": [
        "-framework CoreFoundation",
        "-framework CoreMedia",
        "-framework CoreVideo",
        "-framework IOSurface",
        "-framework VideoToolbox"
      ],
      "xcode_settings": {
        "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
        "MACOSX_DEPLOYMENT_TARGET": "12.0",
        "OTHER_CPLUSPLUSFLAGS": ["-O3"]
      }
    }
  ]
}
