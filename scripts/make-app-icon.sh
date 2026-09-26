#!/bin/sh
# Renders docs/design/app-icon.svg to the 1024×1024 app icon (no transparency,
# as the App Store requires). macOS only: uses Quick Look and sips.
set -e
cd "$(dirname "$0")/.."
OUT=ios/Bodios/Images.xcassets/AppIcon.appiconset
TMP=$(mktemp -d)
qlmanage -t -s 1024 -o "$TMP" docs/design/app-icon.svg >/dev/null
# JPEG round trip drops the alpha channel.
sips -s format jpeg -s formatOptions best "$TMP/app-icon.svg.png" --out "$TMP/icon.jpg" >/dev/null
sips -s format png -z 1024 1024 "$TMP/icon.jpg" --out "$OUT/AppIcon-1024.png" >/dev/null
rm -rf "$TMP"
echo "Wrote $OUT/AppIcon-1024.png"
