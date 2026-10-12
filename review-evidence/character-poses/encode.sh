#!/usr/bin/env bash
set -euo pipefail
ffmpeg -loglevel error -y -framerate 30 -i review-evidence/character-pose-output/frames/%03d.png -t 13 -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart review-evidence/character-pose-output/Rancana-character-motion-13s.mp4
