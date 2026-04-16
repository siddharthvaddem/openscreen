# Home Manager module for OpenScreen
# Usage in flake-based Home Manager config:
#
#   inputs.openscreen.url = "github:siddharthvaddem/openscreen";
#
#   { inputs, ... }: {
#     imports = [ inputs.openscreen.homeManagerModules.default ];
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
    home.packages = [ cfg.package ];
  };
}
