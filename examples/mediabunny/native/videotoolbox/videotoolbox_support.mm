#include "videotoolbox_support.h"

#include <CoreFoundation/CoreFoundation.h>
#include <CoreVideo/CoreVideo.h>

namespace gpuix::media {
namespace {

uint16_t ReadBE16(const uint8_t* data) {
  return static_cast<uint16_t>((static_cast<uint16_t>(data[0]) << 8) | data[1]);
}

}  // namespace

bool CreateH264FormatDescription(
  const std::vector<uint8_t>& config,
  CMVideoFormatDescriptionRef* output,
  std::string& error
) {
  if (!output) {
    error = "Missing output format description";
    return false;
  }
  *output = nullptr;

  if (config.size() < 7 || config[0] != 1) {
    error = "Invalid AVCDecoderConfigurationRecord";
    return false;
  }

  const size_t nal_length_size = static_cast<size_t>((config[4] & 0x03) + 1);
  size_t offset = 5;
  const uint8_t sps_count = config[offset++] & 0x1f;

  std::vector<const uint8_t*> parameter_sets;
  std::vector<size_t> parameter_sizes;

  auto append_set = [&](const char* label) -> bool {
    if (offset + 2 > config.size()) {
      error = std::string("Truncated AVC ") + label + " length";
      return false;
    }

    const size_t size = ReadBE16(config.data() + offset);
    offset += 2;
    if (size == 0 || offset + size > config.size()) {
      error = std::string("Invalid AVC ") + label + " payload";
      return false;
    }

    parameter_sets.push_back(config.data() + offset);
    parameter_sizes.push_back(size);
    offset += size;
    return true;
  };

  for (uint8_t index = 0; index < sps_count; ++index) {
    if (!append_set("SPS")) return false;
  }

  if (offset >= config.size()) {
    error = "AVC configuration has no PPS count";
    return false;
  }

  const uint8_t pps_count = config[offset++];
  for (uint8_t index = 0; index < pps_count; ++index) {
    if (!append_set("PPS")) return false;
  }

  if (parameter_sets.empty() || sps_count == 0 || pps_count == 0) {
    error = "AVC configuration must contain SPS and PPS";
    return false;
  }

  const OSStatus status = CMVideoFormatDescriptionCreateFromH264ParameterSets(
    kCFAllocatorDefault,
    parameter_sets.size(),
    parameter_sets.data(),
    parameter_sizes.data(),
    static_cast<int>(nal_length_size),
    output
  );

  if (status != noErr || !*output) {
    error =
      "CMVideoFormatDescriptionCreateFromH264ParameterSets failed: "
      + std::to_string(status);
    *output = nullptr;
    return false;
  }

  return true;
}

bool IsHardwareAccelerated(VTDecompressionSessionRef session) {
  if (!session) return false;

  CFTypeRef value = nullptr;
  const OSStatus status = VTSessionCopyProperty(
    session,
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

bool CreateHardwareDecodeSession(
  CMVideoFormatDescriptionRef format_description,
  void* output_refcon,
  VTDecompressionOutputCallback output_callback,
  VTDecompressionSessionRef* output,
  std::string& error
) {
  if (!format_description || !output_callback || !output) {
    error = "Missing VideoToolbox session input";
    return false;
  }
  *output = nullptr;

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
  CFDictionarySetValue(
    attributes,
    kCVPixelBufferMetalCompatibilityKey,
    kCFBooleanTrue
  );

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
    output_callback,
    output_refcon,
  };

  const OSStatus status = VTDecompressionSessionCreate(
    kCFAllocatorDefault,
    format_description,
    decoder_spec,
    attributes,
    &callback,
    output
  );

  CFRelease(attributes);
  CFRelease(decoder_spec);

  if (status != noErr || !*output) {
    error = "VTDecompressionSessionCreate failed: " + std::to_string(status);
    *output = nullptr;
    return false;
  }

  if (!IsHardwareAccelerated(*output)) {
    error =
      "VideoToolbox created a non-hardware decoder despite "
      "RequireHardwareAcceleratedVideoDecoder";
    VTDecompressionSessionInvalidate(*output);
    CFRelease(*output);
    *output = nullptr;
    return false;
  }

  return true;
}

OSStatus CreateSampleBuffer(
  CMVideoFormatDescriptionRef format_description,
  const PacketInput& packet,
  CMSampleBufferRef* output
) {
  if (!format_description || !output) return paramErr;
  *output = nullptr;

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
  if (status != noErr || !block) return status;

  CMSampleTimingInfo timing{
    packet.duration_us > 0
      ? CMTimeMake(packet.duration_us, 1'000'000)
      : kCMTimeInvalid,
    CMTimeMake(packet.timestamp_us, 1'000'000),
    kCMTimeInvalid,
  };
  const size_t sample_size = packet.size;

  status = CMSampleBufferCreateReady(
    kCFAllocatorDefault,
    block,
    format_description,
    1,
    1,
    &timing,
    1,
    &sample_size,
    output
  );
  CFRelease(block);

  if (status != noErr || !*output) return status;

  CFArrayRef attachments = CMSampleBufferGetSampleAttachmentsArray(*output, true);
  if (attachments && CFArrayGetCount(attachments) > 0 && !packet.keyframe) {
    auto attachment = static_cast<CFMutableDictionaryRef>(
      const_cast<void*>(CFArrayGetValueAtIndex(attachments, 0))
    );
    CFDictionarySetValue(
      attachment,
      kCMSampleAttachmentKey_NotSync,
      kCFBooleanTrue
    );
  }

  return noErr;
}

}  // namespace gpuix::media
