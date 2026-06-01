#include "mf_encoder.h"

#include "audio_sample_utils.h"

#include <mfapi.h>
#include <mferror.h>
#include <propvarutil.h>

#include <algorithm>
#include <cstring>
#include <iostream>

namespace {

bool succeeded(HRESULT hr, const char* label) {
    if (SUCCEEDED(hr)) {
        return true;
    }

    std::cerr << "ERROR: " << label << " failed (hr=0x" << std::hex << hr << std::dec << ")"
              << std::endl;
    return false;
}

void setFrameSize(IMFMediaType* type, UINT32 width, UINT32 height) {
    MFSetAttributeSize(type, MF_MT_FRAME_SIZE, width, height);
}

void setFrameRate(IMFMediaType* type, UINT32 fps) {
    MFSetAttributeRatio(type, MF_MT_FRAME_RATE, fps, 1);
}

void setPixelAspectRatio(IMFMediaType* type) {
    MFSetAttributeRatio(type, MF_MT_PIXEL_ASPECT_RATIO, 1, 1);
}

void setAudioFormat(IMFMediaType* type, UINT32 channels, UINT32 sampleRate, UINT32 bitsPerSample) {
    type->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, channels);
    type->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, sampleRate);
    type->SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, bitsPerSample);
}

void compositeWebcam(BYTE* destination, int width, int height, const BgraFrameView& webcamFrame) {
    if (!webcamFrame.data || webcamFrame.width <= 0 || webcamFrame.height <= 0 || width <= 0 || height <= 0) {
        return;
    }

    const int margin = std::max(16, std::min(width, height) / 60);
    const int maxOverlayWidth = std::max(2, width / 4);
    int overlayWidth = maxOverlayWidth;
    int overlayHeight = static_cast<int>(
        (static_cast<int64_t>(overlayWidth) * webcamFrame.height) / std::max(1, webcamFrame.width));
    const int maxOverlayHeight = std::max(2, height / 3);
    if (overlayHeight > maxOverlayHeight) {
        overlayHeight = maxOverlayHeight;
        overlayWidth = static_cast<int>(
            (static_cast<int64_t>(overlayHeight) * webcamFrame.width) / std::max(1, webcamFrame.height));
    }

    overlayWidth = std::max(2, std::min(overlayWidth, width - margin * 2));
    overlayHeight = std::max(2, std::min(overlayHeight, height - margin * 2));
    const int originX = std::max(0, width - overlayWidth - margin);
    const int originY = std::max(0, height - overlayHeight - margin);

    for (int y = 0; y < overlayHeight; y += 1) {
        const int sourceY = static_cast<int>((static_cast<int64_t>(y) * webcamFrame.height) / overlayHeight);
        BYTE* destinationRow = destination + ((originY + y) * width + originX) * 4;
        for (int x = 0; x < overlayWidth; x += 1) {
            const int sourceX = static_cast<int>((static_cast<int64_t>(x) * webcamFrame.width) / overlayWidth);
            const BYTE* source = webcamFrame.data + (sourceY * webcamFrame.width + sourceX) * 4;
            BYTE* target = destinationRow + x * 4;
            target[0] = source[0];
            target[1] = source[1];
            target[2] = source[2];
            target[3] = 255;
        }
    }
}

} // namespace

MFEncoder::~MFEncoder() {
    finalize();
}

bool MFEncoder::initialize(
    const std::wstring& outputPath,
    int width,
    int height,
    int fps,
    int bitrate,
    ID3D11Device* device,
    ID3D11DeviceContext* context,
    const AudioInputFormat* audioFormat) {
    width_ = (std::max(2, width) / 2) * 2;
    height_ = (std::max(2, height) / 2) * 2;
    fps_ = std::max(1, fps);
    device_ = device;
    context_ = context;

    if (!succeeded(MFStartup(MF_VERSION), "MFStartup")) {
        return false;
    }

    Microsoft::WRL::ComPtr<IMFMediaType> outputType;
    if (!succeeded(MFCreateMediaType(&outputType), "MFCreateMediaType(output)")) {
        return false;
    }
    outputType->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Video);
    outputType->SetGUID(MF_MT_SUBTYPE, MFVideoFormat_H264);
    outputType->SetUINT32(MF_MT_AVG_BITRATE, static_cast<UINT32>(std::max(1, bitrate)));
    outputType->SetUINT32(MF_MT_INTERLACE_MODE, MFVideoInterlace_Progressive);
    setFrameSize(outputType.Get(), static_cast<UINT32>(width_), static_cast<UINT32>(height_));
    setFrameRate(outputType.Get(), static_cast<UINT32>(fps_));
    setPixelAspectRatio(outputType.Get());

    if (!succeeded(MFCreateSinkWriterFromURL(outputPath.c_str(), nullptr, nullptr, &sinkWriter_),
                   "MFCreateSinkWriterFromURL")) {
        return false;
    }
    if (!succeeded(sinkWriter_->AddStream(outputType.Get(), &videoStreamIndex_), "AddStream")) {
        return false;
    }

    if (audioFormat && !configureAudioStream(*audioFormat)) {
        return false;
    }

    Microsoft::WRL::ComPtr<IMFMediaType> inputType;
    if (!succeeded(MFCreateMediaType(&inputType), "MFCreateMediaType(input)")) {
        return false;
    }
    inputType->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Video);
    inputType->SetGUID(MF_MT_SUBTYPE, MFVideoFormat_RGB32);
    inputType->SetUINT32(MF_MT_INTERLACE_MODE, MFVideoInterlace_Progressive);
    inputType->SetUINT32(MF_MT_DEFAULT_STRIDE, static_cast<UINT32>(width_ * 4));
    setFrameSize(inputType.Get(), static_cast<UINT32>(width_), static_cast<UINT32>(height_));
    setFrameRate(inputType.Get(), static_cast<UINT32>(fps_));
    setPixelAspectRatio(inputType.Get());

    if (!succeeded(sinkWriter_->SetInputMediaType(videoStreamIndex_, inputType.Get(), nullptr),
                   "SetInputMediaType")) {
        return false;
    }
    if (!succeeded(sinkWriter_->BeginWriting(), "BeginWriting")) {
        return false;
    }

    return true;
}

bool MFEncoder::configureAudioStream(const AudioInputFormat& audioFormat) {
    if (!sinkWriter_) {
        return false;
    }
    if (audioFormat.sampleRate == 0 || audioFormat.channels == 0 || audioFormat.blockAlign == 0) {
        std::cerr << "ERROR: Invalid audio input format" << std::endl;
        return false;
    }

    const AudioInputFormat encoderFormat = makeAacCompatibleAudioFormat(audioFormat);
    const UINT32 aacBytesPerSecond = 24'000;

    Microsoft::WRL::ComPtr<IMFMediaType> outputType;
    if (!succeeded(MFCreateMediaType(&outputType), "MFCreateMediaType(audio output)")) {
        return false;
    }
    outputType->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Audio);
    outputType->SetGUID(MF_MT_SUBTYPE, MFAudioFormat_AAC);
    setAudioFormat(outputType.Get(), encoderFormat.channels, encoderFormat.sampleRate, 16);
    outputType->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, aacBytesPerSecond);
    outputType->SetUINT32(MF_MT_AAC_PAYLOAD_TYPE, 0);

    if (!succeeded(sinkWriter_->AddStream(outputType.Get(), &audioStreamIndex_), "AddStream(audio)")) {
        return false;
    }

    Microsoft::WRL::ComPtr<IMFMediaType> inputType;
    if (!succeeded(MFCreateMediaType(&inputType), "MFCreateMediaType(audio input)")) {
        return false;
    }
    inputType->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Audio);
    inputType->SetGUID(MF_MT_SUBTYPE, encoderFormat.subtype);
    setAudioFormat(inputType.Get(), encoderFormat.channels, encoderFormat.sampleRate, encoderFormat.bitsPerSample);
    inputType->SetUINT32(MF_MT_AUDIO_BLOCK_ALIGNMENT, encoderFormat.blockAlign);
    inputType->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, encoderFormat.avgBytesPerSec);
    inputType->SetUINT32(MF_MT_ALL_SAMPLES_INDEPENDENT, TRUE);

    if (!succeeded(sinkWriter_->SetInputMediaType(audioStreamIndex_, inputType.Get(), nullptr),
                   "SetInputMediaType(audio)")) {
        return false;
    }

    hasAudioStream_ = true;
    return true;
}

bool MFEncoder::ensureStagingTexture(ID3D11Texture2D* texture) {
    if (stagingTexture_) {
        return true;
    }

    D3D11_TEXTURE2D_DESC desc{};
    texture->GetDesc(&desc);
    desc.Width = static_cast<UINT>(width_);
    desc.Height = static_cast<UINT>(height_);
    desc.MipLevels = 1;
    desc.ArraySize = 1;
    desc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
    desc.SampleDesc.Count = 1;
    desc.SampleDesc.Quality = 0;
    desc.Usage = D3D11_USAGE_STAGING;
    desc.BindFlags = 0;
    desc.CPUAccessFlags = D3D11_CPU_ACCESS_READ;
    desc.MiscFlags = 0;

    return succeeded(device_->CreateTexture2D(&desc, nullptr, &stagingTexture_),
                     "CreateTexture2D(staging)");
}

bool MFEncoder::copyFrameToBuffer(
    ID3D11Texture2D* texture,
    BYTE* destination,
    DWORD destinationSize,
    const BgraFrameView* webcamFrame) {
    if (!ensureStagingTexture(texture)) {
        return false;
    }

    context_->CopyResource(stagingTexture_.Get(), texture);

    D3D11_MAPPED_SUBRESOURCE mapped{};
    if (!succeeded(context_->Map(stagingTexture_.Get(), 0, D3D11_MAP_READ, 0, &mapped), "Map")) {
        return false;
    }

    const DWORD rowBytes = static_cast<DWORD>(width_ * 4);
    const DWORD requiredBytes = rowBytes * static_cast<DWORD>(height_);
    if (destinationSize < requiredBytes) {
        context_->Unmap(stagingTexture_.Get(), 0);
        std::cerr << "ERROR: Media Foundation buffer is too small" << std::endl;
        return false;
    }

    auto* source = static_cast<const BYTE*>(mapped.pData);
    for (int y = 0; y < height_; y += 1) {
        std::memcpy(destination + rowBytes * y, source + mapped.RowPitch * y, rowBytes);
    }
    if (webcamFrame) {
        compositeWebcam(destination, width_, height_, *webcamFrame);
    }

    context_->Unmap(stagingTexture_.Get(), 0);
    return true;
}

bool MFEncoder::copyBgraFrameToBuffer(const BgraFrameView& frame, BYTE* destination, DWORD destinationSize) {
    if (!frame.data || frame.width <= 0 || frame.height <= 0) {
        return false;
    }

    const DWORD rowBytes = static_cast<DWORD>(width_ * 4);
    const DWORD requiredBytes = rowBytes * static_cast<DWORD>(height_);
    if (destinationSize < requiredBytes) {
        std::cerr << "ERROR: Media Foundation webcam buffer is too small" << std::endl;
        return false;
    }

    if (frame.width == width_ && frame.height == height_) {
        for (DWORD i = 0; i < requiredBytes; i += 4) {
            destination[i] = frame.data[i];
            destination[i + 1] = frame.data[i + 1];
            destination[i + 2] = frame.data[i + 2];
            destination[i + 3] = 255;
        }
        return true;
    }

    for (int y = 0; y < height_; y += 1) {
        const int sourceY = static_cast<int>((static_cast<int64_t>(y) * frame.height) / height_);
        BYTE* destinationRow = destination + rowBytes * y;
        for (int x = 0; x < width_; x += 1) {
            const int sourceX = static_cast<int>((static_cast<int64_t>(x) * frame.width) / width_);
            const BYTE* source = frame.data + (sourceY * frame.width + sourceX) * 4;
            BYTE* target = destinationRow + x * 4;
            target[0] = source[0];
            target[1] = source[1];
            target[2] = source[2];
            target[3] = 255;
        }
    }

    return true;
}

bool MFEncoder::writeFrame(ID3D11Texture2D* texture, int64_t timestampHns, const BgraFrameView* webcamFrame) {
    std::scoped_lock writerLock(writerMutex_);
    if (!sinkWriter_ || finalized_) {
        return false;
    }

    if (firstTimestampHns_ < 0) {
        firstTimestampHns_ = timestampHns;
    }

    int64_t sampleTime = timestampHns - firstTimestampHns_;
    if (sampleTime <= lastTimestampHns_) {
        sampleTime = lastTimestampHns_ + (10'000'000LL / fps_);
    }
    const int64_t sampleDuration = 10'000'000LL / fps_;
    lastTimestampHns_ = sampleTime;

    Microsoft::WRL::ComPtr<IMFMediaBuffer> buffer;
    const DWORD frameBytes = static_cast<DWORD>(width_ * height_ * 4);
    if (!succeeded(MFCreateMemoryBuffer(frameBytes, &buffer), "MFCreateMemoryBuffer")) {
        return false;
    }

    BYTE* data = nullptr;
    DWORD maxLength = 0;
    DWORD currentLength = 0;
    if (!succeeded(buffer->Lock(&data, &maxLength, &currentLength), "IMFMediaBuffer::Lock")) {
        return false;
    }

    const bool copied = copyFrameToBuffer(texture, data, maxLength, webcamFrame);
    buffer->Unlock();
    if (!copied) {
        return false;
    }
    buffer->SetCurrentLength(frameBytes);

    Microsoft::WRL::ComPtr<IMFSample> sample;
    if (!succeeded(MFCreateSample(&sample), "MFCreateSample")) {
        return false;
    }
    sample->AddBuffer(buffer.Get());
    sample->SetSampleTime(sampleTime);
    sample->SetSampleDuration(sampleDuration);

    return succeeded(sinkWriter_->WriteSample(videoStreamIndex_, sample.Get()), "WriteSample");
}

bool MFEncoder::writeBgraFrame(const BgraFrameView& frame, int64_t timestampHns) {
    std::scoped_lock writerLock(writerMutex_);
    if (!sinkWriter_ || finalized_) {
        return false;
    }

    if (firstTimestampHns_ < 0) {
        firstTimestampHns_ = timestampHns;
    }

    int64_t sampleTime = timestampHns - firstTimestampHns_;
    if (sampleTime <= lastTimestampHns_) {
        sampleTime = lastTimestampHns_ + (10'000'000LL / fps_);
    }
    const int64_t sampleDuration = 10'000'000LL / fps_;
    lastTimestampHns_ = sampleTime;

    Microsoft::WRL::ComPtr<IMFMediaBuffer> buffer;
    const DWORD frameBytes = static_cast<DWORD>(width_ * height_ * 4);
    if (!succeeded(MFCreateMemoryBuffer(frameBytes, &buffer), "MFCreateMemoryBuffer(webcam)")) {
        return false;
    }

    BYTE* data = nullptr;
    DWORD maxLength = 0;
    DWORD currentLength = 0;
    if (!succeeded(buffer->Lock(&data, &maxLength, &currentLength), "IMFMediaBuffer::Lock(webcam)")) {
        return false;
    }

    const bool copied = copyBgraFrameToBuffer(frame, data, maxLength);
    buffer->Unlock();
    if (!copied) {
        return false;
    }
    buffer->SetCurrentLength(frameBytes);

    Microsoft::WRL::ComPtr<IMFSample> sample;
    if (!succeeded(MFCreateSample(&sample), "MFCreateSample(webcam)")) {
        return false;
    }
    sample->AddBuffer(buffer.Get());
    sample->SetSampleTime(sampleTime);
    sample->SetSampleDuration(sampleDuration);

    return succeeded(sinkWriter_->WriteSample(videoStreamIndex_, sample.Get()), "WriteSample(webcam)");
}

bool MFEncoder::writeAudio(const BYTE* data, DWORD byteCount, int64_t timestampHns, int64_t durationHns) {
    std::scoped_lock writerLock(writerMutex_);
    if (!sinkWriter_ || finalized_ || !hasAudioStream_) {
        return false;
    }
    if (!data || byteCount == 0 || durationHns <= 0) {
        return true;
    }

    Microsoft::WRL::ComPtr<IMFMediaBuffer> buffer;
    if (!succeeded(MFCreateMemoryBuffer(byteCount, &buffer), "MFCreateMemoryBuffer(audio)")) {
        return false;
    }

    BYTE* destination = nullptr;
    DWORD maxLength = 0;
    DWORD currentLength = 0;
    if (!succeeded(buffer->Lock(&destination, &maxLength, &currentLength),
                   "IMFMediaBuffer::Lock(audio)")) {
        return false;
    }
    if (maxLength < byteCount) {
        buffer->Unlock();
        std::cerr << "ERROR: Media Foundation audio buffer is too small" << std::endl;
        return false;
    }
    std::memcpy(destination, data, byteCount);
    buffer->Unlock();
    buffer->SetCurrentLength(byteCount);

    Microsoft::WRL::ComPtr<IMFSample> sample;
    if (!succeeded(MFCreateSample(&sample), "MFCreateSample(audio)")) {
        return false;
    }
    sample->AddBuffer(buffer.Get());
    sample->SetSampleTime(std::max<int64_t>(0, timestampHns));
    sample->SetSampleDuration(durationHns);

    return succeeded(sinkWriter_->WriteSample(audioStreamIndex_, sample.Get()), "WriteSample(audio)");
}

bool MFEncoder::finalize() {
    std::scoped_lock writerLock(writerMutex_);
    if (finalized_) {
        return true;
    }

    finalized_ = true;
    bool ok = true;
    if (sinkWriter_) {
        ok = succeeded(sinkWriter_->Finalize(), "SinkWriter::Finalize");
        sinkWriter_.Reset();
    }
    stagingTexture_.Reset();
    context_.Reset();
    device_.Reset();
    MFShutdown();
    return ok;
}
