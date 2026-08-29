#!/bin/bash
# Generate app identity assets (royal crown) with ImageMagick
set -e
cd /home/mouh/kalistenix/public/img
BG="#0c0e14"
GOLD="#f4c25a"
GOLD2="#d99a2b"
GEM="#ff8a3d"
# Crown icon: dark rounded square + gold crown + gems
convert -size 512x512 xc:"#0c0e14" \
  -fill "#f2b544" -draw "circle 256,256 256,10" -fill "#0c0e14" -draw "circle 256,256 256,64" \
  -fill "$GOLD" -draw "polygon 136,190 90,330 192,330" \
  -fill "$GOLD" -draw "polygon 256,110 198,330 314,330" \
  -fill "$GOLD" -draw "polygon 376,190 320,330 422,330" \
  -fill "$GOLD2" -draw "roundrectangle 74,330 438,396 22,22" \
  -fill "$GEM" -draw "circle 160,362 160,378" \
  -fill "$GEM" -draw "circle 256,362 256,380" \
  -fill "$GEM" -draw "circle 352,362 352,378" \
  -fill "#ffffff" -draw "circle 148,352 148,357" \
  -fill "#ffffff" -draw "circle 244,352 244,357" \
  -fill "#ffffff" -draw "circle 340,352 340,357" \
  crown.png
convert crown.png -resize 256x256 icon-256.png
convert crown.png -resize 192x192 icon-192.png
convert crown.png -resize 64x64 favicon.png
convert crown.png -resize 48x48 apple-icon.png
echo "done crown assets"
ls -la /home/mouh/kalistenix/public/img/