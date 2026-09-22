#include "frame.h"

#import <CoreImage/CoreImage.h>
#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>
#import <IOSurface/IOSurface.h>

#include <cstring>
#include <string>

Napi::FunctionReference VideoToolboxFrame::constructor;

Napi::Object VideoToolboxFrame::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function ctor = DefineClass(
    env,
    "VideoToolboxFrame",
    {
      InstanceMethod<&VideoToolboxFrame::Close>("close"),
      InstanceMethod<&VideoToolboxFrame::CopyPlane>("copyPlane"),
      InstanceMethod<&VideoToolboxFrame::CopyRgba>("copyRgba"),
      InstanceAccessor<&VideoToolboxFrame::Width>("width"),
      InstanceAccessor<&VideoToolboxFrame::Height>("height"),
      InstanceAccessor<&VideoToolboxFrame::PixelFormat>("pixelFormat"),
      InstanceAccessor<&VideoToolboxFrame::FullRange>("fullRange"),
      InstanceAccessor<&VideoToolboxFrame::IosurfaceHandle>("iosurfaceHandle"),
      InstanceAccessor<&VideoToolboxFrame::PlaneCount>("planeCount"),
    }
  );

  constructor = Napi::Persistent(ctor);
  constructor.SuppressDestruct();
  exports.Set("VideoToolboxFrame", ctor);
  return exports;
}

Napi::Object VideoToolboxFrame::NewInstance(
  Napi::Env env,
  CVPixelBufferRef pixel_buffer
) {
  return constructor.New({
    Napi::External<void>::New(
      env,
      reinterpret_cast<void*>(pixel_buffer)
    ),
  });
}

VideoToolboxFrame::VideoToolboxFrame(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<VideoToolboxFrame>(info) {
  Napi::Env env = info.Env();
  if (info.Length() != 1 || !info[0].IsExternal()) {
    Napi::TypeError::New(env, "VideoToolboxFrame cannot be constructed directly")
      .ThrowAsJavaScriptException();
    return;
  }

  pixel_buffer_ = reinterpret_cast<CVPixelBufferRef>(
    info[0].As<Napi::External<void>>().Data()
  );
  if (!pixel_buffer_) {
    Napi::TypeError::New(env, "VideoToolboxFrame requires a CVPixelBuffer")
      .ThrowAsJavaScriptException();
  }
}

VideoToolboxFrame::~VideoToolboxFrame() {
  if (pixel_buffer_) {
    CVPixelBufferRelease(pixel_buffer_);
    pixel_buffer_ = nullptr;
  }
}

CVPixelBufferRef VideoToolboxFrame::RequireFrame(Napi::Env env) {
  if (pixel_buffer_) return pixel_buffer_;

  Napi::Error::New(env, "VideoToolboxFrame is closed")
    .ThrowAsJavaScriptException();
  return nullptr;
}

Napi::Value VideoToolboxFrame::Close(const Napi::CallbackInfo& info) {
  if (pixel_buffer_) {
    CVPixelBufferRelease(pixel_buffer_);
    pixel_buffer_ = nullptr;
  }
  return info.Env().Undefined();
}

Napi::Value VideoToolboxFrame::Width(const Napi::CallbackInfo& info) {
  CVPixelBufferRef frame = RequireFrame(info.Env());
  if (!frame) return info.Env().Undefined();
  return Napi::Number::New(info.Env(), CVPixelBufferGetWidth(frame));
}

Napi::Value VideoToolboxFrame::Height(const Napi::CallbackInfo& info) {
  CVPixelBufferRef frame = RequireFrame(info.Env());
  if (!frame) return info.Env().Undefined();
  return Napi::Number::New(info.Env(), CVPixelBufferGetHeight(frame));
}

Napi::Value VideoToolboxFrame::PixelFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  CVPixelBufferRef frame = RequireFrame(env);
  if (!frame) return env.Undefined();

  const OSType format = CVPixelBufferGetPixelFormatType(frame);
  if (
    format == kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange
    || format == kCVPixelFormatType_420YpCbCr8BiPlanarFullRange
  ) {
    return Napi::String::New(env, "NV12");
  }
  if (format == kCVPixelFormatType_32BGRA) {
    return Napi::String::New(env, "BGRA");
  }

  return env.Null();
}

Napi::Value VideoToolboxFrame::FullRange(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  CVPixelBufferRef frame = RequireFrame(env);
  if (!frame) return env.Undefined();

  const OSType format = CVPixelBufferGetPixelFormatType(frame);
  if (format == kCVPixelFormatType_420YpCbCr8BiPlanarFullRange) {
    return Napi::Boolean::New(env, true);
  }
  if (format == kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange) {
    return Napi::Boolean::New(env, false);
  }

  return env.Null();
}

Napi::Value VideoToolboxFrame::IosurfaceHandle(
  const Napi::CallbackInfo& info
) {
  Napi::Env env = info.Env();
  CVPixelBufferRef frame = RequireFrame(env);
  if (!frame) return env.Undefined();

  IOSurfaceRef surface = CVPixelBufferGetIOSurface(frame);
  if (!surface) {
    Napi::Error::New(env, "VideoToolbox frame has no IOSurface")
      .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  return Napi::Buffer<uint8_t>::Copy(
    env,
    reinterpret_cast<const uint8_t*>(&surface),
    sizeof(surface)
  );
}

Napi::Value VideoToolboxFrame::PlaneCount(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  CVPixelBufferRef frame = RequireFrame(env);
  if (!frame) return env.Undefined();

  const size_t count = CVPixelBufferIsPlanar(frame)
    ? CVPixelBufferGetPlaneCount(frame)
    : 1;
  return Napi::Number::New(env, count);
}

Napi::Value VideoToolboxFrame::CopyPlane(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  CVPixelBufferRef frame = RequireFrame(env);
  if (!frame) return env.Undefined();

  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "copyPlane expects a plane index")
      .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  const size_t plane = info[0].As<Napi::Number>().Uint32Value();
  const bool planar = CVPixelBufferIsPlanar(frame);
  const size_t plane_count = planar ? CVPixelBufferGetPlaneCount(frame) : 1;
  if (plane >= plane_count) {
    Napi::RangeError::New(env, "VideoToolbox plane index is out of range")
      .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  const CVReturn lock_status =
    CVPixelBufferLockBaseAddress(frame, kCVPixelBufferLock_ReadOnly);
  if (lock_status != kCVReturnSuccess) {
    Napi::Error::New(
      env,
      "CVPixelBufferLockBaseAddress failed: " + std::to_string(lock_status)
    ).ThrowAsJavaScriptException();
    return env.Undefined();
  }

  void* base = planar
    ? CVPixelBufferGetBaseAddressOfPlane(frame, plane)
    : CVPixelBufferGetBaseAddress(frame);
  const size_t stride = planar
    ? CVPixelBufferGetBytesPerRowOfPlane(frame, plane)
    : CVPixelBufferGetBytesPerRow(frame);
  const size_t rows = planar
    ? CVPixelBufferGetHeightOfPlane(frame, plane)
    : CVPixelBufferGetHeight(frame);
  const size_t bytes = stride * rows;

  if (!base || bytes == 0) {
    CVPixelBufferUnlockBaseAddress(frame, kCVPixelBufferLock_ReadOnly);
    Napi::Error::New(env, "VideoToolbox frame plane has no readable data")
      .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Buffer<uint8_t> data = Napi::Buffer<uint8_t>::Copy(
    env,
    static_cast<const uint8_t*>(base),
    bytes
  );
  CVPixelBufferUnlockBaseAddress(frame, kCVPixelBufferLock_ReadOnly);

  Napi::Object result = Napi::Object::New(env);
  result.Set("data", data);
  result.Set("stride", Napi::Number::New(env, stride));
  result.Set("rows", Napi::Number::New(env, rows));
  return result;
}

Napi::Value VideoToolboxFrame::CopyRgba(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  CVPixelBufferRef frame = RequireFrame(env);
  if (!frame) return env.Undefined();

  const size_t width = CVPixelBufferGetWidth(frame);
  const size_t height = CVPixelBufferGetHeight(frame);
  const size_t row_bytes = width * 4;
  Napi::Buffer<uint8_t> output =
    Napi::Buffer<uint8_t>::New(env, row_bytes * height);

  std::string color_space_name = "srgb";
  if (info.Length() > 0) {
    if (!info[0].IsString()) {
      Napi::TypeError::New(env, "copyRgba color space must be a string")
        .ThrowAsJavaScriptException();
      return env.Undefined();
    }
    color_space_name = info[0].As<Napi::String>().Utf8Value();
    if (color_space_name != "srgb" && color_space_name != "display-p3") {
      Napi::RangeError::New(
        env,
        "copyRgba color space must be srgb or display-p3"
      ).ThrowAsJavaScriptException();
      return env.Undefined();
    }
  }

  @autoreleasepool {
    static CIContext* context = [[CIContext alloc] initWithOptions:nil];
    CIImage* image = [CIImage imageWithCVPixelBuffer:frame];
    const CFStringRef color_space_constant =
      color_space_name == "display-p3"
        ? kCGColorSpaceDisplayP3
        : kCGColorSpaceSRGB;
    CGColorSpaceRef color_space =
      CGColorSpaceCreateWithName(color_space_constant);

    if (!color_space) {
      Napi::Error::New(env, "Could not create RGB color space")
        .ThrowAsJavaScriptException();
      return env.Undefined();
    }

    [context
      render:image
      toBitmap:output.Data()
      rowBytes:row_bytes
      bounds:CGRectMake(0, 0, width, height)
      format:kCIFormatRGBA8
      colorSpace:color_space];

    CGColorSpaceRelease(color_space);
  }

  return output;
}
