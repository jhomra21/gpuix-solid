#include <napi.h>

#include "videotoolbox_support.h"

#include <CoreFoundation/CoreFoundation.h>
#include <CoreMedia/CoreMedia.h>
#include <CoreVideo/CoreVideo.h>
#include <IOSurface/IOSurface.h>
#include <VideoToolbox/VideoToolbox.h>

#include <algorithm>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <deque>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

namespace {

using gpuix::media::CreateH264FormatDescription;
using gpuix::media::CreateHardwareDecodeSession;
using gpuix::media::CreateSampleBuffer;
using gpuix::media::IsHardwareAccelerated;
using gpuix::media::PacketInput;

class VideoToolboxH264Decoder;

struct StreamFrame {
  CVPixelBufferRef pixel_buffer;
  CMTime presentation_time;
  size_t sequence;
};

struct StreamTask {
  VideoToolboxH264Decoder* decoder;
  Napi::Promise::Deferred deferred;
  Napi::Reference<Napi::Array> packets_ref;
  Napi::ThreadSafeFunction tsfn;
  std::vector<PacketInput> packets;
  std::mutex mutex;
  std::condition_variable cv;
  std::deque<StreamFrame> pending_frames;
  std::thread decode_thread;
  std::thread delivery_thread;
  std::chrono::steady_clock::time_point started;
  std::string error;
  bool decode_done = false;
  bool presentation_order_monotonic = true;
  bool has_last_presentation_time = false;
  CMTime last_presentation_time = kCMTimeInvalid;
  size_t callback_sequence = 0;
  size_t submitted = 0;
  size_t decoded = 0;
  size_t delivered = 0;
  uint32_t dropped = 0;
  double decode_ms = 0;
  const size_t max_pending_frames = 2;

  StreamTask(
    VideoToolboxH264Decoder* decoder_value,
    Napi::Env env,
    const Napi::Array& packet_values
  )
      : decoder(decoder_value),
        deferred(Napi::Promise::Deferred::New(env)),
        packets_ref(Napi::Persistent(packet_values)) {}

  void SetError(const std::string& message) {
    std::lock_guard<std::mutex> lock(mutex);
    if (error.empty()) error = message;
    cv.notify_all();
  }

  bool HasError() {
    std::lock_guard<std::mutex> lock(mutex);
    return !error.empty();
  }
};

struct StreamDelivery {
  StreamTask* task;
  CVPixelBufferRef pixel_buffer;
  CMTime presentation_time;
};

class VideoToolboxH264Decoder final : public Napi::ObjectWrap<VideoToolboxH264Decoder> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::Function ctor = DefineClass(
      env,
      "VideoToolboxH264Decoder",
      {
        InstanceMethod<&VideoToolboxH264Decoder::DecodeBatch>("decodeBatch"),
        InstanceMethod<&VideoToolboxH264Decoder::DecodeStream>("decodeStream"),
        InstanceMethod<&VideoToolboxH264Decoder::ReleaseFrames>("releaseFrames"),
        InstanceMethod<&VideoToolboxH264Decoder::Dispose>("dispose"),
        InstanceAccessor<&VideoToolboxH264Decoder::HardwareAccelerated>("hardwareAccelerated"),
      }
    );

    constructor = Napi::Persistent(ctor);
    constructor.SuppressDestruct();
    exports.Set("VideoToolboxH264Decoder", ctor);
    return exports;
  }

  explicit VideoToolboxH264Decoder(const Napi::CallbackInfo& info)
      : Napi::ObjectWrap<VideoToolboxH264Decoder>(info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsBuffer()) {
      Napi::TypeError::New(env, "Expected AVCDecoderConfigurationRecord Buffer").ThrowAsJavaScriptException();
      return;
    }

    Napi::Buffer<uint8_t> description = info[0].As<Napi::Buffer<uint8_t>>();
    config_.assign(description.Data(), description.Data() + description.Length());

    std::string error;
    if (!CreateH264FormatDescription(config_, &format_description_, error)) {
      Napi::Error::New(env, error).ThrowAsJavaScriptException();
      return;
    }
    if (!CreateHardwareDecodeSession(
      format_description_,
      this,
      &VideoToolboxH264Decoder::OutputCallback,
      &session_,
      error
    )) {
      Napi::Error::New(env, error).ThrowAsJavaScriptException();
      return;
    }
  }

  ~VideoToolboxH264Decoder() override {
    Destroy();
  }

 private:
  struct CapturedFrame {
    CVPixelBufferRef pixel_buffer;
    CMTime presentation_time;
    size_t sequence;
  };

  struct OutputState {
    std::mutex mutex;
    std::chrono::steady_clock::time_point started;
    size_t frames = 0;
    int width = 0;
    int height = 0;
    double first_frame_ms = 0;
    double last_frame_ms = 0;
    std::vector<double> arrival_ms;
    std::vector<CapturedFrame> captured_frames;
    bool capture_frames = false;
    size_t capture_sequence = 0;
    OSStatus callback_status = noErr;
    uint32_t dropped = 0;
  };

  static Napi::FunctionReference constructor;

  std::vector<uint8_t> config_;
  CMVideoFormatDescriptionRef format_description_ = nullptr;
  VTDecompressionSessionRef session_ = nullptr;
  OutputState output_;
  std::atomic<StreamTask*> active_stream_{nullptr};

  static void OutputCallback(
    void* decompression_output_refcon,
    void*,
    OSStatus status,
    VTDecodeInfoFlags info_flags,
    CVImageBufferRef image_buffer,
    CMTime presentation_time_stamp,
    CMTime
  ) {
    auto* self = static_cast<VideoToolboxH264Decoder*>(decompression_output_refcon);
    if (!self) return;

    StreamTask* stream = self->active_stream_.load(std::memory_order_acquire);
    if (stream) {
      self->HandleStreamOutput(
        stream,
        status,
        info_flags,
        image_buffer,
        presentation_time_stamp
      );
      return;
    }

    const auto now = std::chrono::steady_clock::now();
    std::lock_guard<std::mutex> lock(self->output_.mutex);

    if (status != noErr) {
      if (self->output_.callback_status == noErr) self->output_.callback_status = status;
      return;
    }
    if ((info_flags & kVTDecodeInfo_FrameDropped) != 0) {
      self->output_.dropped += 1;
      return;
    }
    if (!image_buffer) return;

    const double elapsed_ms =
      std::chrono::duration<double, std::milli>(now - self->output_.started).count();

    if (self->output_.frames == 0) {
      self->output_.first_frame_ms = elapsed_ms;
    }
    self->output_.last_frame_ms = elapsed_ms;
    self->output_.arrival_ms.push_back(elapsed_ms);
    self->output_.frames += 1;
    self->output_.width = static_cast<int>(CVPixelBufferGetWidth(image_buffer));
    self->output_.height = static_cast<int>(CVPixelBufferGetHeight(image_buffer));
    if (self->output_.capture_frames) {
      CVPixelBufferRetain(image_buffer);
      self->output_.captured_frames.push_back({
        image_buffer,
        presentation_time_stamp,
        self->output_.capture_sequence++,
      });
    }
  }

  Napi::Value HardwareAccelerated(const Napi::CallbackInfo& info) {
    return Napi::Boolean::New(info.Env(), IsHardwareAccelerated(session_));
  }

  void HandleStreamOutput(
    StreamTask* task,
    OSStatus status,
    VTDecodeInfoFlags info_flags,
    CVImageBufferRef image_buffer,
    CMTime presentation_time_stamp
  ) {
    if (status != noErr) {
      task->SetError(
        "VideoToolbox streaming output callback failed: " + std::to_string(status)
      );
      return;
    }

    if ((info_flags & kVTDecodeInfo_FrameDropped) != 0) {
      std::lock_guard<std::mutex> lock(task->mutex);
      task->dropped += 1;
      task->cv.notify_all();
      return;
    }

    if (!image_buffer) return;

    CVPixelBufferRetain(image_buffer);
    std::unique_lock<std::mutex> lock(task->mutex);
    task->cv.wait(lock, [&] {
      return task->pending_frames.size() < task->max_pending_frames
        || !task->error.empty();
    });

    if (!task->error.empty()) {
      lock.unlock();
      CVPixelBufferRelease(image_buffer);
      return;
    }

    task->pending_frames.push_back({
      image_buffer,
      presentation_time_stamp,
      task->callback_sequence++,
    });
    task->decoded += 1;
    lock.unlock();
    task->cv.notify_all();
  }

  void RunStreamDelivery(StreamTask* task) {
    for (;;) {
      StreamFrame frame{
        nullptr,
        kCMTimeInvalid,
        0,
      };

      {
        std::unique_lock<std::mutex> lock(task->mutex);
        task->cv.wait(lock, [&] {
          return !task->pending_frames.empty()
            || task->decode_done
            || !task->error.empty();
        });

        if (task->pending_frames.empty()) {
          if (task->decode_done) break;
          continue;
        }

        frame = task->pending_frames.front();
        task->pending_frames.pop_front();
        task->cv.notify_all();
      }

      if (task->HasError()) {
        if (frame.pixel_buffer) CVPixelBufferRelease(frame.pixel_buffer);
        continue;
      }

      if (
        task->has_last_presentation_time
        && CMTIME_IS_NUMERIC(task->last_presentation_time)
        && CMTIME_IS_NUMERIC(frame.presentation_time)
        && CMTimeCompare(frame.presentation_time, task->last_presentation_time) < 0
      ) {
        task->presentation_order_monotonic = false;
      }
      if (CMTIME_IS_NUMERIC(frame.presentation_time)) {
        task->last_presentation_time = frame.presentation_time;
        task->has_last_presentation_time = true;
      }

      auto* delivery = new StreamDelivery{
        task,
        frame.pixel_buffer,
        frame.presentation_time,
      };

      const napi_status call_status = task->tsfn.BlockingCall(
        delivery,
        [](Napi::Env env, Napi::Function callback, StreamDelivery* value) {
          IOSurfaceRef surface = CVPixelBufferGetIOSurface(value->pixel_buffer);
          if (!surface) {
            value->task->SetError(
              "Streaming VideoToolbox frame did not expose an IOSurface"
            );
            CVPixelBufferRelease(value->pixel_buffer);
            delete value;
            return;
          }

          Napi::Buffer<uint8_t> handle = Napi::Buffer<uint8_t>::Copy(
            env,
            reinterpret_cast<const uint8_t*>(&surface),
            sizeof(surface)
          );

          double timestamp_us = 0;
          if (CMTIME_IS_NUMERIC(value->presentation_time)) {
            timestamp_us = CMTimeGetSeconds(value->presentation_time) * 1'000'000.0;
          }

          callback.Call({
            handle,
            Napi::Number::New(env, timestamp_us),
          });

          if (env.IsExceptionPending()) {
            Napi::Error error = env.GetAndClearPendingException();
            value->task->SetError(
              "Streaming frame callback failed: " + error.Message()
            );
          } else {
            std::lock_guard<std::mutex> lock(value->task->mutex);
            value->task->delivered += 1;
          }

          CVPixelBufferRelease(value->pixel_buffer);
          delete value;
        }
      );

      if (call_status != napi_ok) {
        CVPixelBufferRelease(frame.pixel_buffer);
        delete delivery;
        task->SetError(
          "Could not queue streaming VideoToolbox frame callback: "
          + std::to_string(call_status)
        );
      }
    }

    task->tsfn.Release();
  }

  void RunStreamDecode(StreamTask* task) {
    const auto started = std::chrono::steady_clock::now();
    std::vector<CMSampleBufferRef> samples;
    samples.reserve(task->packets.size());

    OSStatus decode_status = noErr;

    for (const PacketInput& packet : task->packets) {
      if (task->HasError()) break;
      if (packet.size == 0) continue;

      CMBlockBufferRef block = nullptr;
      OSStatus status = CMBlockBufferCreateWithMemoryBlock(
        kCFAllocatorDefault,
        packet.data,
        packet.size,
        kCFAllocatorNull,
        nullptr,
        0,
        packet.size,
        0,
        &block
      );
      if (status != noErr || !block) {
        decode_status = status;
        break;
      }

      CMSampleTimingInfo timing{
        packet.duration_us > 0
          ? CMTimeMake(packet.duration_us, 1'000'000)
          : kCMTimeInvalid,
        CMTimeMake(packet.timestamp_us, 1'000'000),
        kCMTimeInvalid,
      };
      const size_t sample_size = packet.size;
      CMSampleBufferRef sample = nullptr;
      status = CMSampleBufferCreateReady(
        kCFAllocatorDefault,
        block,
        format_description_,
        1,
        1,
        &timing,
        1,
        &sample_size,
        &sample
      );
      CFRelease(block);

      if (status != noErr || !sample) {
        decode_status = status;
        break;
      }

      CFArrayRef attachments = CMSampleBufferGetSampleAttachmentsArray(sample, true);
      if (attachments && CFArrayGetCount(attachments) > 0 && !packet.keyframe) {
        CFMutableDictionaryRef attachment =
          (CFMutableDictionaryRef)CFArrayGetValueAtIndex(attachments, 0);
        CFDictionarySetValue(
          attachment,
          kCMSampleAttachmentKey_NotSync,
          kCFBooleanTrue
        );
      }

      VTDecodeInfoFlags info_flags = 0;
      status = VTDecompressionSessionDecodeFrame(
        session_,
        sample,
        kVTDecodeFrame_EnableAsynchronousDecompression,
        nullptr,
        &info_flags
      );
      samples.push_back(sample);

      if (status != noErr) {
        decode_status = status;
        break;
      }

      task->submitted += 1;
    }

    if (decode_status == noErr && !task->HasError()) {
      decode_status = VTDecompressionSessionFinishDelayedFrames(session_);
    }

    const OSStatus wait_status =
      VTDecompressionSessionWaitForAsynchronousFrames(session_);
    if (decode_status == noErr && wait_status != noErr) {
      decode_status = wait_status;
    }

    for (CMSampleBufferRef sample : samples) {
      CFRelease(sample);
    }

    if (decode_status != noErr) {
      task->SetError(
        "Streaming VideoToolbox decode failed: " + std::to_string(decode_status)
      );
    }

    {
      std::lock_guard<std::mutex> lock(task->mutex);
      task->decode_ms = std::chrono::duration<double, std::milli>(
        std::chrono::steady_clock::now() - started
      ).count();
      task->decode_done = true;
    }
    task->cv.notify_all();
  }

  void FinalizeStream(Napi::Env env, StreamTask* task) {
    if (task->decode_thread.joinable()) task->decode_thread.join();
    if (task->delivery_thread.joinable()) task->delivery_thread.join();

    active_stream_.store(nullptr, std::memory_order_release);

    std::string error;
    size_t submitted = 0;
    size_t decoded = 0;
    size_t delivered = 0;
    uint32_t dropped = 0;
    double decode_ms = 0;
    bool presentation_order_monotonic = true;

    {
      std::lock_guard<std::mutex> lock(task->mutex);
      error = task->error;
      submitted = task->submitted;
      decoded = task->decoded;
      delivered = task->delivered;
      dropped = task->dropped;
      decode_ms = task->decode_ms;
      presentation_order_monotonic = task->presentation_order_monotonic;
    }

    task->packets_ref.Reset();

    if (!error.empty()) {
      task->deferred.Reject(Napi::Error::New(env, error).Value());
    } else {
      Napi::Object result = Napi::Object::New(env);
      result.Set("submitted", Napi::Number::New(env, submitted));
      result.Set("decoded", Napi::Number::New(env, decoded));
      result.Set("delivered", Napi::Number::New(env, delivered));
      result.Set("dropped", Napi::Number::New(env, dropped));
      result.Set("decodeMs", Napi::Number::New(env, decode_ms));
      result.Set(
        "presentationOrderMonotonic",
        Napi::Boolean::New(env, presentation_order_monotonic)
      );
      result.Set(
        "hardwareAccelerated",
        Napi::Boolean::New(env, IsHardwareAccelerated(session_))
      );
      result.Set(
        "maxPendingFrames",
        Napi::Number::New(env, task->max_pending_frames)
      );
      task->deferred.Resolve(result);
    }

    this->Unref();
    delete task;
  }

  Napi::Value DecodeStream(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!session_) {
      Napi::Error::New(env, "VideoToolbox decoder is disposed")
        .ThrowAsJavaScriptException();
      return env.Undefined();
    }
    if (info.Length() < 2 || !info[0].IsArray() || !info[1].IsFunction()) {
      Napi::TypeError::New(
        env,
        "Expected encoded packet array and synchronous frame callback"
      ).ThrowAsJavaScriptException();
      return env.Undefined();
    }
    if (active_stream_.load(std::memory_order_acquire) != nullptr) {
      Napi::Error::New(env, "VideoToolbox streaming decode is already active")
        .ThrowAsJavaScriptException();
      return env.Undefined();
    }

    Napi::Array values = info[0].As<Napi::Array>();
    auto* task = new StreamTask(this, env, values);
    task->packets.reserve(values.Length());

    for (uint32_t index = 0; index < values.Length(); ++index) {
      PacketInput packet{
        nullptr,
        0,
        0,
        0,
        false,
      };
      if (!ReadPacketInput(env, values.Get(index), packet)) {
        task->packets_ref.Reset();
        delete task;
        return env.Undefined();
      }
      task->packets.push_back(packet);
    }

    StreamTask* expected = nullptr;
    if (!active_stream_.compare_exchange_strong(
      expected,
      task,
      std::memory_order_acq_rel
    )) {
      task->packets_ref.Reset();
      delete task;
      Napi::Error::New(env, "VideoToolbox streaming decode is already active")
        .ThrowAsJavaScriptException();
      return env.Undefined();
    }

    this->Ref();
    task->started = std::chrono::steady_clock::now();
    task->tsfn = Napi::ThreadSafeFunction::New(
      env,
      info[1].As<Napi::Function>(),
      "gpuix-videotoolbox-frame-stream",
      1,
      1,
      [](Napi::Env finalize_env, StreamTask* finalize_task) {
        finalize_task->decoder->FinalizeStream(finalize_env, finalize_task);
      },
      task
    );

    task->delivery_thread = std::thread([this, task] {
      RunStreamDelivery(task);
    });
    task->decode_thread = std::thread([this, task] {
      RunStreamDecode(task);
    });

    return task->deferred.Promise();
  }

  static bool ReadPacketInput(
    Napi::Env env,
    const Napi::Value& value,
    PacketInput& out
  ) {
    if (!value.IsObject()) {
      Napi::TypeError::New(env, "decodeBatch entries must be objects").ThrowAsJavaScriptException();
      return false;
    }

    Napi::Object object = value.As<Napi::Object>();
    Napi::Value data_value = object.Get("data");
    if (!data_value.IsBuffer()) {
      Napi::TypeError::New(env, "decodeBatch packet.data must be a Buffer").ThrowAsJavaScriptException();
      return false;
    }

    Napi::Buffer<uint8_t> buffer = data_value.As<Napi::Buffer<uint8_t>>();
    out.data = buffer.Data();
    out.size = buffer.Length();
    out.timestamp_us = object.Get("timestamp").ToNumber().Int64Value();

    Napi::Value duration_value = object.Get("duration");
    out.duration_us = duration_value.IsNumber()
      ? duration_value.As<Napi::Number>().Int64Value()
      : 0;

    Napi::Value key_value = object.Get("keyframe");
    out.keyframe = key_value.IsBoolean() && key_value.As<Napi::Boolean>().Value();
    return true;
  }

  Napi::Value DecodeBatch(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    const auto batch_started = std::chrono::steady_clock::now();
    if (active_stream_.load(std::memory_order_acquire) != nullptr) {
      Napi::Error::New(env, "Cannot run decodeBatch while decodeStream is active")
        .ThrowAsJavaScriptException();
      return env.Undefined();
    }
    if (!session_) {
      Napi::Error::New(env, "VideoToolbox decoder is disposed").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    if (info.Length() < 1 || !info[0].IsArray()) {
      Napi::TypeError::New(env, "Expected an array of encoded packets").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    const bool capture_frames =
      info.Length() > 1 && info[1].IsBoolean() && info[1].As<Napi::Boolean>().Value();
    const bool finish =
      info.Length() < 3 || !info[2].IsBoolean() || info[2].As<Napi::Boolean>().Value();

    Napi::Array values = info[0].As<Napi::Array>();
    std::vector<PacketInput> packets;
    packets.reserve(values.Length());
    for (uint32_t index = 0; index < values.Length(); ++index) {
      PacketInput packet{
        nullptr,
        0,
        0,
        0,
        false,
      };
      if (!ReadPacketInput(env, values.Get(index), packet)) {
        return env.Undefined();
      }
      packets.push_back(packet);
    }
    const auto packets_parsed = std::chrono::steady_clock::now();

    {
      std::lock_guard<std::mutex> lock(output_.mutex);
      if (!output_.captured_frames.empty()) {
        Napi::Error::New(
          env,
          "releaseFrames() must be called before decoding another captured batch"
        ).ThrowAsJavaScriptException();
        return env.Undefined();
      }
      output_.capture_frames = capture_frames;
      output_.capture_sequence = 0;
      output_.started = batch_started;
      output_.frames = 0;
      output_.width = 0;
      output_.height = 0;
      output_.first_frame_ms = 0;
      output_.last_frame_ms = 0;
      output_.arrival_ms.clear();
      output_.callback_status = noErr;
      output_.dropped = 0;
    }

    std::vector<CMSampleBufferRef> samples;
    samples.reserve(packets.size());

    OSStatus submit_status = noErr;
    size_t submitted = 0;
    double sample_build_ms = 0;
    double submit_ms = 0;

    for (const PacketInput& packet : packets) {
      if (packet.size == 0) continue;

      const auto sample_build_started = std::chrono::steady_clock::now();
      CMBlockBufferRef block = nullptr;
      OSStatus status = CMBlockBufferCreateWithMemoryBlock(
        kCFAllocatorDefault,
        packet.data,
        packet.size,
        kCFAllocatorNull,
        nullptr,
        0,
        packet.size,
        0,
        &block
      );
      if (status != noErr || !block) {
        submit_status = status;
        break;
      }

      CMSampleTimingInfo timing{
        packet.duration_us > 0 ? CMTimeMake(packet.duration_us, 1'000'000) : kCMTimeInvalid,
        CMTimeMake(packet.timestamp_us, 1'000'000),
        kCMTimeInvalid,
      };
      const size_t sample_size = packet.size;
      CMSampleBufferRef sample = nullptr;
      status = CMSampleBufferCreateReady(
        kCFAllocatorDefault,
        block,
        format_description_,
        1,
        1,
        &timing,
        1,
        &sample_size,
        &sample
      );
      CFRelease(block);

      if (status != noErr || !sample) {
        submit_status = status;
        break;
      }

      CFArrayRef attachments = CMSampleBufferGetSampleAttachmentsArray(sample, true);
      if (attachments && CFArrayGetCount(attachments) > 0 && !packet.keyframe) {
        CFMutableDictionaryRef attachment =
          (CFMutableDictionaryRef)CFArrayGetValueAtIndex(attachments, 0);
        CFDictionarySetValue(attachment, kCMSampleAttachmentKey_NotSync, kCFBooleanTrue);
      }

      const auto sample_build_ended = std::chrono::steady_clock::now();
      sample_build_ms += std::chrono::duration<double, std::milli>(
        sample_build_ended - sample_build_started
      ).count();

      VTDecodeInfoFlags info_flags = 0;
      const auto submit_started = std::chrono::steady_clock::now();
      status = VTDecompressionSessionDecodeFrame(
        session_,
        sample,
        kVTDecodeFrame_EnableAsynchronousDecompression,
        nullptr,
        &info_flags
      );
      const auto submit_ended = std::chrono::steady_clock::now();
      submit_ms += std::chrono::duration<double, std::milli>(
        submit_ended - submit_started
      ).count();
      samples.push_back(sample);

      if (status != noErr) {
        submit_status = status;
        break;
      }
      submitted += 1;
    }

    const auto wait_started = std::chrono::steady_clock::now();
    if (submit_status == noErr && finish) {
      submit_status = VTDecompressionSessionFinishDelayedFrames(session_);
    }
    if (submit_status == noErr) {
      submit_status = VTDecompressionSessionWaitForAsynchronousFrames(session_);
    }
    const auto wait_ended = std::chrono::steady_clock::now();
    const double wait_ms = std::chrono::duration<double, std::milli>(
      wait_ended - wait_started
    ).count();

    for (CMSampleBufferRef sample : samples) {
      CFRelease(sample);
    }

    const auto native_ended = std::chrono::steady_clock::now();
    const double total_ms =
      std::chrono::duration<double, std::milli>(native_ended - batch_started).count();
    const double packet_parse_ms =
      std::chrono::duration<double, std::milli>(packets_parsed - batch_started).count();

    size_t frames = 0;
    int width = 0;
    int height = 0;
    double first_frame_ms = 0;
    double last_frame_ms = 0;
    std::vector<double> arrival_ms;
    std::vector<CapturedFrame> captured_frames;
    OSStatus callback_status = noErr;
    uint32_t dropped = 0;
    {
      std::lock_guard<std::mutex> lock(output_.mutex);
      frames = output_.frames;
      width = output_.width;
      height = output_.height;
      first_frame_ms = output_.first_frame_ms;
      last_frame_ms = output_.last_frame_ms;
      arrival_ms = output_.arrival_ms;
      if (capture_frames) {
        std::stable_sort(
          output_.captured_frames.begin(),
          output_.captured_frames.end(),
          [](const CapturedFrame& left, const CapturedFrame& right) {
            const bool left_numeric = CMTIME_IS_NUMERIC(left.presentation_time);
            const bool right_numeric = CMTIME_IS_NUMERIC(right.presentation_time);
            if (left_numeric && right_numeric) {
              const int comparison = CMTimeCompare(
                left.presentation_time,
                right.presentation_time
              );
              if (comparison != 0) return comparison < 0;
            }
            return left.sequence < right.sequence;
          }
        );
        captured_frames = output_.captured_frames;
      }
      callback_status = output_.callback_status;
      dropped = output_.dropped;
    }

    if (submit_status != noErr) {
      Napi::Error::New(
        env,
        "VideoToolbox batch decode failed: " + std::to_string(submit_status)
      ).ThrowAsJavaScriptException();
      return env.Undefined();
    }
    if (callback_status != noErr) {
      Napi::Error::New(
        env,
        "VideoToolbox output callback failed: " + std::to_string(callback_status)
      ).ThrowAsJavaScriptException();
      return env.Undefined();
    }

    Napi::Object result = Napi::Object::New(env);
    result.Set("packets", Napi::Number::New(env, packets.size()));
    result.Set("submitted", Napi::Number::New(env, submitted));
    result.Set("frames", Napi::Number::New(env, frames));
    result.Set("dropped", Napi::Number::New(env, dropped));
    result.Set("width", Napi::Number::New(env, width));
    result.Set("height", Napi::Number::New(env, height));
    result.Set("totalMs", Napi::Number::New(env, total_ms));
    result.Set("packetParseMs", Napi::Number::New(env, packet_parse_ms));
    result.Set("sampleBuildMs", Napi::Number::New(env, sample_build_ms));
    result.Set("submitMs", Napi::Number::New(env, submit_ms));
    result.Set("waitMs", Napi::Number::New(env, wait_ms));
    result.Set("firstFrameMs", Napi::Number::New(env, first_frame_ms));
    result.Set("lastFrameMs", Napi::Number::New(env, last_frame_ms));
    Napi::Array arrivals = Napi::Array::New(env, arrival_ms.size());
    for (size_t index = 0; index < arrival_ms.size(); ++index) {
      arrivals.Set(index, Napi::Number::New(env, arrival_ms[index]));
    }
    result.Set("frameArrivalMs", arrivals);
    if (capture_frames) {
      Napi::Array handles = Napi::Array::New(env, captured_frames.size());
      for (size_t index = 0; index < captured_frames.size(); ++index) {
        IOSurfaceRef surface =
          CVPixelBufferGetIOSurface(captured_frames[index].pixel_buffer);
        if (!surface) {
          Napi::Error::New(
            env,
            "VideoToolbox returned a captured frame without an IOSurface"
          ).ThrowAsJavaScriptException();
          return env.Undefined();
        }
        handles.Set(
          index,
          Napi::Buffer<uint8_t>::Copy(
            env,
            reinterpret_cast<const uint8_t*>(&surface),
            sizeof(surface)
          )
        );
      }
      result.Set("frameHandles", handles);
    }
    result.Set("hardwareAccelerated", Napi::Boolean::New(env, IsHardwareAccelerated(session_)));
    return result;
  }

  Napi::Value ReleaseFrames(const Napi::CallbackInfo& info) {
    if (active_stream_.load(std::memory_order_acquire) != nullptr) {
      Napi::Error::New(
        info.Env(),
        "decodeStream owns frame lifetimes while streaming is active"
      ).ThrowAsJavaScriptException();
      return info.Env().Undefined();
    }
    size_t released = 0;
    {
      std::lock_guard<std::mutex> lock(output_.mutex);
      for (const CapturedFrame& frame : output_.captured_frames) {
        if (frame.pixel_buffer) CVPixelBufferRelease(frame.pixel_buffer);
        released += 1;
      }
      output_.captured_frames.clear();
      output_.capture_frames = false;
      output_.capture_sequence = 0;
    }
    return Napi::Number::New(info.Env(), released);
  }

  Napi::Value Dispose(const Napi::CallbackInfo& info) {
    if (active_stream_.load(std::memory_order_acquire) != nullptr) {
      Napi::Error::New(
        info.Env(),
        "Cannot dispose VideoToolbox decoder while decodeStream is active"
      ).ThrowAsJavaScriptException();
      return info.Env().Undefined();
    }
    Destroy();
    return info.Env().Undefined();
  }

  void Destroy() {
    if (session_) {
      VTDecompressionSessionWaitForAsynchronousFrames(session_);
      VTDecompressionSessionInvalidate(session_);
      CFRelease(session_);
      session_ = nullptr;
    }
    {
      std::lock_guard<std::mutex> lock(output_.mutex);
      for (const CapturedFrame& frame : output_.captured_frames) {
        if (frame.pixel_buffer) CVPixelBufferRelease(frame.pixel_buffer);
      }
      output_.captured_frames.clear();
      output_.capture_frames = false;
    }
    if (format_description_) {
      CFRelease(format_description_);
      format_description_ = nullptr;
    }
  }
};

Napi::FunctionReference VideoToolboxH264Decoder::constructor;

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  return VideoToolboxH264Decoder::Init(env, exports);
}

NODE_API_MODULE(gpuix_videotoolbox, InitAll)

}  // namespace
