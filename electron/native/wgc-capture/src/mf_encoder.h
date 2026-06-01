#pragma once

#include <Windows.h>
#include <d3d11.h>
#include <mfapi.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <wrl/client.h>

#include <cstdint>
#include <mutex>
#include <string>

struct BgraFrameView {
    const BYTE* data = nullptr;
    int width = 0;
    int height = 0;
};

struct AudioInputFormat {
    GUID subtype = MFAudioFormat_PCM;
    UINT32 sampleRate = 0;
    UINT32 channels = 0;
    UINT32 bitsPerSample = 0;
    UINT32 blockAlign = 0;
    UINT32 avgBytesPerSec = 0;
};

class MFEncoder {
public:
    MFEncoder() = default;
    ~MFEncoder();

    MFEncoder(const MFEncoder&) = delete;
    MFEncoder& operator=(const MFEncoder&) = delete;

    bool initialize(
        const std::wstring& outputPath,
        int width,
        int height,
        int fps,
        int bitrate,
        ID3D11Device* device,
        ID3D11DeviceContext* context,
        const AudioInputFormat* audioFormat = nullptr);
    bool writeFrame(ID3D11Texture2D* texture, int64_t timestampHns, const BgraFrameView* webcamFrame = nullptr);
    bool writeBgraFrame(const BgraFrameView& frame, int64_t timestampHns);
    bool writeAudio(const BYTE* data, DWORD byteCount, int64_t timestampHns, int64_t durationHns);
    bool finalize();

private:
    bool ensureStagingTexture(ID3D11Texture2D* texture);
    bool copyFrameToBuffer(
        ID3D11Texture2D* texture,
        BYTE* destination,
        DWORD destinationSize,
        const BgraFrameView* webcamFrame);
    bool copyBgraFrameToBuffer(const BgraFrameView& frame, BYTE* destination, DWORD destinationSize);
    bool configureAudioStream(const AudioInputFormat& audioFormat);

    Microsoft::WRL::ComPtr<IMFSinkWriter> sinkWriter_;
    Microsoft::WRL::ComPtr<ID3D11Device> device_;
    Microsoft::WRL::ComPtr<ID3D11DeviceContext> context_;
    Microsoft::WRL::ComPtr<ID3D11Texture2D> stagingTexture_;
    std::mutex writerMutex_;
    DWORD videoStreamIndex_ = 0;
    DWORD audioStreamIndex_ = 0;
    bool hasAudioStream_ = false;
    int width_ = 0;
    int height_ = 0;
    int fps_ = 60;
    int64_t firstTimestampHns_ = -1;
    int64_t lastTimestampHns_ = -1;
    bool finalized_ = false;
};
