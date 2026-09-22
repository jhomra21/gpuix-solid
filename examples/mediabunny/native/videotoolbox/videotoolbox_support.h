#pragma once

#include <CoreMedia/CoreMedia.h>
#include <VideoToolbox/VideoToolbox.h>

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace gpuix::media {

struct PacketInput {
  uint8_t* data;
  size_t size;
  int64_t timestamp_us;
  int64_t duration_us;
  bool keyframe;
};

bool CreateVideoFormatDescription(
  const std::string& codec,
  const std::vector<uint8_t>& config,
  CMVideoFormatDescriptionRef* output,
  std::string& error
);

bool CreateHardwareDecodeSession(
  CMVideoFormatDescriptionRef format_description,
  void* output_refcon,
  VTDecompressionOutputCallback output_callback,
  VTDecompressionSessionRef* output,
  std::string& error
);

bool IsHardwareAccelerated(VTDecompressionSessionRef session);

OSStatus CreateSampleBuffer(
  CMVideoFormatDescriptionRef format_description,
  const PacketInput& packet,
  CMSampleBufferRef* output
);

}  // namespace gpuix::media
