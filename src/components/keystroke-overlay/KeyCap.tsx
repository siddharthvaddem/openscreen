// src/components/keystroke-overlay/KeyCap.tsx

import React from 'react';

/**
 * Design constants for keycap styling
 * Reference: keyviz/lib/providers/key_style.dart lines 260-320
 * 
 * Requirements: 1.3, 1.5, 4.1, 4.2, 4.3, 4.5, 7.1, 7.2
 */
const KEYCAP_STYLE = {
  minSizeRatio: 2.25,           // Minimum width/height relative to base font size
  outerHeightRatio: 2.5,        // Total height including shadow
  shadowOffsetRatio: 0.25,      // Bottom shadow offset
  horizontalPaddingRatio: 0.5,  // Horizontal padding relative to base font size
  verticalPaddingRatio: 0.375,  // Vertical padding relative to base font size
  iconSizeRatio: 0.45,          // Icon size relative to base font size
  labelSizeRatio: 0.5,          // Label size for modifiers relative to base font size
  cornerSmoothing: 0.4,         // Border radius factor (40% corner smoothing)
  primaryColor: '#FFFFFF',      // Key face color
  secondaryColor: '#000000',    // Key shadow color
  textColor: '#000000',         // Label color
  borderColor: '#000000',       // Border color
  borderWidth: 1,               // Border width in px
};

/**
 * Base font size for calculations (in pixels)
 */
const BASE_FONT_SIZE = 16;

/**
 * Props for the KeyCap component
 * 
 * Requirements: 1.3, 1.5, 4.1, 7.1, 7.2
 */
export interface KeyCapProps {
  /** Display name of the key (e.g., "Ctrl", "A", "Enter") */
  keyName: string;
  /** Optional Unicode glyph for modifiers (e.g., "⌃" for Ctrl) */
  icon?: string;
  /** Whether this is a modifier key (Ctrl, Alt, Shift, Meta) */
  isModifier: boolean;
  /** Scale factor from settings (default 1.0) */
  textScale: number;
}

/**
 * KeyCap Component
 * 
 * Renders a single key cap with elevated 3D styling, matching the keyviz visual design.
 * Uses two stacked div containers (bottom=shadow, top=face) to create depth effect.
 * 
 * For modifier keys: displays icon (45% font size) above label (50% font size) in column layout
 * For non-modifier keys: centers label text only
 * 
 * Reference: keyviz/lib/windows/key_visualizer/widgets/keycaps/elevated_keycap.dart
 * Reference: keyviz/lib/windows/key_visualizer/widgets/keycaps/keycap_content.dart lines 45-60
 * 
 * Requirements: 1.3, 1.5, 4.1, 4.2, 4.3, 4.5, 7.1, 7.2
 */
export function KeyCap({ keyName, icon, isModifier, textScale }: KeyCapProps): React.ReactElement {
  // Calculate scaled dimensions
  const scaledFontSize = BASE_FONT_SIZE * textScale;
  const minSize = scaledFontSize * KEYCAP_STYLE.minSizeRatio;
  const outerHeight = scaledFontSize * KEYCAP_STYLE.outerHeightRatio;
  const shadowOffset = scaledFontSize * KEYCAP_STYLE.shadowOffsetRatio;
  const horizontalPadding = scaledFontSize * KEYCAP_STYLE.horizontalPaddingRatio;
  const verticalPadding = scaledFontSize * KEYCAP_STYLE.verticalPaddingRatio;
  const borderRadius = minSize * KEYCAP_STYLE.cornerSmoothing;
  const iconSize = scaledFontSize * KEYCAP_STYLE.iconSizeRatio;
  const labelSize = scaledFontSize * KEYCAP_STYLE.labelSizeRatio;

  // Container style - holds both shadow and face
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    height: outerHeight,
    display: 'inline-flex',
    alignItems: 'flex-end',
  };

  // Shadow container style (bottom layer)
  // Requirement 4.1: Bottom container (shadow)
  // Requirement 4.2: Darker secondary color for depth illusion
  const shadowStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minWidth: minSize,
    minHeight: minSize,
    backgroundColor: KEYCAP_STYLE.secondaryColor,
    border: `${KEYCAP_STYLE.borderWidth}px solid ${KEYCAP_STYLE.borderColor}`,
    borderRadius: borderRadius,
    boxSizing: 'border-box',
  };

  // Face container style (top layer)
  // Requirement 4.3: Lighter primary color for key face
  // Requirement 4.4: Offset upward by 25% of font size
  // Requirement 4.5: Subtle border (1px)
  // Requirement 4.6: Internal padding
  const faceStyle: React.CSSProperties = {
    position: 'relative',
    bottom: shadowOffset,
    minWidth: minSize,
    minHeight: minSize,
    backgroundColor: KEYCAP_STYLE.primaryColor,
    border: `${KEYCAP_STYLE.borderWidth}px solid ${KEYCAP_STYLE.borderColor}`,
    borderRadius: borderRadius,
    paddingLeft: horizontalPadding,
    paddingRight: horizontalPadding,
    paddingTop: verticalPadding,
    paddingBottom: verticalPadding,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: isModifier && icon ? 'space-between' : 'center',
  };

  // Icon style for modifiers
  // Requirement 2.5: Icon at 45% of base font size
  const iconStyle: React.CSSProperties = {
    fontSize: iconSize,
    lineHeight: 1.2,
    color: KEYCAP_STYLE.textColor,
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  // Label style
  // Requirement 2.6: Label at 50% of base font size for modifiers
  // Requirement 7.1, 7.2: Non-modifier keys display centered label
  const labelStyle: React.CSSProperties = {
    fontSize: isModifier && icon ? labelSize : scaledFontSize,
    lineHeight: 1.2,
    color: KEYCAP_STYLE.textColor,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  };

  return (
    <div style={containerStyle} data-testid="keycap-container">
      {/* Shadow container (bottom layer) */}
      <div style={shadowStyle} data-testid="keycap-shadow" />
      
      {/* Face container (top layer) */}
      <div style={faceStyle} data-testid="keycap-face">
        {/* Modifier keys: icon above label in column layout */}
        {/* Requirement 2.7: Icon and label vertically stacked with space-between */}
        {isModifier && icon ? (
          <>
            <span style={iconStyle} data-testid="keycap-icon">{icon}</span>
            <span style={labelStyle} data-testid="keycap-label">{keyName}</span>
          </>
        ) : (
          /* Non-modifier keys: centered label only */
          /* Requirement 7.1, 7.2: Center label text for non-modifiers */
          <span style={labelStyle} data-testid="keycap-label">{keyName}</span>
        )}
      </div>
    </div>
  );
}

export default KeyCap;
