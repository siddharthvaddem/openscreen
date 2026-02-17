import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VideoEditor from './VideoEditor';
import type { WebcamOverlaySettings } from './types';

const capturedExportConfigs: Array<Record<string, unknown>> = [];

vi.mock('@/hooks/usePresets', () => ({
  usePresets: () => ({
    presets: [],
    defaultPresetId: null,
    savePreset: vi.fn(),
    updatePreset: vi.fn(),
    deletePreset: vi.fn(),
    duplicatePreset: vi.fn(),
    setDefaultPreset: vi.fn(),
    getDefaultPreset: vi.fn(() => null),
  }),
}));

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('./PlaybackControls', () => ({
  default: () => <div data-testid="playback-controls" />,
}));

vi.mock('./ExportDialog', () => ({
  ExportDialog: () => null,
}));

vi.mock('./timeline/TimelineEditor', () => ({
  default: ({ onSelectWebcam }: { onSelectWebcam: (id: string | null) => void }) => (
    <button type="button" onClick={() => onSelectWebcam('webcam-1')}>
      Select Webcam
    </button>
  ),
}));

vi.mock('./SettingsPanel', () => ({
  SettingsPanel: ({
    selectedWebcamId,
    webcamSettings,
    onWebcamSettingsChange,
    onExport,
  }: {
    selectedWebcamId?: string | null;
    webcamSettings?: WebcamOverlaySettings;
    onWebcamSettingsChange?: (next: WebcamOverlaySettings) => void;
    onExport?: () => void;
  }) => (
    <div>
      <div data-testid="webcam-panel-visibility">{selectedWebcamId ? 'visible' : 'hidden'}</div>
      {selectedWebcamId && webcamSettings && onWebcamSettingsChange ? (
        <input
          aria-label="webcam-size"
          type="range"
          value={webcamSettings.sizePercent}
          onChange={(event) =>
            onWebcamSettingsChange({
              ...webcamSettings,
              sizePercent: Number(event.target.value),
            })
          }
        />
      ) : null}
      <button type="button" onClick={onExport}>
        Export
      </button>
    </div>
  ),
}));

vi.mock('./VideoPlayback', async () => {
  const ReactModule = await import('react');

  return {
    default: ReactModule.forwardRef(function MockVideoPlayback(_, ref) {
      ReactModule.useImperativeHandle(
        ref,
        () => ({
          video: {
            videoWidth: 1920,
            videoHeight: 1080,
            currentTime: 0,
            paused: true,
          } as HTMLVideoElement,
          app: null,
          videoSprite: null,
          videoContainer: null,
          containerRef: { current: null },
          play: vi.fn(async () => undefined),
          pause: vi.fn(),
        }),
        [],
      );

      return <div data-testid="video-playback" />;
    }),
  };
});

vi.mock('@/lib/exporter', () => {
  class MockVideoExporter {
    constructor(config: Record<string, unknown>) {
      capturedExportConfigs.push(config);
    }

    async export() {
      return {
        success: true,
        blob: {
          arrayBuffer: async () => new ArrayBuffer(8),
        } as Blob,
      };
    }

    cancel() {
      return undefined;
    }
  }

  class MockGifExporter {
    async export() {
      return {
        success: true,
        blob: {
          arrayBuffer: async () => new ArrayBuffer(8),
        } as Blob,
      };
    }

    cancel() {
      return undefined;
    }
  }

  return {
    VideoExporter: MockVideoExporter,
    GifExporter: MockGifExporter,
    GIF_SIZE_PRESETS: {
      medium: { width: 1280, height: 720 },
    },
    calculateOutputDimensions: () => ({ width: 1280, height: 720 }),
  };
});

describe('VideoEditor webcam wiring', () => {
  beforeEach(() => {
    capturedExportConfigs.length = 0;

    Object.defineProperty(window, 'electronAPI', {
      value: {
        getCurrentVideoPath: vi.fn(async () => ({
          success: true,
          path: 'C:\\recordings\\sample.webm',
        })),
        webcam: {
          getWebcamVideoPath: vi.fn(async () => ({
            success: true,
            path: 'C:\\recordings\\sample.webcam.webm',
          })),
        },
        saveExportedVideo: vi.fn(async () => ({
          success: true,
          cancelled: false,
          path: 'C:\\exports\\export.mp4',
        })),
      },
      writable: true,
      configurable: true,
    });
  });

  it('shows webcam panel on selection and exports updated webcam size', async () => {
    render(<VideoEditor />);

    const selectWebcamButton = await screen.findByRole('button', { name: 'Select Webcam' });

    expect(screen.getByTestId('webcam-panel-visibility')).toHaveTextContent('hidden');

    fireEvent.click(selectWebcamButton);

    await waitFor(() => {
      expect(screen.getByTestId('webcam-panel-visibility')).toHaveTextContent('visible');
    });

    fireEvent.change(screen.getByLabelText('webcam-size'), { target: { value: '34' } });
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => {
      expect(capturedExportConfigs.length).toBeGreaterThan(0);
    });

    const latestConfig = capturedExportConfigs.at(-1) as { webcamSettings?: WebcamOverlaySettings };
    expect(latestConfig.webcamSettings).toBeDefined();
    expect(latestConfig.webcamSettings?.sizePercent).toBe(34);
  });
});
