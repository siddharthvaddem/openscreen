// src/components/keystroke-overlay/KeyCapGroup.tsx

import React from 'react';
import { KeyCap } from './KeyCap';
import type { ParsedKey } from '@/utils/keyNameMapping';

/**
 * Base font size for calculations (in pixels)
 * Must match the value in KeyCap.tsx for consistent scaling
 */
const BASE_FONT_SIZE = 16;

/**
 * Gap ratio between keycaps relative to base font size
 * Reference: keyviz/lib/windows/key_visualizer/widgets/keycap_group.dart lines 50-80
 * 
 * Requirements: 3.2
 */
const GAP_RATIO = 0.5;

/**
 * Props for the KeyCapGroup component
 * 
 * Requirements: 3.1, 3.2, 3.3
 */
export interface KeyCapGroupProps {
  /** Array of parsed keys to display */
  keys: ParsedKey[];
  /** Scale factor from settings (default 1.0) */
  textScale: number;
}

/**
 * KeyCapGroup Component
 * 
 * Container component that arranges multiple KeyCap components horizontally.
 * Renders a flex row with consistent gap spacing between keycaps.
 * 
 * Reference: keyviz/lib/windows/key_visualizer/widgets/keycap_group.dart lines 50-80
 * 
 * Requirements: 3.1, 3.2, 3.3
 * - 3.1: Arrange KeyCap elements horizontally in a flex row
 * - 3.2: Maintain gap equal to 50% of base font size between adjacent KeyCap elements
 * - 3.3: Center the row of KeyCap elements within the overlay container
 */
export function KeyCapGroup({ keys, textScale }: KeyCapGroupProps): React.ReactElement {
  // Calculate scaled gap between keycaps
  // Requirement 3.2: Gap = fontSize × 0.5 × scale
  const gap = BASE_FONT_SIZE * GAP_RATIO * textScale;

  // Container style - horizontal flex row with centered alignment
  // Requirement 3.1: Horizontal flex row
  // Requirement 3.3: Center the row within container
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: gap,
  };

  return (
    <div style={containerStyle} data-testid="keycap-group">
      {keys.map((key, index) => (
        <KeyCap
          key={`${key.name}-${index}`}
          keyName={key.name}
          icon={key.icon}
          isModifier={key.isModifier}
          textScale={textScale}
        />
      ))}
    </div>
  );
}

export default KeyCapGroup;
