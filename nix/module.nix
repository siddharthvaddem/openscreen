# NixOS module for OpenScreen
# Usage in flake-based NixOS config:
#
#   inputs.openscreen.url = "github:siddharthvaddem/openscreen";
#
#   { inputs, ... }: {
#     imports = [ inputs.openscreen.nixosModules.default ];
#     programs.openscreen.enable = true;
#   }
self:
{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.programs.openscreen;
in
{
  options.programs.openscreen = {
    enable = lib.mkEnableOption "OpenScreen screen recorder";

    package = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.stdenv.hostPlatform.system}.openscreen;
      defaultText = lib.literalExpression "inputs.openscreen.packages.\${pkgs.stdenv.hostPlatform.system}.openscreen";
      description = "The OpenScreen package to use.";
    };
  };

  config = lib.mkIf cfg.enable {
    environment.systemPackages = [ cfg.package ];

    # Screen capture on Wayland requires xdg-desktop-portal.
    # We enable the base portal; users should also enable a
    # desktop-specific portal (e.g. xdg-desktop-portal-gtk,
    # xdg-desktop-portal-hyprland) in their DE config.
    xdg.portal.enable = lib.mkDefault true;
  };
}
