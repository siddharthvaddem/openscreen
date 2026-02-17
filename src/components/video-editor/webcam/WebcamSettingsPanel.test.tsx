import { render, screen, fireEvent } from '@testing-library/react';
import type { InputHTMLAttributes } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { WebcamSettingsPanel } from './WebcamSettingsPanel';
import { DEFAULT_WEBCAM_OVERLAY_SETTINGS } from '../types';
import { SettingsPanel } from '../SettingsPanel';

interface MockSliderProps extends InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: number[]) => void;
  value?: number[];
}

vi.mock('@/components/ui/slider', () => ({
  Slider: ({ onValueChange, value = [0], ...props }: MockSliderProps) => (
    <input
      type="range"
      value={value[0]}
      onChange={(event) => onValueChange?.([Number(event.target.value)])}
      {...props}
    />
  ),
}));

vi.mock('@/lib/assetPath', () => ({
  getAssetPath: vi.fn(async (path: string) => path),
}));

describe('WebcamSettingsPanel', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      value: {
        getPlatform: vi.fn(async () => 'win32'),
      },
      writable: true,
      configurable: true,
    });
  });

  it('updates position via button callback', () => {
    const onChange = vi.fn();

    render(
      <WebcamSettingsPanel
        settings={{
          ...DEFAULT_WEBCAM_OVERLAY_SETTINGS,
          position: 'custom',
          customPosition: { x: 0.2, y: 0.4 },
        }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /top-left/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'top-left', customPosition: undefined }),
    );
  });

  it('updates sizePercent when size slider changes', () => {
    const onChange = vi.fn();

    render(
      <WebcamSettingsPanel
        settings={DEFAULT_WEBCAM_OVERLAY_SETTINGS}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Size'), { target: { value: '33' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ sizePercent: 33 }),
    );
  });

  it('updates shadowIntensity when shadow slider changes', () => {
    const onChange = vi.fn();

    render(
      <WebcamSettingsPanel
        settings={DEFAULT_WEBCAM_OVERLAY_SETTINGS}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Shadow Intensity'), { target: { value: '77' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ shadowIntensity: 77 }),
    );
  });

  it('updates shape via shape button clicks', () => {
    const onChange = vi.fn();

    render(
      <WebcamSettingsPanel
        settings={DEFAULT_WEBCAM_OVERLAY_SETTINGS}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'circle' }));
    fireEvent.click(screen.getByRole('button', { name: 'square' }));

    expect(onChange).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ shape: 'circle' }),
    );
    expect(onChange).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ shape: 'square' }),
    );
  });

  it('shows webcam settings only when webcam region is selected', async () => {
    const onWebcamSettingsChange = vi.fn();

    const { rerender } = render(
      <SettingsPanel
        selected="wallpapers/wallpaper1.jpg"
        onWallpaperChange={vi.fn()}
        aspectRatio="16:9"
        selectedWebcamId={null}
        webcamSettings={DEFAULT_WEBCAM_OVERLAY_SETTINGS}
        onWebcamSettingsChange={onWebcamSettingsChange}
      />,
    );

    expect(screen.queryByText('Webcam')).not.toBeInTheDocument();

    rerender(
      <SettingsPanel
        selected="wallpapers/wallpaper1.jpg"
        onWallpaperChange={vi.fn()}
        aspectRatio="16:9"
        selectedWebcamId="webcam-1"
        webcamSettings={DEFAULT_WEBCAM_OVERLAY_SETTINGS}
        onWebcamSettingsChange={onWebcamSettingsChange}
      />,
    );

    expect(await screen.findByText('Webcam')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bottom-right/i })).toBeInTheDocument();
  });
});
