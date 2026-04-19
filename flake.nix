{
  description = "OpenScreen — desktop screen recorder with built-in editor";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      # -- Per-system outputs (packages, dev shells) --

      packages = forAllSystems (pkgs: {
        openscreen = pkgs.callPackage ./nix/package.nix { };
        default = self.packages.${pkgs.stdenv.hostPlatform.system}.openscreen;
      });

      devShells = forAllSystems (
        pkgs:
        let
          electron = pkgs.electron;

          # Libraries Electron needs at runtime on Linux
          runtimeLibs = with pkgs; [
            # X11
            libx11
            libxcomposite
            libxdamage
            libxext
            libxfixes
            libxrandr
            libxtst
            libxcb
            libxshmfence

            # Wayland
            wayland

            # GTK / UI toolkit
            gtk3
            glib
            pango
            cairo
            gdk-pixbuf
            atk
            at-spi2-atk
            at-spi2-core

            # Graphics
            mesa
            libGL
            libdrm
            vulkan-loader

            # Networking / crypto (NSS for Chromium)
            nss
            nspr

            # Audio
            alsa-lib
            pipewire
            pulseaudio

            # System
            dbus
            cups
            expat
            libnotify
            libsecret
            util-linux # libuuid
          ];
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs_22
              electron

              # Native module compilation
              python3
              pkg-config
              gcc

              # Playwright browser tests
              playwright-driver.browsers
            ];

            # Electron's prebuilt binary needs these at runtime
            LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath runtimeLibs;

            # Tell the npm `electron` package to use the Nix-provided binary
            # instead of downloading its own. vite-plugin-electron respects this.
            ELECTRON_OVERRIDE_DIST_PATH = "${electron}/libexec/electron";

            # Playwright browser path for test:browser / test:e2e
            PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
            PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";

            shellHook = ''
              echo "OpenScreen dev shell — node $(node --version), electron v$(electron --version 2>/dev/null | tr -d 'v')"
            '';
          };
        }
      );

      # -- System-wide outputs (modules, overlay) --

      overlays.default = final: _prev: {
        openscreen = self.packages.${final.stdenv.hostPlatform.system}.openscreen;
      };

      nixosModules.default = import ./nix/module.nix self;
      homeManagerModules.default = import ./nix/hm-module.nix self;
    };
}
