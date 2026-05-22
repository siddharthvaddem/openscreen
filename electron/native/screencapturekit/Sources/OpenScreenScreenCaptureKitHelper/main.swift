import AVFoundation
import CoreGraphics
import CoreMedia
import Foundation
import ScreenCaptureKit

struct Rectangle: Decodable {
	let x: Double
	let y: Double
	let width: Double
	let height: Double
}

struct RecordingRequest: Decodable {
	struct Source: Decodable {
		let type: String
		let sourceId: String
		let displayId: UInt32?
		let windowId: UInt32?
		let bounds: Rectangle?
	}

	struct Video: Decodable {
		let fps: Int
		let width: Int
		let height: Int
		let bitrate: Int?
		let hideSystemCursor: Bool
	}

	struct Audio: Decodable {
		struct SystemAudio: Decodable {
			let enabled: Bool
		}

		struct Microphone: Decodable {
			let enabled: Bool
			let deviceId: String?
			let deviceName: String?
			let gain: Double
		}

		let system: SystemAudio
		let microphone: Microphone
	}

	struct Webcam: Decodable {
		let enabled: Bool
		let deviceId: String?
		let deviceName: String?
		let width: Int
		let height: Int
		let fps: Int
	}

	struct Cursor: Decodable {
		let mode: String
	}

	struct Outputs: Decodable {
		let screenPath: String
		let manifestPath: String?
	}

	struct ExcludedApp: Decodable {
		let bundleIdentifier: String?
		let processID: Int32?
	}

	let schemaVersion: Int?
	let recordingId: Int?
	let source: Source
	let video: Video
	let audio: Audio
	let webcam: Webcam
	let cursor: Cursor
	let outputs: Outputs
	let excludedApps: [ExcludedApp]?
}

enum HelperError: Error, CustomStringConvertible {
	case invalidArguments
	case unsupportedMacOS
	case unsupportedFeature(String)
	case sourceNotFound(String)
	case invalidSourceType(String)
	case permissionDenied(String)
	case writerSetupFailed(String)

	var description: String {
		switch self {
		case .invalidArguments:
			return "Expected one JSON recording request argument."
		case .unsupportedMacOS:
			return "ScreenCaptureKit recording requires macOS 13 or newer."
		case .unsupportedFeature(let message):
			return message
		case .sourceNotFound(let message):
			return message
		case .invalidSourceType(let sourceType):
			return "Unsupported source type: \(sourceType)."
		case .permissionDenied(let message):
			return message
		case .writerSetupFailed(let message):
			return message
		}
	}
}

func emit(_ fields: [String: Any]) {
	if let data = try? JSONSerialization.data(withJSONObject: fields, options: []),
		let line = String(data: data, encoding: .utf8)
	{
		print(line)
		fflush(stdout)
	}
}

func emitError(code: String, message: String) {
	emit([
		"event": "error",
		"code": code,
		"message": message,
	])
}

@available(macOS 13.0, *)
final class ScreenCaptureRecorder: NSObject, SCStreamOutput, SCStreamDelegate {
	private struct CaptureTarget {
		let filter: SCContentFilter
		let width: Int
		let height: Int
	}

	private let request: RecordingRequest
	private let sampleQueue = DispatchQueue(label: "app.openscreen.sck-helper.samples")
	private let stateQueue = DispatchQueue(label: "app.openscreen.sck-helper.state")
	private var stream: SCStream?
	private var writer: AVAssetWriter?
	private var videoInput: AVAssetWriterInput?
	private var systemAudioInput: AVAssetWriterInput?
	private var microphoneAudioInput: AVAssetWriterInput?
	private var didStartWriting = false
	private var didEmitRecordingStarted = false
	private var isStopping = false
	private var isPaused = false
	private var pauseStartedAt: CMTime?
	private var totalPausedDuration = CMTime.zero
	private var nativeMicrophoneEnabled = false
	private var outputWidth = 1920
	private var outputHeight = 1080
	private let microphoneOutputTypeRawValue = 2
	private let hostClock = CMClockGetHostTimeClock()

	init(request: RecordingRequest) {
		self.request = request
	}

	func start() async throws {
		try ensureRequestedPermissions()

		let content = try await SCShareableContent.excludingDesktopWindows(
			false,
			onScreenWindowsOnly: true
		)
		let target = try makeCaptureTarget(from: content)
		outputWidth = target.width
		outputHeight = target.height
		let configuration = makeStreamConfiguration()
		let stream = SCStream(filter: target.filter, configuration: configuration, delegate: self)

		try stream.addStreamOutput(self, type: .screen, sampleHandlerQueue: sampleQueue)
		if request.audio.system.enabled {
			try stream.addStreamOutput(self, type: .audio, sampleHandlerQueue: sampleQueue)
		}
		if nativeMicrophoneEnabled {
			guard let microphoneOutputType = SCStreamOutputType(rawValue: microphoneOutputTypeRawValue) else {
				throw HelperError.unsupportedFeature(
					"Native microphone capture requires a macOS version with ScreenCaptureKit microphone output."
				)
			}
			try stream.addStreamOutput(self, type: microphoneOutputType, sampleHandlerQueue: sampleQueue)
		}
		try setupWriter()

		self.stream = stream
		emit(["event": "ready", "schemaVersion": 1])
		try await stream.startCapture()
	}

	func stop() async {
		let shouldStop = stateQueue.sync {
			if isStopping {
				return false
			}
			isStopping = true
			return true
		}
		if !shouldStop {
			return
		}

		do {
			try await stream?.stopCapture()
		} catch {
			emit([
				"event": "warning",
				"code": "stop-capture-failed",
				"message": "\(error)",
			])
		}

		await finishWriter()
	}

	func pause() {
		let didPause = stateQueue.sync {
			if isStopping || isPaused {
				return false
			}

			isPaused = true
			pauseStartedAt = CMClockGetTime(hostClock)
			return true
		}

		if didPause {
			emit([
				"event": "recording-paused",
				"timestampMs": Int(Date().timeIntervalSince1970 * 1000),
			])
		}
	}

	func resume() {
		let didResume = stateQueue.sync {
			if isStopping || !isPaused {
				return false
			}

			if let pauseStartedAt {
				let now = CMClockGetTime(hostClock)
				totalPausedDuration = CMTimeAdd(
					totalPausedDuration,
					CMTimeSubtract(now, pauseStartedAt)
				)
			}
			isPaused = false
			pauseStartedAt = nil
			return true
		}

		if didResume {
			emit([
				"event": "recording-resumed",
				"timestampMs": Int(Date().timeIntervalSince1970 * 1000),
			])
		}
	}

	func stream(_ stream: SCStream, didStopWithError error: Error) {
		emitError(code: "capture-stopped-with-error", message: "\(error)")
		Task {
			await stop()
		}
	}

	func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
		guard CMSampleBufferDataIsReady(sampleBuffer) else {
			return
		}
		let pauseState = currentPauseState()
		if pauseState.paused {
			return
		}
		guard let sampleBuffer = retimedSampleBuffer(sampleBuffer, subtracting: pauseState.offset) else {
			return
		}

		if type == .audio {
			appendAudioSampleBuffer(sampleBuffer, to: systemAudioInput)
			return
		}

		if type.rawValue == microphoneOutputTypeRawValue {
			appendAudioSampleBuffer(sampleBuffer, to: microphoneAudioInput)
			return
		}

		guard type == .screen else {
			return
		}
		guard isCompleteFrame(sampleBuffer) else {
			return
		}
		guard let videoInput, let writer else {
			return
		}
		let presentationTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
		if !didStartWriting {
			writer.startWriting()
			writer.startSession(atSourceTime: presentationTime)
			didStartWriting = true
		}

		if videoInput.isReadyForMoreMediaData {
			if videoInput.append(sampleBuffer), !didEmitRecordingStarted {
				didEmitRecordingStarted = true
				emit([
					"event": "recording-started",
					"timestampMs": Int(Date().timeIntervalSince1970 * 1000),
					"width": outputWidth,
					"height": outputHeight,
				])
			}
		}
	}

	private func ensureRequestedPermissions() throws {
		if !CGPreflightScreenCaptureAccess() {
			let granted = CGRequestScreenCaptureAccess()
			if !granted {
				throw HelperError.permissionDenied("Screen recording permission is required for ScreenCaptureKit capture.")
			}
		}

		if request.audio.microphone.enabled {
			switch AVCaptureDevice.authorizationStatus(for: .audio) {
			case .authorized:
				break
			case .notDetermined:
				let semaphore = DispatchSemaphore(value: 0)
				AVCaptureDevice.requestAccess(for: .audio) { _ in
					semaphore.signal()
				}
				let waitResult = semaphore.wait(timeout: .now() + 30)
				if waitResult == .timedOut || AVCaptureDevice.authorizationStatus(for: .audio) != .authorized {
					throw HelperError.permissionDenied("Microphone permission is required for native microphone capture.")
				}
			default:
				throw HelperError.permissionDenied("Microphone permission is required for native microphone capture.")
			}
		}
	}

	private func makeCaptureTarget(from content: SCShareableContent) throws -> CaptureTarget {
		switch request.source.type {
		case "display":
			guard let displayId = request.source.displayId else {
				throw HelperError.sourceNotFound("Display capture requires source.displayId.")
			}
			guard let display = content.displays.first(where: { $0.displayID == displayId }) else {
				throw HelperError.sourceNotFound("No ScreenCaptureKit display found for id \(displayId).")
			}
			let width = Int(CGDisplayPixelsWide(display.displayID))
			let height = Int(CGDisplayPixelsHigh(display.displayID))
			let requestedExclusions = request.excludedApps ?? []
			let excludedBundleIdentifiers = Set(
				requestedExclusions.compactMap { $0.bundleIdentifier }
			)
			let excludedProcessIDs = Set(
				requestedExclusions.compactMap { $0.processID }
			)
			let excludedWindows = content.windows.filter { window in
				guard let owner = window.owningApplication else { return false }
				if excludedBundleIdentifiers.contains(owner.bundleIdentifier) {
					return true
				}
				if excludedProcessIDs.contains(owner.processID) {
					return true
				}
				return false
			}
			return CaptureTarget(
				filter: SCContentFilter(display: display, excludingWindows: excludedWindows),
				width: clampCaptureDimension(width, fallback: request.video.width),
				height: clampCaptureDimension(height, fallback: request.video.height)
			)
		case "window":
			guard let windowId = request.source.windowId else {
				throw HelperError.sourceNotFound("Window capture requires source.windowId.")
			}
			guard let window = content.windows.first(where: { $0.windowID == windowId }) else {
				throw HelperError.sourceNotFound("No ScreenCaptureKit window found for id \(windowId).")
			}
			let candidateDisplay = content.displays.first {
				$0.frame.intersects(window.frame) || $0.frame.contains(CGPoint(x: window.frame.midX, y: window.frame.midY))
			}
			let scaleFactor = Self.scaleFactor(for: candidateDisplay?.displayID ?? CGMainDisplayID())
			let width = Int(window.frame.width) * scaleFactor
			let height = Int(window.frame.height) * scaleFactor
			return CaptureTarget(
				filter: SCContentFilter(desktopIndependentWindow: window),
				width: clampCaptureDimension(width, fallback: request.video.width),
				height: clampCaptureDimension(height, fallback: request.video.height)
			)
		default:
			throw HelperError.invalidSourceType(request.source.type)
		}
	}

	private func makeStreamConfiguration() -> SCStreamConfiguration {
		let configuration = SCStreamConfiguration()
		configuration.width = outputWidth
		configuration.height = outputHeight
		configuration.minimumFrameInterval = CMTime(value: 1, timescale: CMTimeScale(max(1, request.video.fps)))
		configuration.queueDepth = 6
		configuration.showsCursor = !request.video.hideSystemCursor
		configuration.pixelFormat = kCVPixelFormatType_32BGRA
		configuration.sampleRate = 48_000
		configuration.channelCount = 2
		configuration.excludesCurrentProcessAudio = true
		configuration.capturesAudio = request.audio.system.enabled

		if request.audio.microphone.enabled {
			guard supportsNativeMicrophoneCapture(streamConfig: configuration) else {
				nativeMicrophoneEnabled = false
				emit([
					"event": "warning",
					"code": "microphone-unavailable",
					"message": "Native microphone capture requires ScreenCaptureKit microphone support on this macOS version.",
				])
				return configuration
			}
			nativeMicrophoneEnabled = true
			configuration.capturesAudio = true
			configuration.setValue(true, forKey: "captureMicrophone")
			if let deviceId = resolveMicrophoneCaptureDeviceID() {
				configuration.setValue(deviceId, forKey: "microphoneCaptureDeviceID")
			}
		} else {
			nativeMicrophoneEnabled = false
		}

		return configuration
	}

	private func setupWriter() throws {
		let outputUrl = URL(fileURLWithPath: request.outputs.screenPath)
		try? FileManager.default.removeItem(at: outputUrl)
		try FileManager.default.createDirectory(
			at: outputUrl.deletingLastPathComponent(),
			withIntermediateDirectories: true
		)

		let writer = try AVAssetWriter(outputURL: outputUrl, fileType: .mp4)
		let settings: [String: Any] = [
			AVVideoCodecKey: AVVideoCodecType.h264,
			AVVideoWidthKey: outputWidth,
			AVVideoHeightKey: outputHeight,
			AVVideoCompressionPropertiesKey: [
				AVVideoAverageBitRateKey: request.video.bitrate ?? 18_000_000,
				AVVideoExpectedSourceFrameRateKey: request.video.fps,
			],
		]
		let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
		input.expectsMediaDataInRealTime = true

		guard writer.canAdd(input) else {
			throw HelperError.writerSetupFailed("Unable to add H.264 video input to AVAssetWriter.")
		}

		writer.add(input)
		self.writer = writer
		self.videoInput = input

		if request.audio.system.enabled {
			systemAudioInput = try addAudioInput(to: writer, bitRate: 192_000)
		}
		if nativeMicrophoneEnabled {
			microphoneAudioInput = try addAudioInput(to: writer, bitRate: 128_000)
		}
	}

	private func finishWriter() async {
		guard let writer else {
			return
		}

		videoInput?.markAsFinished()
		systemAudioInput?.markAsFinished()
		microphoneAudioInput?.markAsFinished()

		await withCheckedContinuation { continuation in
			writer.finishWriting {
				continuation.resume()
			}
		}

		if writer.status == .completed {
			emit([
				"event": "recording-stopped",
				"screenPath": request.outputs.screenPath,
			])
		} else {
			emitError(
				code: "writer-failed",
				message: writer.error.map { "\($0)" } ?? "AVAssetWriter failed with status \(writer.status.rawValue)."
			)
		}
	}

	private func addAudioInput(to writer: AVAssetWriter, bitRate: Int) throws -> AVAssetWriterInput {
		let settings: [String: Any] = [
			AVFormatIDKey: kAudioFormatMPEG4AAC,
			AVSampleRateKey: 48_000,
			AVNumberOfChannelsKey: 2,
			AVEncoderBitRateKey: bitRate,
		]
		let input = AVAssetWriterInput(mediaType: .audio, outputSettings: settings)
		input.expectsMediaDataInRealTime = true

		guard writer.canAdd(input) else {
			throw HelperError.writerSetupFailed("Unable to add AAC audio input to AVAssetWriter.")
		}

		writer.add(input)
		return input
	}

	private func appendAudioSampleBuffer(_ sampleBuffer: CMSampleBuffer, to input: AVAssetWriterInput?) {
		guard didStartWriting else {
			return
		}
		guard let input, input.isReadyForMoreMediaData else {
			return
		}

		input.append(sampleBuffer)
	}

	private func currentPauseState() -> (paused: Bool, offset: CMTime) {
		stateQueue.sync {
			(isPaused, totalPausedDuration)
		}
	}

	private func retimedSampleBuffer(_ sampleBuffer: CMSampleBuffer, subtracting offset: CMTime) -> CMSampleBuffer? {
		if !offset.isValid || offset == .zero {
			return sampleBuffer
		}

		let sampleCount = CMSampleBufferGetNumSamples(sampleBuffer)
		if sampleCount <= 0 {
			return sampleBuffer
		}

		var timing = Array(repeating: CMSampleTimingInfo(), count: sampleCount)
		let timingStatus = CMSampleBufferGetSampleTimingInfoArray(
			sampleBuffer,
			entryCount: sampleCount,
			arrayToFill: &timing,
			entriesNeededOut: nil
		)
		if timingStatus != noErr {
			emit([
				"event": "warning",
				"code": "sample-retime-failed",
				"message": "Unable to read sample timing info: \(timingStatus).",
			])
			return sampleBuffer
		}

		for index in timing.indices {
			if timing[index].presentationTimeStamp.isValid {
				timing[index].presentationTimeStamp = CMTimeSubtract(
					timing[index].presentationTimeStamp,
					offset
				)
			}
			if timing[index].decodeTimeStamp.isValid {
				timing[index].decodeTimeStamp = CMTimeSubtract(timing[index].decodeTimeStamp, offset)
			}
		}

		var retimedBuffer: CMSampleBuffer?
		let copyStatus = CMSampleBufferCreateCopyWithNewTiming(
			allocator: kCFAllocatorDefault,
			sampleBuffer: sampleBuffer,
			sampleTimingEntryCount: sampleCount,
			sampleTimingArray: &timing,
			sampleBufferOut: &retimedBuffer
		)
		if copyStatus != noErr {
			emit([
				"event": "warning",
				"code": "sample-retime-failed",
				"message": "Unable to copy sample timing info: \(copyStatus).",
			])
			return sampleBuffer
		}

		return retimedBuffer
	}

	private func isCompleteFrame(_ sampleBuffer: CMSampleBuffer) -> Bool {
		guard let attachments = CMSampleBufferGetSampleAttachmentsArray(
			sampleBuffer,
			createIfNecessary: false
		) as? [[SCStreamFrameInfo: Any]],
			let attachment = attachments.first,
			let statusRawValue = attachment[SCStreamFrameInfo.status] as? Int,
			let status = SCFrameStatus(rawValue: statusRawValue)
		else {
			return true
		}

		return status == .complete
	}

	private func clampCaptureDimension(_ value: Int, fallback: Int) -> Int {
		let requested = max(2, fallback)
		let candidate = value > 0 ? value : requested
		let clamped = min(candidate, requested)
		return max(2, clamped - (clamped % 2))
	}

	private static func scaleFactor(for displayId: CGDirectDisplayID) -> Int {
		guard let mode = CGDisplayCopyDisplayMode(displayId) else {
			return 1
		}

		return max(1, mode.pixelWidth / max(1, mode.width))
	}

	private func supportsNativeMicrophoneCapture(streamConfig: SCStreamConfiguration) -> Bool {
		streamConfig.responds(to: Selector(("setCaptureMicrophone:"))) &&
			streamConfig.responds(to: Selector(("setMicrophoneCaptureDeviceID:"))) &&
			SCStreamOutputType(rawValue: microphoneOutputTypeRawValue) != nil
	}

	private func resolveMicrophoneCaptureDeviceID() -> String? {
		let devices = AVCaptureDevice.devices(for: .audio)

		if let deviceName = request.audio.microphone.deviceName?.trimmingCharacters(in: .whitespacesAndNewlines),
			!deviceName.isEmpty,
			let device = devices.first(where: { $0.localizedName == deviceName })
		{
			return device.uniqueID
		}

		if let deviceId = request.audio.microphone.deviceId?.trimmingCharacters(in: .whitespacesAndNewlines),
			!deviceId.isEmpty,
			devices.contains(where: { $0.uniqueID == deviceId })
		{
			return deviceId
		}

		return nil
	}
}

@main
struct OpenScreenScreenCaptureKitHelper {
	static func main() async {
		do {
			guard CommandLine.arguments.count == 2 else {
				throw HelperError.invalidArguments
			}

			guard #available(macOS 13.0, *) else {
				throw HelperError.unsupportedMacOS
			}

			let requestData = Data(CommandLine.arguments[1].utf8)
			let decoder = JSONDecoder()
			let request = try decoder.decode(RecordingRequest.self, from: requestData)
			let recorder = ScreenCaptureRecorder(request: request)
			let stopTask = Task.detached {
				while let line = readLine() {
					let command = line.trimmingCharacters(in: .whitespacesAndNewlines)
					switch command {
					case "pause":
						recorder.pause()
					case "resume":
						recorder.resume()
					case "stop":
						await recorder.stop()
						exit(0)
					default:
						break
					}
				}
			}

			try await recorder.start()
			await stopTask.value
		} catch let error as HelperError {
			emitError(code: "helper-error", message: error.description)
			exit(1)
		} catch {
			emitError(code: "helper-error", message: "\(error)")
			exit(1)
		}
	}
}
