#!/usr/bin/env bash
set -euo pipefail
out=review-evidence/canonical-greeting-output
for character in ranca cana; do
  ffmpeg -loglevel error -y -framerate 30 -i "$out/$character/frames/%03d.png" -f lavfi -i 'color=c=0xf5f7f2:s=1080x1350:r=30:d=6' -filter_complex '[0:v]scale=-1:1350:flags=lanczos,format=rgba[fg];[1:v][fg]overlay=(W-w)/2:0:shortest=1,format=yuv420p[out]' -map '[out]' -t 6 -c:v libx264 -crf 18 -movflags +faststart "$out/$character-greeting-1080x1350-6s.mp4"
done
