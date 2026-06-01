#include "audio_sample_utils.h"

#include <mfapi.h>

#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstring>
#include <limits>

namespace {

bool isFloatFormat(const AudioInputFormat& format) {
    return format.subtype == MFAudioFormat_Float && format.bitsPerSample == 32;
}

bool isPcmFormat(const AudioInputFormat& format, UINT32 bitsPerSample) {
    return format.subtype == MFAudioFormat_PCM && format.bitsPerSample == bitsPerSample;
}

template <typename T>
T clampTo(double value) {
    const double minValue = static_cast<double>(std::numeric_limits<T>::min());
    const double maxValue = static_cast<double>(std::numeric_limits<T>::max());
    return static_cast<T>(std::clamp(std::round(value), minValue, maxValue));
}

size_t bytesPerSample(const AudioInputFormat& format) {
    return format.bitsPerSample / 8;
}

double readSampleAsDouble(const BYTE* source, const AudioInputFormat& format, size_t frameIndex, UINT32 channelIndex) {
    if (!source || format.blockAlign == 0 || channelIndex >= format.channels) {
        return 0.0;
    }

    const size_t offset = frameIndex * format.blockAlign + channelIndex * bytesPerSample(format);
    if (isFloatFormat(format)) {
        return static_cast<double>(*reinterpret_cast<const float*>(source + offset));
    }
    if (isPcmFormat(format, 16)) {
        return static_cast<double>(*reinterpret_cast<const int16_t*>(source + offset)) / 32768.0;
    }
    if (isPcmFormat(format, 32)) {
        return static_cast<double>(*reinterpret_cast<const int32_t*>(source + offset)) / 2147483648.0;
    }
    return 0.0;
}

void writeSampleFromDouble(BYTE* destination, const AudioInputFormat& format, size_t frameIndex, UINT32 channelIndex, double value) {
    if (!destination || format.blockAlign == 0 || channelIndex >= format.channels) {
        return;
    }

    const double clamped = std::clamp(value, -1.0, 1.0);
    const size_t offset = frameIndex * format.blockAlign + channelIndex * bytesPerSample(format);
    if (isFloatFormat(format)) {
        *reinterpret_cast<float*>(destination + offset) = static_cast<float>(clamped);
        return;
    }
    if (isPcmFormat(format, 16)) {
        *reinterpret_cast<int16_t*>(destination + offset) = clampTo<int16_t>(clamped * 32767.0);
        return;
    }
    if (isPcmFormat(format, 32)) {
        *reinterpret_cast<int32_t*>(destination + offset) = clampTo<int32_t>(clamped * 2147483647.0);
    }
}

double readMappedChannel(const BYTE* source, const AudioInputFormat& format, size_t frameIndex, UINT32 targetChannel, UINT32 targetChannels) {
    if (format.channels == 0) {
        return 0.0;
    }
    if (format.channels == targetChannels && targetChannel < format.channels) {
        return readSampleAsDouble(source, format, frameIndex, targetChannel);
    }
    if (format.channels == 1) {
        return readSampleAsDouble(source, format, frameIndex, 0);
    }
    if (targetChannels == 1) {
        double sum = 0.0;
        for (UINT32 channel = 0; channel < format.channels; ++channel) {
            sum += readSampleAsDouble(source, format, frameIndex, channel);
        }
        return sum / static_cast<double>(format.channels);
    }
    return readSampleAsDouble(source, format, frameIndex, std::min(targetChannel, format.channels - 1));
}

} // namespace

constexpr int64_t HnsPerSecond = 10'000'000;

bool sameAudioFormatForMixing(const AudioInputFormat& left, const AudioInputFormat& right) {
    return left.subtype == right.subtype &&
           left.sampleRate == right.sampleRate &&
           left.channels == right.channels &&
           left.bitsPerSample == right.bitsPerSample &&
           left.blockAlign == right.blockAlign &&
           left.avgBytesPerSec == right.avgBytesPerSec;
}

AudioInputFormat makeAacCompatibleAudioFormat(const AudioInputFormat& source) {
    AudioInputFormat format{};
    format.subtype = MFAudioFormat_PCM;
    format.sampleRate = source.sampleRate > 0 ? source.sampleRate : 48000;
    format.channels = 2;
    format.bitsPerSample = 16;
    format.blockAlign = format.channels * (format.bitsPerSample / 8);
    format.avgBytesPerSec = format.sampleRate * format.blockAlign;
    return format;
}

void copyAudioWithGain(
    const BYTE* source,
    DWORD byteCount,
    const AudioInputFormat& format,
    double gain,
    std::vector<BYTE>& destination) {
    destination.resize(byteCount);
    if (!source || byteCount == 0) {
        std::fill(destination.begin(), destination.end(), static_cast<BYTE>(0));
        return;
    }

    if (std::abs(gain - 1.0) < 0.0001) {
        std::memcpy(destination.data(), source, byteCount);
        return;
    }

    if (isFloatFormat(format)) {
        const auto* input = reinterpret_cast<const float*>(source);
        auto* output = reinterpret_cast<float*>(destination.data());
        const size_t sampleCount = byteCount / sizeof(float);
        for (size_t index = 0; index < sampleCount; index += 1) {
            output[index] = static_cast<float>(std::clamp(input[index] * gain, -1.0, 1.0));
        }
        return;
    }

    if (isPcmFormat(format, 16)) {
        const auto* input = reinterpret_cast<const int16_t*>(source);
        auto* output = reinterpret_cast<int16_t*>(destination.data());
        const size_t sampleCount = byteCount / sizeof(int16_t);
        for (size_t index = 0; index < sampleCount; index += 1) {
            output[index] = clampTo<int16_t>(static_cast<double>(input[index]) * gain);
        }
        return;
    }

    if (isPcmFormat(format, 32)) {
        const auto* input = reinterpret_cast<const int32_t*>(source);
        auto* output = reinterpret_cast<int32_t*>(destination.data());
        const size_t sampleCount = byteCount / sizeof(int32_t);
        for (size_t index = 0; index < sampleCount; index += 1) {
            output[index] = clampTo<int32_t>(static_cast<double>(input[index]) * gain);
        }
        return;
    }

    std::memcpy(destination.data(), source, byteCount);
}

void convertAudioWithGain(
    const BYTE* source,
    DWORD byteCount,
    const AudioInputFormat& sourceFormat,
    const AudioInputFormat& targetFormat,
    double gain,
    std::vector<BYTE>& destination) {
    if (!source || byteCount == 0 || sourceFormat.blockAlign == 0 || targetFormat.blockAlign == 0 ||
        sourceFormat.sampleRate == 0 || targetFormat.sampleRate == 0 || sourceFormat.channels == 0 ||
        targetFormat.channels == 0) {
        destination.clear();
        return;
    }

    if (sameAudioFormatForMixing(sourceFormat, targetFormat)) {
        copyAudioWithGain(source, byteCount, targetFormat, gain, destination);
        return;
    }

    const size_t sourceFrames = byteCount / sourceFormat.blockAlign;
    if (sourceFrames == 0) {
        destination.clear();
        return;
    }

    const double rateRatio = static_cast<double>(targetFormat.sampleRate) /
        static_cast<double>(sourceFormat.sampleRate);
    const size_t targetFrames = std::max<size_t>(1, static_cast<size_t>(std::llround(sourceFrames * rateRatio)));
    destination.assign(targetFrames * targetFormat.blockAlign, 0);

    for (size_t targetFrame = 0; targetFrame < targetFrames; ++targetFrame) {
        const double sourcePosition = static_cast<double>(targetFrame) / rateRatio;
        const size_t sourceFrame = std::min(
            sourceFrames - 1,
            static_cast<size_t>(std::llround(sourcePosition)));
        for (UINT32 channel = 0; channel < targetFormat.channels; ++channel) {
            const double sample = readMappedChannel(
                source,
                sourceFormat,
                sourceFrame,
                channel,
                targetFormat.channels);
            writeSampleFromDouble(destination.data(), targetFormat, targetFrame, channel, sample * gain);
        }
    }
}

void mixAudioInPlace(
    std::vector<BYTE>& destination,
    const BYTE* source,
    DWORD byteCount,
    const AudioInputFormat& format) {
    if (!source || byteCount == 0 || destination.empty()) {
        return;
    }

    const size_t mixByteCount = std::min(destination.size(), static_cast<size_t>(byteCount));

    if (isFloatFormat(format)) {
        auto* output = reinterpret_cast<float*>(destination.data());
        const auto* input = reinterpret_cast<const float*>(source);
        const size_t sampleCount = mixByteCount / sizeof(float);
        for (size_t index = 0; index < sampleCount; index += 1) {
            output[index] = static_cast<float>(std::clamp(output[index] + input[index], -1.0f, 1.0f));
        }
        return;
    }

    if (isPcmFormat(format, 16)) {
        auto* output = reinterpret_cast<int16_t*>(destination.data());
        const auto* input = reinterpret_cast<const int16_t*>(source);
        const size_t sampleCount = mixByteCount / sizeof(int16_t);
        for (size_t index = 0; index < sampleCount; index += 1) {
            output[index] = clampTo<int16_t>(
                static_cast<double>(output[index]) + static_cast<double>(input[index]));
        }
        return;
    }

    if (isPcmFormat(format, 32)) {
        auto* output = reinterpret_cast<int32_t*>(destination.data());
        const auto* input = reinterpret_cast<const int32_t*>(source);
        const size_t sampleCount = mixByteCount / sizeof(int32_t);
        for (size_t index = 0; index < sampleCount; index += 1) {
            output[index] = clampTo<int32_t>(
                static_cast<double>(output[index]) + static_cast<double>(input[index]));
        }
    }
}

AudioMixer::AudioMixer(
    const AudioInputFormat& format,
    const AudioInputFormat& systemFormat,
    const AudioInputFormat& microphoneFormat,
    bool includeSystem,
    bool includeMicrophone,
    double microphoneGain,
    OutputCallback output)
    : format_(format),
      systemFormat_(systemFormat),
      microphoneFormat_(microphoneFormat),
      includeSystem_(includeSystem),
      includeMicrophone_(includeMicrophone),
      microphoneGain_(microphoneGain),
      output_(std::move(output)) {}

AudioMixer::~AudioMixer() {
    stop();
}

bool AudioMixer::start() {
    if (!output_ || format_.sampleRate == 0 || format_.blockAlign == 0) {
        return false;
    }

    stopRequested_ = false;
    emittedFrames_ = 0;
    timelineStarted_ = false;
    paused_ = false;
    thread_ = std::thread([this] {
        mixLoop();
    });
    return true;
}

void AudioMixer::beginTimeline() {
    {
        std::scoped_lock lock(mutex_);
        systemQueue_.clear();
        microphoneQueue_.clear();
        emittedFrames_ = 0;
        timelineStarted_ = true;
    }
    cv_.notify_all();
}

void AudioMixer::setPaused(bool paused) {
    {
        std::scoped_lock lock(mutex_);
        paused_ = paused;
        if (paused_) {
            systemQueue_.clear();
            microphoneQueue_.clear();
        }
    }
    cv_.notify_all();
}

void AudioMixer::stop() {
    stopRequested_ = true;
    cv_.notify_all();
    if (thread_.joinable()) {
        thread_.join();
    }
}

void AudioMixer::pushSystem(const BYTE* data, DWORD byteCount) {
    if (!includeSystem_ || stopRequested_) {
        return;
    }

    {
        std::scoped_lock lock(mutex_);
        if (paused_) {
            return;
        }
        append(systemQueue_, data, byteCount, systemFormat_, 1.0);
    }
    cv_.notify_all();
}

void AudioMixer::pushMicrophone(const BYTE* data, DWORD byteCount) {
    if (!includeMicrophone_ || stopRequested_) {
        return;
    }

    {
        std::scoped_lock lock(mutex_);
        if (paused_) {
            return;
        }
        append(microphoneQueue_, data, byteCount, microphoneFormat_, microphoneGain_);
    }
    cv_.notify_all();
}

void AudioMixer::append(
    std::vector<BYTE>& queue,
    const BYTE* data,
    DWORD byteCount,
    const AudioInputFormat& sourceFormat,
    double gain) {
    if (!data || byteCount == 0) {
        return;
    }

    convertAudioWithGain(data, byteCount, sourceFormat, format_, gain, gainBuffer_);
    queue.insert(queue.end(), gainBuffer_.begin(), gainBuffer_.end());
}

bool AudioMixer::pop(std::vector<BYTE>& queue, std::vector<BYTE>& chunk, size_t byteCount) {
    if (queue.empty()) {
        chunk.assign(byteCount, 0);
        return false;
    }

    chunk.assign(byteCount, 0);
    const size_t copiedBytes = std::min(byteCount, queue.size());
    std::memcpy(chunk.data(), queue.data(), copiedBytes);
    queue.erase(queue.begin(), queue.begin() + static_cast<std::ptrdiff_t>(copiedBytes));
    return copiedBytes > 0;
}

void AudioMixer::mixLoop() {
    const uint32_t chunkFrames = std::max<uint32_t>(1, format_.sampleRate / 100);
    const size_t chunkBytes = static_cast<size_t>(chunkFrames) * format_.blockAlign;
    std::vector<BYTE> mixedChunk;
    std::vector<BYTE> sourceChunk;
    std::chrono::steady_clock::time_point audioClockStart;
    bool audioClockStarted = false;

    while (true) {
        {
            std::unique_lock lock(mutex_);
            cv_.wait_for(lock, std::chrono::milliseconds(20), [&] {
                const bool hasSystem = !includeSystem_ || systemQueue_.size() >= chunkBytes;
                const bool hasMicrophone = !includeMicrophone_ || microphoneQueue_.size() >= chunkBytes;
                const bool hasAnySource = !systemQueue_.empty() || !microphoneQueue_.empty();
                return stopRequested_.load() ||
                    (timelineStarted_ && !paused_ && (hasSystem || hasMicrophone) && hasAnySource);
            });

            if (stopRequested_) {
                break;
            }
            if (!timelineStarted_ || paused_) {
                continue;
            }

            const bool hasAnyQueuedAudio = !systemQueue_.empty() || !microphoneQueue_.empty();
            if (!hasAnyQueuedAudio) {
                continue;
            }

            mixedChunk.assign(chunkBytes, 0);
            if (includeSystem_) {
                pop(systemQueue_, sourceChunk, chunkBytes);
                mixAudioInPlace(mixedChunk, sourceChunk.data(), static_cast<DWORD>(sourceChunk.size()), format_);
            }
            if (includeMicrophone_) {
                pop(microphoneQueue_, sourceChunk, chunkBytes);
                mixAudioInPlace(mixedChunk, sourceChunk.data(), static_cast<DWORD>(sourceChunk.size()), format_);
            }
        }

        if (!audioClockStarted) {
            audioClockStart = std::chrono::steady_clock::now();
            audioClockStarted = true;
        }

        const int64_t timestampHns =
            static_cast<int64_t>((emittedFrames_ * HnsPerSecond) / format_.sampleRate);
        const int64_t durationHns =
            static_cast<int64_t>((static_cast<uint64_t>(chunkFrames) * HnsPerSecond) / format_.sampleRate);
        if (!output_(mixedChunk.data(), static_cast<DWORD>(mixedChunk.size()), timestampHns, durationHns)) {
            stopRequested_ = true;
            break;
        }
        emittedFrames_ += chunkFrames;

        const auto nextDeadline = audioClockStart +
            std::chrono::duration_cast<std::chrono::steady_clock::duration>(
                std::chrono::duration<double>(static_cast<double>(emittedFrames_) / format_.sampleRate));
        std::this_thread::sleep_until(nextDeadline);
    }
}
