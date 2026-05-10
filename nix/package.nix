{
  lib,
  buildNpmPackage,
  nodejs_22,
  electron,
  makeWrapper,
  makeDesktopItem,
  copyDesktopItems,
}:

buildNpmPackage {
  nodejs = nodejs_22;
  pname = "openscreen";
  version = "1.4.0";

  src =
    let
      fs = lib.fileset;
      # gitTracked fails when source is already a store path (path: flake inputs).
      # Detect this and fall back to cleanSource which handles both cases.
      isStorePath = builtins.storeDir == builtins.substring 0 (builtins.stringLength builtins.storeDir) (toString ../.);
      baseFiles = if isStorePath then fs.fromSource (lib.cleanSource ../.) else fs.gitTracked ../.;
    in
    fs.toSource {
      root = ../.;
      fileset = fs.difference baseFiles (
        fs.unions [
          ../nix
          ../flake.nix
          ../flake.lock
          (fs.fileFilter (file: file.hasExt "md") ../.)
        ]
      );
    };

  npmDepsHash = "sha256-tOpoJPzaZDK3HJijGHpZ0+jWsbrYyQUuw1pO0Uxcifg=";

  env.ELECTRON_SKIP_BINARY_DOWNLOAD = "1";

  # electron-builder is not needed — we wrap system electron directly
  npmFlags = [ "--ignore-scripts" ];
  makeCacheWritable = true;

  # vite-plugin-electron compiles electron/ sources into dist-electron/
  # tsconfig has noEmit — tsc is type-check only
  buildPhase = ''
    runHook preBuild
    npx vite build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p "$out/lib/openscreen"

    # Renderer build output (index.html, JS chunks, copied public/ assets)
    cp -r dist "$out/lib/openscreen/"

    # Main process + preload (compiled by vite-plugin-electron)
    cp -r dist-electron "$out/lib/openscreen/"

    # Package manifest (electron reads "main" field to find entry point)
    cp package.json "$out/lib/openscreen/"

    # Strip devDependencies (electron, vitest, biome, playwright, etc.)
    npm prune --omit=dev --no-save
    cp -r node_modules "$out/lib/openscreen/"

    # Asset resolution: when app.isPackaged is false, the main process resolves
    # assets at <appPath>/public/. Place wallpapers at that root to match the
    # packaged layout (electron-builder extraResources -> resources/wallpapers).
    mkdir -p "$out/lib/openscreen/public"
    cp -r public/wallpapers "$out/lib/openscreen/public/wallpapers"

    # Wrap system electron with the app directory
    mkdir -p "$out/bin"
    makeWrapper "${electron}/bin/electron" "$out/bin/openscreen" \
      --add-flags "$out/lib/openscreen" \
      --set ELECTRON_IS_DEV 0

    # Install icons to hicolor theme
    for size in 16 24 32 48 64 128 256 512 1024; do
      icon="icons/icons/png/''${size}x''${size}.png"
      if [ -f "$icon" ]; then
        install -Dm644 "$icon" \
          "$out/share/icons/hicolor/''${size}x''${size}/apps/openscreen.png"
      fi
    done

    runHook postInstall
  '';

  nativeBuildInputs = [
    makeWrapper
    copyDesktopItems
  ];

  desktopItems = [
    (makeDesktopItem {
      name = "openscreen";
      desktopName = "OpenScreen";
      genericName = "Screen Recorder";
      exec = "openscreen %U";
      icon = "openscreen";
      comment = "Desktop screen recorder with built-in editor";
      categories = [
        "AudioVideo"
        "Video"
        "Recorder"
      ];
      startupWMClass = "Openscreen";
      terminal = false;
    })
  ];

  meta = {
    description = "Desktop screen recorder with built-in editor";
    homepage = "https://github.com/siddharthvaddem/openscreen";
    license = lib.licenses.mit;
    mainProgram = "openscreen";
    platforms = lib.platforms.linux;
  };
}
