import { useEffect, useState } from "react";
import { LaunchWindow } from "./components/launch/LaunchWindow";
import { SourceSelector } from "./components/launch/SourceSelector";
import { MicrophoneSettingsPage } from "./components/launch/MicrophoneSettingsPage";
import VideoEditor from "./components/video-editor/VideoEditor";
import { KeystrokeOverlay } from "./components/keystroke-overlay";

export default function App() {
  const [windowType, setWindowType] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('windowType') || '';
    setWindowType(type);
    if (type === 'hud-overlay' || type === 'source-selector' || type === 'keystroke-overlay' || type === 'mic-settings') {
      document.body.style.background = 'transparent';
      document.documentElement.style.background = 'transparent';
      document.getElementById('root')?.style.setProperty('background', 'transparent');
    }
  }, []);

  switch (windowType) {
    case 'hud-overlay':
      return <LaunchWindow />;
    case 'source-selector':
      return <SourceSelector />;
    case 'mic-settings':
      return <MicrophoneSettingsPage />;
    case 'editor':
      return <VideoEditor />;
    case 'keystroke-overlay':
      return <KeystrokeOverlay />;
    default:
      return (
        <div className="w-full h-full bg-background text-foreground">
          <h1>Openscreen</h1>
        </div>
      );
  }
}
