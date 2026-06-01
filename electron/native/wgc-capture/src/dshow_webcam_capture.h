#pragma once

#include <Windows.h>

#include <atomic>
#include <cstdint>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

struct WebcamFrameSnapshot {
    std::vector<BYTE> data;
    int width = 0;
    int height = 0;
    uint64_t sequence = 0;
};

class DirectShowWebcamCapture {
public:
    DirectShowWebcamCapture() = default;
    ~DirectShowWebcamCapture();

    DirectShowWebcamCapture(const DirectShowWebcamCapture&) = delete;
    DirectShowWebcamCapture& operator=(const DirectShowWebcamCapture&) = delete;

    bool initialize(
        const std::wstring& deviceId,
        const std::wstring& deviceName,
        const std::wstring& directShowClsid,
        int requestedWidth,
        int requestedHeight,
        int requestedFps);
    bool start();
    void stop();
    bool copyLatestFrame(WebcamFrameSnapshot& destination);

    int width() const;
    int height() const;
    int fps() const;
    const std::wstring& selectedDeviceName() const;
    void storeFrame(const BYTE* buffer, long length);

private:
    enum class PixelFormat {
        Bgra,
        Nv12,
        Yuy2,
    };

    struct Impl;
    void captureLoop();

    Impl* impl_ = nullptr;
    std::thread thread_;
    std::atomic<bool> stopRequested_ = false;
    std::mutex frameMutex_;
    std::vector<BYTE> latestFrame_;
    uint64_t latestFrameSequence_ = 0;
    int width_ = 0;
    int height_ = 0;
    int fps_ = 30;
    int sourceStride_ = 0;
    bool sourceTopDown_ = false;
    PixelFormat pixelFormat_ = PixelFormat::Bgra;
    std::wstring selectedDeviceName_;
};
