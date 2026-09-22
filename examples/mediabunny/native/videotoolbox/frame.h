#pragma once

#include <napi.h>

#include <CoreVideo/CoreVideo.h>

class VideoToolboxFrame final : public Napi::ObjectWrap<VideoToolboxFrame> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  static Napi::Object NewInstance(Napi::Env env, CVPixelBufferRef pixel_buffer);

  explicit VideoToolboxFrame(const Napi::CallbackInfo& info);
  ~VideoToolboxFrame() override;

 private:
  static Napi::FunctionReference constructor;

  CVPixelBufferRef pixel_buffer_ = nullptr;

  CVPixelBufferRef RequireFrame(Napi::Env env);
  Napi::Value Close(const Napi::CallbackInfo& info);
  Napi::Value Width(const Napi::CallbackInfo& info);
  Napi::Value Height(const Napi::CallbackInfo& info);
  Napi::Value PixelFormat(const Napi::CallbackInfo& info);
  Napi::Value FullRange(const Napi::CallbackInfo& info);
  Napi::Value IosurfaceHandle(const Napi::CallbackInfo& info);
  Napi::Value PlaneCount(const Napi::CallbackInfo& info);
  Napi::Value CopyPlane(const Napi::CallbackInfo& info);
  Napi::Value CopyRgba(const Napi::CallbackInfo& info);
};
