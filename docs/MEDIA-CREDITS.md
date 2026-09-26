# Exercise demo videos: sources, licences and review

19 of the 20 exercises have a bundled demonstration clip. Every clip is licensed for use
in a publicly distributed app; none needed payment or anyone's private permission. The
Dead Bug still needs one (see "Still missing" below).

The app credits each clip under its player and lists everything in **Profile → Video
credits** (with links to each source and licence). The data behind both is
[src/data/mediaCatalogue.ts](../src/data/mediaCatalogue.ts); this page is its
human-readable copy.

> **Needs a qualified trainer's review before publication.** The technique shown in every
> clip, and the written instructions, are unreviewed. The app says so on each exercise
> ("Draft instructions and video"). After the review, set `contentReviewStatus:
> 'approved'` per exercise and bump `CATALOGUE_VERSION`. Replace any clip the trainer
> rejects.

## Clips in the app

Each clip was trimmed to one camera angle (6.6–14.1 s), converted to 720p H.264 (HDR
sources tone-mapped to SDR), and had its sound removed, by
[scripts/make-exercise-clips.sh](../scripts/make-exercise-clips.sh). That script holds
the exact source files and trim points, so the clips can be rebuilt or audited.

| Exercise | Original | Author | Source | Licence | Length |
|---|---|---|---|---|---|
| Dumbbell Curl | "Biceps Curls With Dumbbell" | Goulart | [wger.de](https://wger.de/en/exercise/92/view-base) | CC BY-SA 4.0 | 10.9 s |
| Hammer Curl | "Hammer Curls" | Goulart | [wger.de](https://wger.de/en/exercise/272/view-base) | CC BY-SA 4.0 | 10.3 s |
| Dumbbell Bench Press | "Benchpress Dumbbells" | Goulart | [wger.de](https://wger.de/en/exercise/75/view-base) | CC BY-SA 4.0 | 14.1 s |
| Barbell Bench Press | "Bench Press" | Goulart | [wger.de](https://wger.de/en/exercise/73/view-base) | CC BY-SA 4.0 | 12 s (low-res original, 640×352) |
| Incline Dumbbell Press | "Incline Bench Press - Dumbbell" | Goulart | [wger.de](https://wger.de/en/exercise/537/view-base) | CC BY-SA 4.0 | 10.2 s |
| Dumbbell Lateral Raise | "Lateral Raises" | Goulart | [wger.de](https://wger.de/en/exercise/348/view-base) | CC BY-SA 4.0 | 9.6 s |
| Dumbbell Shoulder Press | "Shoulder Press, Dumbbells" | Goulart | [wger.de](https://wger.de/en/exercise/567/view-base) | CC BY-SA 4.0 | 12 s |
| Seated Cable Row | "Rowing seated, narrow grip" | Goulart | [wger.de](https://wger.de/en/exercise/512/view-base) | CC BY-SA 4.0 | 10.4 s |
| Leg Press | "Leg Press" | Goulart | [wger.de](https://wger.de/en/exercise/371/view-base) | CC BY-SA 4.0 | 13 s |
| Overhead Dumbbell Triceps Extension | "Dumbbell Triceps Extension" | Goulart | [wger.de](https://wger.de/en/exercise/211/view-base) | CC BY-SA 4.0 | 9.5 s |
| Romanian Deadlift | "Romanian Deadlift" | Goulart | [wger.de](https://wger.de/en/exercise/507/view-base) | CC BY-SA 4.0 | 12 s. **Shown with dumbbells** (the app's version uses a barbell); the app says so under the player |
| Barbell Back Squat | "Squat - exercise demonstration video" | FitnessScape | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Squat_-_exercise_demonstration_video.webm) | CC BY 3.0 | 7.1 s (the whole original; includes its "SQUAT" caption) |
| Push-Up | "Man Doing Push-ups" | olia danilevich | [Pexels](https://www.pexels.com/video/man-doing-push-ups-4964649/) | Pexels License | 12.5 s |
| Plank | "A Woman Planking" | Kampus Production | [Pexels](https://www.pexels.com/video/a-woman-planking-6023273/) | Pexels License | 9.3 s |
| Lat Pulldown | "Back Workout in Gym with Lat Pulldown Machine" | khezez \| خزاز | [Pexels](https://www.pexels.com/video/back-workout-in-gym-with-lat-pulldown-machine-35585699/) | Pexels License | 9.1 s (portrait) |
| Cable Triceps Pushdown | "Focused Gym Workout Featuring Tricep Pulldown" | Bennit Antony | [Pexels](https://www.pexels.com/video/focused-gym-workout-featuring-tricep-pulldown-39043777/) | Pexels License | 6.6 s (portrait, dim) |
| Pull-Up | "Gym Pull Ups" | Sport O'Scope | [Pexels](https://www.pexels.com/video/gym-pull-ups-15859716/) | Pexels License | 9.4 s (sides cropped; whole body in frame) |
| One-Arm Dumbbell Row | "Man Working Out at the Gym" | RDNE Stock project | [Pexels](https://www.pexels.com/video/man-working-out-at-the-gym-7187392/) | Pexels License | 12 s (knee and hand on a bench) |
| Goblet Squat | "Dumbbell Goblet Squat" | Your Move | [ymove.app](https://ymove.app/free-exercise-videos) | Your Move free licence | 12.6 s (portrait, studio) |

Before bundling, I checked every clip frame by frame and confirmed it shows that exact
exercise. Then each one was played on the iPhone Simulator from its exercise screen
(`.maestro/video-catalogue.yaml`).

### What the licences require, and how the app meets them

- **CC BY-SA 4.0** ([licence](https://creativecommons.org/licenses/by-sa/4.0/)): credit
  the author, link the source and licence, say what was changed, and share the changed
  clip under the same licence. The credit line under each player names the title,
  author, site, licence and "Trimmed, re-encoded, sound removed". Video credits links
  the source and licence, and states that the trimmed wger clips remain CC BY-SA 4.0.
  ShareAlike covers the clips, not the app's code.
- **CC BY 3.0** ([licence](https://creativecommons.org/licenses/by/3.0/)): credit, source
  link and licence link, all shown the same way.
- **Pexels License** ([licence](https://www.pexels.com/license/)): free use in apps,
  including commercially; credit is optional (given anyway). Don't imply that the people
  shown endorse the app (the credits screen says they don't), and don't resell the clips
  on their own.
- **Your Move free licence** ([free videos page](https://ymove.app/free-exercise-videos),
  checked 26 September 2026): "Free for commercial use. Use in your app, website, social
  media or client materials." Credit is appreciated, not required (given anyway). "Do not
  resell. You may not sell or redistribute the videos as a standalone product or
  library." **Please confirm in writing before release:** Your Move's general
  [terms](https://ymove.app/terms-and-conditions) say site content is for personal,
  non-commercial use unless they give express permission. The free-videos licence reads
  as that permission for these 25 clips, but a short email to Your Move removes any doubt.
  If they say no, swap in your own recording; nothing else changes.
- One point to confirm if you want certainty: CC BY-SA 4.0 forbids adding technical
  restrictions to the licensed clips. App Store encryption applies to the app's code,
  not its media files, and the originals stay freely available at the links above, so
  this should be fine. If you have legal advice available, it's worth a quick check.

## Still missing: Dead Bug

It shows "No demo video yet" with its written steps. I checked wger.de, Wikimedia
Commons, Pexels, Pixabay, Mixkit, Videezy, Coverr, Vecteezy and Your Move's free clips:
none has an openly licensed clip of a real dead bug (the "core" clips are sit-ups,
crunches and leg raises). What would fill it, pick one:

1. **Record it yourself** (free, exact). 8–15 s, side-on, whole body on a mat, steady
   phone in landscape, two or three slow reps each side. Then add it to
   `scripts/make-exercise-clips.sh` and `src/data/mediaCatalogue.ts` (README, "Exercise
   videos").
2. **Your Move full library** ([ymove.app/exercise-video-library](https://ymove.app/exercise-video-library)):
   includes "Dead Bug with Dumbbells" (a weighted version). Pricing is by request, or
   API plans "from $19/mo". Needs a purchase and their licence terms for app use.
3. **Shutterstock clip 1098699593**, "Dead Bug Fitness Exercise Workout Animation"
   ([link](https://www.shutterstock.com/video/clip-1098699593-dead-bug-fitness-exercise-workout-animation-male)):
   a 3D animation, not real footage. Needs a paid licence that covers use in an app.

Nothing has been bought.

## Upgrade options (optional)

- **Barbell Romanian Deadlift.** No free barbell clip exists, so the dumbbell version is
  used. Paid barbell options: Vecteezy Pro clips
  [35290451](https://www.vecteezy.com/video/35290451) (front view, whole body; its free
  licence doesn't allow app use) and [60472511](https://www.vecteezy.com/video/60472511)
  (side view), or Shutterstock/Pond5 animations
  ([1104342933](https://www.shutterstock.com/video/clip-1104342933-romanian-deadlift-barbell-fitness-exercise-workout-animation),
  [243983143](https://www.pond5.com/stock-footage/item/243983143-barbell-romanian-deadlift-fitness-exercise-workout-animation)).
- **Weaker clips:** Barbell Back Squat (7.1 s, with a caption), Barbell Bench Press
  (640×352) and Cable Triceps Pushdown (6.6 s, dim). Your Move's free clips include
  studio versions of all three, if you're happy to rely on Your Move's licence for more
  clips.

## Candidates rejected on review

- wger "Pull-ups" (video 71): byte-identical to wger's "Pull Ups on Machine" clip, so it
  may show the assisted machine. Replaced with the Pexels clip.
- wger "Triceps Extensions on Cable" (videos 55, 56): overhead cable extensions, not
  pushdowns.
- wger bench press video 23: filmed from under the bar, so the movement is hard to read.
  Video 22 is used instead.
- Wikimedia Commons "Common Lat Pulldown Mistakes": mixes wrong and right form with
  colour overlays.
- Wikimedia Commons "Interval Push-ups": a kettlebell-handle variation, not a standard
  push-up.
- Wikimedia Commons "Kettlebell Goblet Squat": kettlebell, not the app's dumbbell version
  (Your Move's dumbbell clip is used instead).
- Your Move "Single Arm Dumbbell Row – Legs apart": no bench; the app's steps use one
  (the Pexels clip matches them).
- Pixabay 148197 (one-arm row): framing hides the dumbbell for most of each rep.
- Pexels "Romanian deadlift" results: all conventional deadlifts from the floor.
- Pexels 6149638 (listed near "dead bug"): a crunch with a dumbbell pullover.
