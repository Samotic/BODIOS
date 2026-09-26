#!/bin/sh
# Rebuilds the bundled exercise demo clips in assets/exercises/ from their
# original, openly licensed sources (see docs/MEDIA-CREDITS.md for licences
# and attribution). Each clip is trimmed to one camera angle, converted to
# SDR H.264 at 30 fps with no audio track, and gets a JPEG poster.
#
# macOS only: needs ffmpeg (brew install ffmpeg) and the built-in avconvert,
# which tone-maps the iPhone HDR (HLG) sources to SDR correctly.
#
#   scripts/make-exercise-clips.sh              # every clip
#   scripts/make-exercise-clips.sh dumbbell-curl
#
# Downloads are cached in $CLIP_CACHE (default: a folder in $TMPDIR).
set -e
cd "$(dirname "$0")/.."
OUT=assets/exercises
CACHE=${CLIP_CACHE:-${TMPDIR:-/tmp}/bodios-clip-sources}
mkdir -p "$OUT" "$CACHE"

# key | source URL | start s | length s | hlg or sdr | extra ffmpeg filter |
# poster time s (default 1)
MANIFEST='
dumbbell-curl|https://wger.de/media/exercise-video/92/8bfb917c-3d0d-49b9-8073-5d7e01c1b894.MOV|0|10.9|hlg|
hammer-curl|https://wger.de/media/exercise-video/272/df069052-2173-4f24-855f-a0eebe729f24.MOV|0|10.3|hlg|
dumbbell-bench-press|https://wger.de/media/exercise-video/75/080c799b-8afd-4130-8d72-9cef0cd79f54.MOV|0|14.1|sdr|
barbell-bench-press|https://wger.de/media/exercise-video/73/255b3509-e454-48a6-bf66-c7ca482be21a.MOV|6|12|sdr|
incline-dumbbell-press|https://wger.de/media/exercise-video/537/b9c937e9-daeb-42a9-be8e-7a77e368478c.MOV|17.2|10.2|sdr|
dumbbell-lateral-raise|https://wger.de/media/exercise-video/348/de69928a-8a35-4096-821c-1f46de5e0e03.MOV|0|9.6|hlg|
dumbbell-shoulder-press|https://wger.de/media/exercise-video/567/64f33c19-1d96-4b7c-af17-6c6a4941c614.MOV|0.5|12|hlg|
seated-cable-row|https://wger.de/media/exercise-video/512/fff4c294-93f0-4926-b3a2-bf59ad4afaa5.MOV|0|10.4|hlg|
leg-press|https://wger.de/media/exercise-video/371/6aae16b4-01b9-4eb4-935c-3250f84d2c59.MOV|0|13|hlg|
overhead-dumbbell-triceps-extension|https://wger.de/media/exercise-video/211/85f6eb25-a76c-409e-9af9-497794ac0dfb.MOV|0|9.5|sdr|
barbell-back-squat|https://upload.wikimedia.org/wikipedia/commons/5/5c/Squat_-_exercise_demonstration_video.webm|0|7.1|sdr|
push-up|https://www.pexels.com/download/video/4964649/|0|12.5|sdr|
plank|https://www.pexels.com/download/video/6023273/|0|9.3|sdr||5
lat-pulldown|https://www.pexels.com/download/video/35585699/|0|9.1|sdr|
cable-triceps-pushdown|https://www.pexels.com/download/video/39043777/|0|6.6|sdr|
pull-up|https://www.pexels.com/download/video/15859716/|0|9.4|sdr|crop=1728:2160:896:0,
one-arm-dumbbell-row|https://www.pexels.com/download/video/7187392/|1.5|12|sdr|
goblet-squat|https://ymove.app/api/free/a2a797d0-f6f6-436e-8616-6c1d93e73d67|0|12.6|sdr|
romanian-deadlift|https://wger.de/media/exercise-video/507/6b6054b5-9236-4a63-8392-6ea7a9010ca6.MOV|0|12|hlg|
'

build() {
  key=$1 url=$2 start=$3 length=$4 range=$5 extra=$6 poster=${7:-1}
  # avconvert needs the real extension to recognise the file.
  case "$url" in
    *.MOV | *.mov) ext=mov ;;
    *.webm) ext=webm ;;
    *) ext=mp4 ;;
  esac
  src="$CACHE/$key.source.$ext"
  if [ ! -s "$src" ]; then
    echo "Downloading $key"
    curl -sSfL -A "Mozilla/5.0 (Bodios clip build)" -o "$src" "$url" </dev/null
  fi

  input=$src
  seek="-ss $start -t $length"
  if [ "$range" = hlg ]; then
    # AVFoundation's H.264 presets tone-map HDR to SDR; ffmpeg alone can't here.
    input="$CACHE/$key.sdr.mov"
    avconvert -s "$src" -p Preset1920x1080 -o "$input" --replace \
      --start "$start" --duration "$length" </dev/null >/dev/null
    seek=""
  fi

  # Fit within 1280×720 (landscape) or 720×1280 (portrait); never upscale.
  scale="scale=w='min(iw,if(gt(iw,ih),1280,720))':h='min(ih,if(gt(iw,ih),720,1280))'"
  scale="$scale:force_original_aspect_ratio=decrease:force_divisible_by=2"
  # shellcheck disable=SC2086
  ffmpeg -nostdin -v error -y $seek -i "$input" -an \
    -vf "${extra}${scale},fps=30,format=yuv420p" \
    -c:v libx264 -profile:v high -preset slow -crf 26 \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
    -movflags +faststart "$OUT/$key.mp4"
  ffmpeg -nostdin -v error -y -ss "$poster" -i "$OUT/$key.mp4" -frames:v 1 -q:v 4 "$OUT/$key.jpg"
  echo "$key: $(ffprobe -v error -show_entries format=duration:stream=width,height \
    -of csv=p=0 "$OUT/$key.mp4" | tr '\n' ' ')"
}

echo "$MANIFEST" | while IFS='|' read -r key url start length range extra poster; do
  [ -z "$key" ] && continue
  if [ $# -eq 0 ] || [ "$1" = "$key" ]; then
    build "$key" "$url" "$start" "$length" "$range" "$extra" "$poster"
  fi
done
