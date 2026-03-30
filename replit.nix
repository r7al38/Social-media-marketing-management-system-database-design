{ pkgs }: {
  deps = [
    pkgs.nodejs_18
    pkgs.nodePackages.npm
    pkgs.python3
    pkgs.gnumake
    pkgs.gcc
  ];
}