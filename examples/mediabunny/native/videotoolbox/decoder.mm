#include <napi.h>

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

struct PacketInput {
  uint8_t* data;
  size_t size;
  int64_t timestamp_us;
  int64_t duration_us;
  bool keyframe;
};

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
    if (!CreateFormatDescription(error)) {
      Napi::Error::New(env, error).ThrowAsJavaScriptException();
      return;
    }
    if (!CreateSession(error)) {
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

  static uint16_t ReadBE16(const uint8_t* data) {
    return static_cast<uint16_t>((static_cast<uint16_t>(data[0]) << 8) | data[1]);
  }

  bool CreateFormatDescription(std::string& error) {
    if (config_.size() < 7 || config_[0] != 1) {
      error = "Invalid AVCDecoderConfigurationRecord";
      return false;
    }

    const size_t nal_length_size = static_cast<size_t>((config_[4] & 0x03) + 1);
    size_t offset = 5;
    const uint8_t sps_count = config_[offset++] & 0x1f;

    std::vector<const uint8_t*> parameter_sets;
    std::vector<size_t> parameter_sizes;

    auto append_set = [&](const char* label) -> bool {
      if (offset + 2 > config_.size()) {
        error = std::string("Truncated AVC ") + label + " length";
        return false;
      }
      const size_t size = ReadBE16(config_.data() + offset);
      offset += 2;
      if (size == 0 || offset + size > config_.size()) {
        error = std::string("Invalid AVC ") + label + " payload";
        return false;
      }
      parameter_sets.push_back(config_.data() + offset);
      parameter_sizes.push_back(size);
      offset += size;
      return true;
    };

    for (uint8_t index = 0; index < sps_count; ++index) {
      if (!append_set("SPS")) return false;
    }

    if (offset >= config_.size()) {
      error = "AVC configuration has no PPS count";
      return false;
    }
    const uint8_t pps_count = config_[offset++];
    for (uint8_t index = 0; index < pps_count; ++index) {
      if (!append_set("PPS")) return false;
    }

    if (parameter_sets.empty() || sps_count == 0 || pps_count == 0) {
      error = "AVC configuration must contain SPS and PPS";
      return false;
    }

    OSStatus status = CMVideoFormatDescriptionCreateFromH264ParameterSets(
      kCFAllocatorDefault,
      parameter_sets.size(),
      parameter_sets.data(),
      parameter_sizes.data(),
      static_cast<int>(nal_length_size),
      &format_description_
    );

    if (status != noErr || !format_description_) {
      error = "CMVideoFormatDescriptionCreateFromH264ParameterSets failed: " + std::to_string(status);
      return false;
    }

    return true;
  }

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

  bool CreateSession(std::string& error) {
    CFMutableDictionaryRef decoder_spec = CFDictionaryCreateMutable(
      kCFAllocatorDefault,
      2,
      &kCFTypeDictionaryKeyCallBacks,
      &kCFTypeDictionaryValueCallBacks
    );
    CFDictionarySetValue(
      decoder_spec,
      kVTVideoDecoderSpecification_EnableHardwareAcceleratedVideoDecoder,
      kCFBooleanTrue
    );
    CFDictionarySetValue(
      decoder_spec,
      kVTVideoDecoderSpecification_RequireHardwareAcceleratedVideoDecoder,
      kCFBooleanTrue
    );

    CFMutableDictionaryRef attributes = CFDictionaryCreateMutable(
      kCFAllocatorDefault,
      3,
      &kCFTypeDictionaryKeyCallBacks,
      &kCFTypeDictionaryValueCallBacks
    );
    CFDictionarySetValue(attributes, kCVPixelBufferMetalCompatibilityKey, kCFBooleanTrue);

    CFDictionaryRef iosurface_properties = CFDictionaryCreate(
      kCFAllocatorDefault,
      nullptr,
      nullptr,
      0,
      &kCFTypeDictionaryKeyCallBacks,
      &kCFTypeDictionaryValueCallBacks
    );
    CFDictionarySetValue(
      attributes,
      kCVPixelBufferIOSurfacePropertiesKey,
      iosurface_properties
    );
    CFRelease(iosurface_properties);

    VTDecompressionOutputCallbackRecord callback = {
      &VideoToolboxH264Decoder::OutputCallback,
      this,
    };

    const OSStatus status = VTDecompressionSessionCreate(
      kCFAllocatorDefault,
      format_description_,
      decoder_spec,
      attributes,
      &callback,
      &session_
    );

    CFRelease(attributes);
    CFRelease(decoder_spec);

    if (status != noErr || !session_) {
      error = "VTDecompressionSessionCreate failed: " + std::to_string(status);
      return false;
    }

    if (!IsHardwareAccelerated()) {
      error = "VideoToolbox created a non-hardware decoder despite RequireHardwareAcceleratedVideoDecoder";
      return false;
    }

    return true;
  }

  bool IsHardwareAccelerated() const {
    if (!session_) return false;

    CFTypeRef value = nullptr;
    const OSStatus status = VTSessionCopyProperty(
      session_,
      kVTDecompressionPropertyKey_UsingHardwareAcceleratedVideoDecoder,
      kCFAllocatorDefault,
      &value
    );
    if (status != noErr || !value) return false;

    const bool result =
      CFGetTypeID(value) == CFBooleanGetTypeID()
      && CFBooleanGetValue(static_cast<CFBooleanRef>(value));
    CFRelease(value);
    return result;
  }

  Napi::Value HardwareAccelerated(const Napi::CallbackInfo& info) {
    return Napi::Boolean::New(info.Env(), IsHardwareAccelerated());
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
    result.Set("hardwareAccelerated", Napi::Boolean::New(env, IsHardwareAccelerated()));
    return result;
  }

  Napi::Value ReleaseFrames(const Napi::CallbackInfo& info) {
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
