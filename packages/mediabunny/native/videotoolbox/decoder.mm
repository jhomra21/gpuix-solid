#include <napi.h>

#include "frame.h"
#include "videotoolbox_support.h"

#include <CoreFoundation/CoreFoundation.h>
#include <CoreMedia/CoreMedia.h>
#include <CoreVideo/CoreVideo.h>
#include <IOSurface/IOSurface.h>
#include <VideoToolbox/VideoToolbox.h>

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

using gpuix::media::CreateVideoFormatDescription;
using gpuix::media::CreateHardwareDecodeSession;
using gpuix::media::CreateSampleBuffer;
using gpuix::media::IsHardwareAccelerated;
using gpuix::media::PacketInput;

class VideoToolboxVideoDecoder;

struct StreamFrame {
  CVPixelBufferRef pixel_buffer;
  CMTime presentation_time;
};

struct StreamTask {
  VideoToolboxVideoDecoder* decoder;
  Napi::Promise::Deferred deferred;
  Napi::Reference<Napi::Array> packets_ref;
  Napi::ThreadSafeFunction tsfn;
  std::vector<PacketInput> packets;
  std::mutex mutex;
  std::condition_variable cv;
  std::deque<StreamFrame> pending_frames;
  std::thread decode_thread;
  std::thread delivery_thread;
  std::string error;
  bool decode_done = false;
  bool finish_delayed_frames = true;
  bool presentation_order_monotonic = true;
  bool has_last_presentation_time = false;
  CMTime last_presentation_time = kCMTimeInvalid;
  size_t submitted = 0;
  size_t decoded = 0;
  size_t delivered = 0;
  uint32_t dropped = 0;
  double decode_ms = 0;
  const size_t max_pending_frames = 2;

  StreamTask(
    VideoToolboxVideoDecoder* decoder_value,
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

class VideoToolboxVideoDecoder final : public Napi::ObjectWrap<VideoToolboxVideoDecoder> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::Function ctor = DefineClass(
      env,
      "VideoToolboxVideoDecoder",
      {
        InstanceMethod<&VideoToolboxVideoDecoder::DecodeBatch>("decodeBatch"),
        InstanceMethod<&VideoToolboxVideoDecoder::DecodeStream>("decodeStream"),
        InstanceMethod<&VideoToolboxVideoDecoder::Reset>("reset"),
        InstanceMethod<&VideoToolboxVideoDecoder::Dispose>("dispose"),
        InstanceAccessor<&VideoToolboxVideoDecoder::HardwareAccelerated>("hardwareAccelerated"),
      }
    );

    constructor = Napi::Persistent(ctor);
    constructor.SuppressDestruct();
    exports.Set("VideoToolboxVideoDecoder", ctor);
    return exports;
  }

  explicit VideoToolboxVideoDecoder(const Napi::CallbackInfo& info)
      : Napi::ObjectWrap<VideoToolboxVideoDecoder>(info) {
    Napi::Env env = info.Env();
    if (
      info.Length() < 2
      || !info[0].IsString()
      || !info[1].IsBuffer()
    ) {
      Napi::TypeError::New(
        env,
        "Expected codec string and decoder configuration Buffer"
      ).ThrowAsJavaScriptException();
      return;
    }

    codec_ = info[0].As<Napi::String>().Utf8Value();
    Napi::Buffer<uint8_t> description = info[1].As<Napi::Buffer<uint8_t>>();
    config_.assign(description.Data(), description.Data() + description.Length());

    std::string error;
    if (!CreateVideoFormatDescription(
      codec_,
      config_,
      &format_description_,
      error
    )) {
      Napi::Error::New(env, error).ThrowAsJavaScriptException();
      return;
    }
    if (!CreateHardwareDecodeSession(
      format_description_,
      this,
      &VideoToolboxVideoDecoder::OutputCallback,
      &session_,
      error
    )) {
      Napi::Error::New(env, error).ThrowAsJavaScriptException();
      return;
    }
  }

  ~VideoToolboxVideoDecoder() override {
    Destroy();
  }

 private:
  struct OutputState {
    std::mutex mutex;
    std::chrono::steady_clock::time_point started;
    size_t frames = 0;
    int width = 0;
    int height = 0;
    double first_frame_ms = 0;
    double last_frame_ms = 0;
    std::vector<double> arrival_ms;
    OSStatus callback_status = noErr;
    uint32_t dropped = 0;
  };

  static Napi::FunctionReference constructor;

  std::string codec_;
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
    auto* self = static_cast<VideoToolboxVideoDecoder*>(decompression_output_refcon);
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
      };

      {
        std::unique_lock<std::mutex> lock(task->mutex);
        task->cv.wait(lock, [&] {
          return !task->pending_frames.empty() || task->decode_done;
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
          Napi::Object frame =
            VideoToolboxFrame::NewInstance(env, value->pixel_buffer);
          if (env.IsExceptionPending()) {
            CVPixelBufferRelease(value->pixel_buffer);
            delete value;
            return;
          }

          double timestamp_us = 0;
          if (CMTIME_IS_NUMERIC(value->presentation_time)) {
            timestamp_us = CMTimeGetSeconds(value->presentation_time) * 1'000'000.0;
          }

          callback.Call({
            frame,
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

      CMSampleBufferRef sample = nullptr;
      OSStatus status = CreateSampleBuffer(
        format_description_,
        packet,
        &sample
      );
      if (status != noErr || !sample) {
        decode_status = status;
        break;
      }

      VTDecodeInfoFlags info_flags = 0;
      status = VTDecompressionSessionDecodeFrame(
        session_,
        sample,
        kVTDecodeFrame_EnableAsynchronousDecompression
        | kVTDecodeFrame_EnableTemporalProcessing,
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

    if (task->finish_delayed_frames) {
      const OSStatus finish_status =
        VTDecompressionSessionFinishDelayedFrames(session_);
      if (decode_status == noErr && finish_status != noErr) {
        decode_status = finish_status;
      }
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

    if (info.Length() > 2) {
      if (!info[2].IsBoolean()) {
        task->packets_ref.Reset();
        delete task;
        Napi::TypeError::New(
          env,
          "decodeStream finish flag must be a boolean when provided"
        ).ThrowAsJavaScriptException();
        return env.Undefined();
      }
      task->finish_delayed_frames = info[2].As<Napi::Boolean>().Value();
    }

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
      Napi::TypeError::New(env, "packet entries must be objects").ThrowAsJavaScriptException();
      return false;
    }

    Napi::Object object = value.As<Napi::Object>();
    Napi::Value data_value = object.Get("data");
    if (!data_value.IsBuffer()) {
      Napi::TypeError::New(env, "packet.data must be a Buffer").ThrowAsJavaScriptException();
      return false;
    }

    Napi::Value timestamp_value = object.Get("timestamp");
    if (!timestamp_value.IsNumber()) {
      Napi::TypeError::New(env, "packet.timestamp must be a number")
        .ThrowAsJavaScriptException();
      return false;
    }

    Napi::Value duration_value = object.Get("duration");
    if (!duration_value.IsUndefined() && !duration_value.IsNumber()) {
      Napi::TypeError::New(env, "packet.duration must be a number when provided")
        .ThrowAsJavaScriptException();
      return false;
    }

    Napi::Value key_value = object.Get("keyframe");
    if (!key_value.IsUndefined() && !key_value.IsBoolean()) {
      Napi::TypeError::New(env, "packet.keyframe must be a boolean when provided")
        .ThrowAsJavaScriptException();
      return false;
    }

    Napi::Buffer<uint8_t> buffer = data_value.As<Napi::Buffer<uint8_t>>();
    out.data = buffer.Data();
    out.size = buffer.Length();
    out.timestamp_us = timestamp_value.As<Napi::Number>().Int64Value();
    out.duration_us = duration_value.IsNumber()
      ? duration_value.As<Napi::Number>().Int64Value()
      : 0;
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
      CMSampleBufferRef sample = nullptr;
      OSStatus status = CreateSampleBuffer(
        format_description_,
        packet,
        &sample
      );
      if (status != noErr || !sample) {
        submit_status = status;
        break;
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
        kVTDecodeFrame_EnableAsynchronousDecompression
        | kVTDecodeFrame_EnableTemporalProcessing,
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
    const OSStatus finish_status =
      VTDecompressionSessionFinishDelayedFrames(session_);
    if (submit_status == noErr && finish_status != noErr) {
      submit_status = finish_status;
    }

    const OSStatus wait_status =
      VTDecompressionSessionWaitForAsynchronousFrames(session_);
    if (submit_status == noErr && wait_status != noErr) {
      submit_status = wait_status;
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
    result.Set("hardwareAccelerated", Napi::Boolean::New(env, IsHardwareAccelerated(session_)));
    return result;
  }

  Napi::Value Reset(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (active_stream_.load(std::memory_order_acquire) != nullptr) {
      Napi::Error::New(
        env,
        "Cannot reset VideoToolbox decoder while decodeStream is active"
      ).ThrowAsJavaScriptException();
      return env.Undefined();
    }
    if (!format_description_) {
      Napi::Error::New(env, "VideoToolbox decoder is disposed")
        .ThrowAsJavaScriptException();
      return env.Undefined();
    }

    if (session_) {
      VTDecompressionSessionWaitForAsynchronousFrames(session_);
      VTDecompressionSessionInvalidate(session_);
      CFRelease(session_);
      session_ = nullptr;
    }

    std::string error;
    if (!CreateHardwareDecodeSession(
      format_description_,
      this,
      &VideoToolboxVideoDecoder::OutputCallback,
      &session_,
      error
    )) {
      Napi::Error::New(env, error).ThrowAsJavaScriptException();
      return env.Undefined();
    }

    return env.Undefined();
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
    if (format_description_) {
      CFRelease(format_description_);
      format_description_ = nullptr;
    }
  }
};

Napi::FunctionReference VideoToolboxVideoDecoder::constructor;

void CapabilityOutputCallback(
  void*,
  void*,
  OSStatus,
  VTDecodeInfoFlags,
  CVImageBufferRef,
  CMTime,
  CMTime
) {}

Napi::Value IsVideoToolboxDecoderSupported(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (
    info.Length() < 2
    || !info[0].IsString()
    || !info[1].IsBuffer()
  ) {
    Napi::TypeError::New(
      env,
      "Expected codec string and decoder configuration Buffer"
    ).ThrowAsJavaScriptException();
    return env.Undefined();
  }

  const std::string codec = info[0].As<Napi::String>().Utf8Value();
  Napi::Buffer<uint8_t> description = info[1].As<Napi::Buffer<uint8_t>>();
  std::vector<uint8_t> config(
    description.Data(),
    description.Data() + description.Length()
  );

  CMVideoFormatDescriptionRef format_description = nullptr;
  std::string error;
  if (!CreateVideoFormatDescription(
    codec,
    config,
    &format_description,
    error
  )) {
    return Napi::Boolean::New(env, false);
  }

  VTDecompressionSessionRef session = nullptr;
  const bool supported = CreateHardwareDecodeSession(
    format_description,
    nullptr,
    &CapabilityOutputCallback,
    &session,
    error
  );

  if (session) {
    VTDecompressionSessionInvalidate(session);
    CFRelease(session);
  }
  CFRelease(format_description);

  return Napi::Boolean::New(env, supported);
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  VideoToolboxFrame::Init(env, exports);
  VideoToolboxVideoDecoder::Init(env, exports);
  exports.Set(
    "isVideoToolboxDecoderSupported",
    Napi::Function::New(env, IsVideoToolboxDecoderSupported)
  );
  return exports;
}

NODE_API_MODULE(gpuix_videotoolbox, InitAll)

}  // namespace
