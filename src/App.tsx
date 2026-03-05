import { useEffect, useState } from "react";
import { LaunchWindow } from "./components/launch/LaunchWindow";
import { SourceSelector } from "./components/launch/SourceSelector";
import VideoEditor from "./components/video-editor/VideoEditor";
import { loadAllCustomFonts } from "./lib/customFonts";
import { ShortcutsProvider } from "./contexts/ShortcutsContext";
import { ShortcutsConfigDialog } from "./components/video-editor/ShortcutsConfigDialog";

export default function App() {
  const [windowType, setWindowType] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('windowType') || '';
    setWindowType(type);
    if (type === 'hud-overlay' || type === 'source-selector') {
      document.body.style.background = 'transparent';
      document.documentElement.style.background = 'transparent';
      document.getElementById('root')?.style.setProperty('background', 'transparent');
    }

    // Load custom fonts on app initialization
    loadAllCustomFonts().catch((error) => {
      console.error('Failed to load custom fonts:', error);
    });
  }, []);

  switch (windowType) {
    case 'hud-overlay':
      return <LaunchWindow />;
    case 'source-selector':
      return <SourceSelector />;
    case 'editor':
      return (
        <ShortcutsProvider>
          <VideoEditor />
          <ShortcutsConfigDialog />
        </ShortcutsProvider>
      );
      default:
      return (
        <div className="w-full h-full bg-background text-foreground">
          <h1>Openscreen</h1>
        </div>
      );
  }
}
