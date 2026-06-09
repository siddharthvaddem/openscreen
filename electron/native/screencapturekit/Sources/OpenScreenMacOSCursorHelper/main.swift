import AppKit
import ApplicationServices
import CryptoKit
import Foundation

struct CursorHelperRequest: Decodable {
	let sampleIntervalMs: Int?
}

struct CapturedCursorAsset {
	let id: String
	let imageDataUrl: String
	let width: Int
	let height: Int
	let hotspotX: Double
	let hotspotY: Double
	let scaleFactor: Double
}

final class MouseButtonTracker {
	private let lock = NSLock()
	private var leftDownCount = 0
	private var leftUpCount = 0
	private var eventTap: CFMachPort?
	private var runLoopSource: CFRunLoopSource?

	struct Events {
		let leftDownCount: Int
		let leftUpCount: Int
	}

	func start() -> Bool {
		let mask =
			(1 << CGEventType.leftMouseDown.rawValue) |
			(1 << CGEventType.leftMouseUp.rawValue)
		guard let tap = CGEvent.tapCreate(
			tap: .cgSessionEventTap,
			place: .headInsertEventTap,
			options: .listenOnly,
			eventsOfInterest: CGEventMask(mask),
			callback: { _, type, event, userInfo in
				if let userInfo {
					let tracker = Unmanaged<MouseButtonTracker>.fromOpaque(userInfo).takeUnretainedValue()
					tracker.record(type)
				}
				return Unmanaged.passUnretained(event)
			},
			userInfo: UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque())
		) else {
			return false
		}

		guard let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0) else {
			return false
		}

		eventTap = tap
		runLoopSource = source
		CFRunLoopAddSource(CFRunLoopGetCurrent(), source, .commonModes)
		CGEvent.tapEnable(tap: tap, enable: true)
		return true
	}

	func pump() {
		CFRunLoopRunInMode(.defaultMode, 0.001, false)
	}

	func consume() -> Events {
		lock.lock()
		defer { lock.unlock() }
		let events = Events(leftDownCount: leftDownCount, leftUpCount: leftUpCount)
		leftDownCount = 0
		leftUpCount = 0
		return events
	}

	private func record(_ type: CGEventType) {
		lock.lock()
		defer { lock.unlock() }
		if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
			reenableTap()
			return
		}
		if type == .leftMouseDown {
			leftDownCount += 1
		} else if type == .leftMouseUp {
			leftUpCount += 1
		}
	}

	private func reenableTap() {
		if let eventTap {
			CGEvent.tapEnable(tap: eventTap, enable: true)
		}
	}
}

func emit(_ fields: [String: Any?]) {
	let compacted = fields.compactMapValues { $0 }
	if let data = try? JSONSerialization.data(withJSONObject: compacted, options: []),
		let line = String(data: data, encoding: .utf8)
	{
		print(line)
		fflush(stdout)
	}
}

func stringAttribute(_ element: AXUIElement, _ attribute: String) -> String? {
	var value: CFTypeRef?
	let result = AXUIElementCopyAttributeValue(element, attribute as CFString, &value)
	guard result == .success else {
		return nil
	}

	return value as? String
}

func parentElement(_ element: AXUIElement) -> AXUIElement? {
	var value: CFTypeRef?
	let result = AXUIElementCopyAttributeValue(element, kAXParentAttribute as CFString, &value)
	guard result == .success else {
		return nil
	}

	guard CFGetTypeID(value) == AXUIElementGetTypeID() else {
		return nil
	}

	return (value as! AXUIElement)
}

func roleDescription(_ element: AXUIElement) -> String? {
	var value: CFTypeRef?
	let result = AXUIElementCopyAttributeValue(element, kAXRoleDescriptionAttribute as CFString, &value)
	guard result == .success else {
		return nil
	}

	return value as? String
}

func actionNames(_ element: AXUIElement) -> [String] {
	var value: CFArray?
	let result = AXUIElementCopyActionNames(element, &value)
	guard result == .success, let value else {
		return []
	}

	return (value as NSArray).compactMap { $0 as? String }
}
func isTextInputRole(_ role: String?) -> Bool {
	role == "AXTextField" ||
		role == "AXTextArea" ||
		role == "AXTextView" ||
		role == "AXComboBox"
}

func isPointerRole(_ role: String?, _ subrole: String?, _ description: String?) -> Bool {
	if role == "AXLink" ||
		subrole?.localizedCaseInsensitiveContains("link") == true ||
		description?.contains("link") == true
	{
		return true
	}

	return role == "AXButton" ||
		role == "AXMenuButton" ||
		role == "AXPopUpButton" ||
		role == "AXCheckBox" ||
		role == "AXRadioButton" ||
		role == "AXSwitch" ||
		role == "AXDisclosureTriangle" ||
		role == "AXTab" ||
		role == "AXMenuItem"
}

func cursorTypeForElement(_ element: AXUIElement) -> String? {
	var current: AXUIElement? = element

	for _ in 0..<5 {
		guard let element = current else {
			break
		}

		let role = stringAttribute(element, kAXRoleAttribute)
		let subrole = stringAttribute(element, kAXSubroleAttribute)
		let description = roleDescription(element)?.lowercased()

		if isTextInputRole(role) {
			return "text"
		}

		if isPointerRole(role, subrole, description) {
			return "pointer"
		}

		current = parentElement(element)
	}

	return nil
}

func accessibilityPointForMouse() -> CGPoint {
	let mouse = NSEvent.mouseLocation
	let primaryHeight = NSScreen.screens.first?.frame.height ?? NSScreen.main?.frame.height ?? 0
	return CGPoint(x: mouse.x, y: primaryHeight - mouse.y)
}

func currentCursorType() -> String? {
	guard AXIsProcessTrusted() else {
		return nil
	}

	let point = accessibilityPointForMouse()
	let systemWide = AXUIElementCreateSystemWide()
	var element: AXUIElement?
	let result = AXUIElementCopyElementAtPosition(
		systemWide,
		Float(point.x),
		Float(point.y),
		&element
	)

	guard result == .success, let element else {
		return nil
	}

	// Returns nil for anything that is not a text/pointer affordance so the
	// renderer falls through to the natively captured cursor bitmap (this is
	// what makes default and custom cursors render as their real images).
	return cursorTypeForElement(element)
}

func currentCursorAsset() -> CapturedCursorAsset? {
	guard let cursor = NSCursor.currentSystem ?? NSCursor.current as NSCursor? else {
		return nil
	}

	let image = cursor.image
	let pointSize = image.size
	guard pointSize.width > 0, pointSize.height > 0 else {
		return nil
	}

	var proposedRect = NSRect(origin: .zero, size: pointSize)
	guard let cgImage = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) else {
		return nil
	}

	let bitmap = NSBitmapImageRep(cgImage: cgImage)
	guard let png = bitmap.representation(using: .png, properties: [:]) else {
		return nil
	}

	let pixelsWide = bitmap.pixelsWide
	let pixelsHigh = bitmap.pixelsHigh
	guard pixelsWide > 0, pixelsHigh > 0 else {
		return nil
	}

	// Intrinsic backing scale of the cursor image (e.g. 2.0 on Retina). The
	// renderer divides pixel dimensions/hotspot by this to recover point sizes.
	let scaleFactor = Double(pixelsWide) / Double(pointSize.width)
	let hotSpot = cursor.hotSpot

	let digest = SHA256.hash(data: png)
	let id = digest.map { String(format: "%02x", $0) }.joined()
	let imageDataUrl = "data:image/png;base64,\(png.base64EncodedString())"

	return CapturedCursorAsset(
		id: id,
		imageDataUrl: imageDataUrl,
		width: pixelsWide,
		height: pixelsHigh,
		hotspotX: hotSpot.x * scaleFactor,
		hotspotY: hotSpot.y * scaleFactor,
		scaleFactor: scaleFactor
	)
}

func timestampMs() -> Int {
	Int(Date().timeIntervalSince1970 * 1000)
}

func leftButtonDown() -> Bool {
	CGEventSource.buttonState(.hidSystemState, button: .left)
}

func requestAccessibilityTrust() -> Bool {
	let options = [
		kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true
	] as CFDictionary
	return AXIsProcessTrustedWithOptions(options)
}

let request: CursorHelperRequest
if CommandLine.arguments.count >= 2,
	let data = CommandLine.arguments[1].data(using: .utf8),
	let decoded = try? JSONDecoder().decode(CursorHelperRequest.self, from: data)
{
	request = decoded
} else {
	request = CursorHelperRequest(sampleIntervalMs: nil)
}

let intervalMs = max(8, request.sampleIntervalMs ?? 33)
let accessibilityTrusted = requestAccessibilityTrust()
let mouseTracker = MouseButtonTracker()
let mouseTapReady = mouseTracker.start()
emit([
	"type": "ready",
	"timestampMs": timestampMs(),
	"accessibilityTrusted": accessibilityTrusted,
	"mouseTapReady": mouseTapReady,
])

// Process-wide set so each unique cursor shape is serialised at most once,
// even if the user alternates between shapes (e.g. arrow → text → arrow).
var emittedAssetIds = Set<String>()

while true {
	autoreleasepool {
		mouseTracker.pump()
		let mouseEvents = mouseTracker.consume()
		let asset = currentCursorAsset()
		// Only ship the (large) base64 payload the first time a cursor shape is seen;
		// subsequent samples reference it by assetId so stdout stays small.
		var assetPayload: [String: Any]?
		if let asset, emittedAssetIds.insert(asset.id).inserted {
			assetPayload = [
				"id": asset.id,
				"imageDataUrl": asset.imageDataUrl,
				"width": asset.width,
				"height": asset.height,
				"hotspotX": asset.hotspotX,
				"hotspotY": asset.hotspotY,
				"scaleFactor": asset.scaleFactor,
			]
		}
		emit([
			"type": "sample",
			"timestampMs": timestampMs(),
			"cursorType": currentCursorType(),
			"assetId": asset?.id,
			"asset": assetPayload,
			"leftButtonDown": leftButtonDown(),
			"leftButtonPressed": mouseEvents.leftDownCount > 0,
			"leftButtonReleased": mouseEvents.leftUpCount > 0,
		])
		Thread.sleep(forTimeInterval: Double(intervalMs) / 1000.0)
	}
}
