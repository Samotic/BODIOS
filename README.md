# Bodios

An iPhone gym tracker built with **React Native Community CLI + TypeScript** (no Expo).
The plan, stage prompts and security requirements are in
[Bodios-iOS-Roadmap.pdf](Bodios-iOS-Roadmap.pdf); the visual direction is in
[docs/design/](docs/design/).

**Current status: Stage 7 done on the Simulator; waiting for a physical-iPhone check.**
Verified on iPhone Simulators with iOS 27.0 (Xcode 27.0): iPhone 18 Pro (Debug and
Release), iPhone 17e at the largest accessibility text size, iPhone 18 Pro Max. The
Release build runs without Metro. **Not yet tested on a physical iPhone**: see
[docs/BETA-CHECKLIST.md](docs/BETA-CHECKLIST.md). **19 of 20 exercises have a bundled
demonstration clip** (licensed for app use, credited; see
[docs/MEDIA-CREDITS.md](docs/MEDIA-CREDITS.md)); each was played on the Simulator. The
Dead Bug says "No demo video yet" until you record or license one. Clips and instructions still need a qualified
trainer's review. **Stage 9 preparation is done up to the steps that need your Apple account**:
see [docs/APP-STORE.md](docs/APP-STORE.md). Nothing has been uploaded. Stage 8 (accounts
and cloud sync) is optional and not started.

| | Version |
|---|---|
| React Native | 0.87.1 (minimum iOS 15.1) |
| React | 19.2.3 |
| React Navigation | 7 (native-stack + bottom-tabs) |
| OP-SQLite | 18.2.5 (bundles SQLite 3.53.4) |
| react-native-video | 6.19.3 (stable line; v7 is still beta) |
| Node | 22.11 or newer (developed on 24.21) |
| Package manager | npm (`package-lock.json`) |

## First-time setup (Mac)

1. **Xcode (full app, not just Command Line Tools).** Install it from the App Store, then:

   ```sh
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -license accept
   xcodebuild -downloadPlatform iOS   # or Xcode > Settings > Components
   ```

   Check with `xcodebuild -version` and `xcrun simctl list devices available`.

2. **A current Ruby, and Watchman.** macOS's built-in Ruby 2.6 can't compile the gems
   CocoaPods needs. Homebrew's Ruby works (tested with 4.0.7):

   ```sh
   brew install ruby watchman
   ruby -v    # should show a version newer than 2.6 (open a new terminal first)
   ```

3. **Project dependencies:**

   ```sh
   npm install
   npm run pods      # bundle install + pod install (into vendor/bundle and ios/Pods)
   ```

   Re-run `npm run pods` whenever a package with native iOS code is added or updated.
   A Metro reload alone won't pick up native changes. `pod install` prints a notice that
   calling it directly is deprecated; it's informational and still works.

4. **Optional, for UI tests:** `brew install mobile-dev-inc/tap/maestro`

## Run on the iPhone Simulator

```sh
npm run dev:ios
```

This checks prerequisites, picks and boots an iPhone Simulator, starts Metro (or reuses
this project's Metro if it's already running) and launches the app. If it started Metro,
Metro stays running in that terminal; press Ctrl+C to stop it. It never stops processes
it didn't start: if port 8081 is taken by something else it moves to the next free port.

```sh
npm run dev:ios -- --simulator "iPhone 17"          # a specific model
npm run dev:ios -- --simulator "iPhone 17 (27.0)"   # model + iOS version
npm run dev:ios -- --udid <UDID>                    # exact device
npm run dev:ios -- --help
```

`BODIOS_SIMULATOR` and `RCT_METRO_PORT` environment variables set defaults. The first
build takes several minutes; later builds are much faster.

**Two-terminal fallback:**

```sh
npm start                                  # terminal 1: Metro
npm run ios -- --simulator "iPhone 17"     # terminal 2: build + launch
```

Or open `ios/Bodios.xcworkspace` (the workspace, not the `.xcodeproj`) in Xcode and press Run.

## Release build

```sh
# Simulator, no Metro needed (the JavaScript is bundled into the app):
npx react-native run-ios --mode Release --simulator "iPhone 17" --no-packager

# Unsigned archive for real iPhones: proves the app compiles for devices. It can't be
# installed or distributed; that needs signing with your Apple Developer team (Stage 9).
cd ios && xcodebuild -workspace Bodios.xcworkspace -scheme Bodios -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/Bodios.xcarchive archive \
  CODE_SIGNING_ALLOWED=NO
```

Release builds drop the development-only `NSAllowsLocalNetworking` exception (a build
phase removes it), leave out the Profile → Developer checks, and make no network requests
at all: everything works offline.

To install on your own iPhone, follow [docs/BETA-CHECKLIST.md](docs/BETA-CHECKLIST.md).

## Accessibility

- Every button has a VoiceOver name (checked on every main screen by
  `__tests__/accessibility.test.tsx`); headings are marked as headings; charts have a
  text version and per-point VoiceOver labels; the rest timer announces "Rest over".
- Text follows the iPhone's text size setting. Body text grows fully; titles and control
  labels grow less (titles 1.5–2×, buttons 1.6×) so screens stay usable at the largest
  accessibility sizes. Checked on the smallest installed iPhone at the largest size.
- Colour pairs meet WCAG AA (`__tests__/contrast.test.ts`); state is never shown by
  colour alone (checkmarks, labels, dots).
- Touch targets are at least 48 pt; there are no custom animations, so Reduce Motion is
  handled by iOS's own transitions.

## Checks

```sh
npm test            # Jest + React Native Testing Library (includes real SQLite via Node)
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run e2e         # Maestro UI flows in .maestro/ (app installed, Simulator booted)
```

Jest runs the JavaScript in Node, with the app's database backed by Node's built-in
SQLite so migrations and queries run for real. It doesn't prove native behaviour
(OP-SQLite on iOS, video, safe areas, gestures). The Maestro flows in `.maestro/` tap
through the real app on the Simulator.
For the demo videos: `video-dumbbell-curl.yaml` runs the whole Dumbbell Curl path
(detail → play → pause/replay/speed/sound/full screen → workout sheet → values and rest
timer intact), and `video-catalogue.yaml` plays every bundled clip until its timeline
moves.

## Data and storage

- The app's database is `bodios.sqlite` in the app's private **Library** folder on the
  phone: not visible in the Files app, kept across restarts and app updates, included in
  normal device backups, and deleted if the app is deleted. Plain SQLite is **not
  encrypted**.
- Schema changes are numbered migrations in [src/db/migrations.ts](src/db/migrations.ts),
  applied once each at startup inside a transaction. Never edit a shipped migration; add a
  new one.
- Screens never contain SQL: they use repositories (for example
  [exerciseRepository.ts](src/features/exercises/exerciseRepository.ts)). All values go
  through `?` parameters.

To look inside the Simulator's database:

```sh
DATA=$(xcrun simctl get_app_container booted org.reactjs.native.example.Bodios data)
sqlite3 -readonly "$DATA/Library/bodios.sqlite" "SELECT id, name FROM exercises"
```

## Exercise content

The starter catalogue (20 exercises) is in
[src/data/exerciseCatalogue.ts](src/data/exerciseCatalogue.ts). It is copied into the
database on first launch and updated in place (never deleted) whenever
`CATALOGUE_VERSION` goes up, so **bump `CATALOGUE_VERSION` after editing it**.

Every instruction is a **draft** written from common coaching cues, and the app labels it
"Draft instructions: not yet reviewed by a qualified trainer". Have a trainer review the
names, equipment, steps and mistakes, then set `contentReviewStatus: 'approved'` for each
reviewed exercise.

## Routines

Create routines from the Workouts tab (**New routine**) or from any exercise's
**Add to routine** button. In the routine editor, set sets, reps (or time for timed
exercises) and rest with the − / + buttons, reorder with the ↑ / ↓ buttons, and remove
exercises. Everything saves immediately. A routine with no exercises can't be started.
Routines hold **targets only**; what you actually lift is stored with each workout
(Stage 5), so editing a routine never changes past workouts.

## Logging a workout

Open a routine and tap **Start workout**. The routine is copied into the workout, so
editing the routine later never changes it. For each set, type the weight and reps (or
time) and tap **Complete set** (or the circle on the row). Values stay blank until you enter
them, or until you tap **Use last time's numbers**. Completing a set starts the rest
timer, pinned above the Complete button: pause, ±15 s or skip it.

Everything is saved as you type. Leaving the screen, locking the phone or force-quitting
the app loses nothing: Home shows **Resume workout**, and the rest timer carries on from
its stored end time. Only one workout can be in progress. **Finish** asks first, saves
only the sets marked done, and can't happen twice; **Discard** asks first and deletes the
workout. The summary shows duration, completed sets and notes, never calories or
estimates.

Weights are stored in kilograms. Dumbbell exercises are "weight per dumbbell", barbell
ones "total including bar", pull-ups "added weight (0 = bodyweight only)"; the label is
always shown next to the weight.

## Progress, history and settings

- **Progress tab:** best lifts (all time), then a Week/Month view whose stats, chart and
  history list all cover the same period. A *workout* is a finished session with at least
  one completed working set. A *best lift* is the heaviest completed set actually logged
  for that exercise and load type (dumbbell weights are never compared with barbell
  totals), shown with its reps and date; it is not an estimated one-rep max. Charts have
  a **Show numbers** list and every column/point is readable with VoiceOver.
- **History:** tap a workout to see it, edit its notes, or delete it (asks first). Every
  number recalculates after a deletion.
- **Home:** real weekly numbers only; a dot under a date marks a day you trained.
- **Profile → Settings:** kg/lb (display only; weights stay stored in kg), default rest for
  newly added routine exercises, and whether demos start muted.
- **Export data** shares everything (routines, finished workouts, settings) as JSON text
  through the iOS share sheet (Copy, Save to Files, Mail…). No temporary file is written.
- **Delete all data** asks first, then removes routines, workouts and settings. The
  exercise library stays.

## Exercise videos

The demo player ([ExerciseVideoPlayer.tsx](src/features/exercises/media/ExerciseVideoPlayer.tsx))
shows a poster and play button first (nothing autoplays), starts muted, loops, and has
play/pause, replay, a tap-to-seek timeline (VoiceOver: swipe up/down), 1×/0.5× speed,
sound on/off and full screen (iOS's own player, with a Close button). It fits the whole
frame without cropping, pauses when you leave the screen or the app goes to the
background, plays only one demo at a time, and mixes with your music instead of stopping
it. If a clip fails, it says so and offers Try again; the written steps always work.

The frame takes the clip's shape (16:9 for landscape, up to 4:5 for portrait clips).
Under the player: a credit line, and on exercise detail a link to **Video credits**.

**During a workout**, "Watch demonstration" opens the clip in a sheet over the workout.
The workout screen stays exactly as it was underneath (typed numbers, completed sets,
the rest timer, which keeps counting); closing the sheet stops the video.

### Where the clips come from

19 clips are bundled in `assets/exercises/` (about 28 MB), so they play offline. Sources,
licences, and the exercises still without a clip:
[docs/MEDIA-CREDITS.md](docs/MEDIA-CREDITS.md). Only use footage you recorded or that is
licensed for use in a distributed app, and only if it shows exactly that exercise.

The clips are made by [scripts/make-exercise-clips.sh](scripts/make-exercise-clips.sh)
(needs `brew install ffmpeg`). It downloads each original, trims it to one camera angle,
converts HDR to SDR with macOS's `avconvert`, encodes 720p H.264 without sound, and
writes a poster JPEG.

### Adding or replacing a clip

1. Add a line to the script's manifest: exercise id, source URL, start and length in
   seconds, `hlg` for iPhone HDR footage or `sdr` otherwise, and an optional crop and
   poster time. Run `scripts/make-exercise-clips.sh <exercise-id>` and check the result
   frame by frame.
2. In [src/data/mediaAssets.ts](src/data/mediaAssets.ts), add the `.mp4` to
   `bundledVideos` and the `.jpg` to `bundledPosters` (both keyed by the exercise id).
3. In [src/data/mediaCatalogue.ts](src/data/mediaCatalogue.ts), add a `mediaCredits`
   entry: title, author, source page, exact file URL, licence and length.
4. In [src/data/exerciseCatalogue.ts](src/data/exerciseCatalogue.ts), set the exercise's
   `mediaId` to `'<exercise-id>-demo'` and bump `CATALOGUE_VERSION`.
5. Update [docs/MEDIA-CREDITS.md](docs/MEDIA-CREDITS.md), then rebuild the app (new
   bundled files need a rebuild, not just a reload). `npm test` checks that every clip
   is bundled, credited and attached to its own exercise.

Remote clips (`remoteUrl`, https only) are supported by the player, with loading, Try
again and a "needs an internet connection" message, but none are used: bundling keeps
the app offline and true to its privacy policy.

## Documents

- [docs/BETA-CHECKLIST.md](docs/BETA-CHECKLIST.md): install on your iPhone and what to test.
- [docs/APP-STORE.md](docs/APP-STORE.md): TestFlight/App Store status, drafts and steps.
- [docs/PRIVACY-POLICY.md](docs/PRIVACY-POLICY.md): the policy to host (matches the app's).
- [docs/MEDIA-CREDITS.md](docs/MEDIA-CREDITS.md): demo clip sources, licences and gaps.
- [docs/store-screenshots/](docs/store-screenshots/): draft 6.9" screenshots from the real app.
- [docs/design/](docs/design/): mockups and the app-icon source.

## Project layout

```
App.tsx                     database + providers + navigator
src/navigation/             root stack (tabs, ExerciseDetail, ActiveWorkout) and bottom tabs
src/theme/                  colour/spacing tokens, typography, navigation theme
src/components/             AppText, Button, Card, Input, Screen, EmptyState, SearchField, FilterChip, Tag
src/db/                     database interface, OP-SQLite adapter, migrations, catalogue sync
src/data/                   bundled content: exercise catalogue, media metadata
src/hooks/                  shared hooks (async data loading)
src/features/home/          Home screen, week strip
src/features/exercises/     Workouts tab (library), exercise detail, repository, search/filter
src/features/workouts/      active workout + in-progress draft state
src/features/progress/      Progress tab
src/features/profile/       Profile tab, privacy policy, video credits
assets/exercises/           bundled demo clips (.mp4) and posters (.jpg)
scripts/dev-ios.js          the dev:ios command
scripts/make-exercise-clips.sh  rebuilds the demo clips from their sources
test-utils/                 Node SQLite adapter and video-asset transformer for Jest
.maestro/                   UI flows for the Simulator
```

## iOS project notes

- **Scene lifecycle (iOS 27).** iOS 27 won't launch apps that don't adopt `UIScene`. The
  React Native 0.87 template doesn't, so the app sets up its window in
  [SceneDelegate.swift](ios/Bodios/SceneDelegate.swift), following React Native 0.88's
  template. Keep this when upgrading React Native.
- **react-native-svg resource bundle.** Its `RNSVGFilters` bundle declares iOS 12.4, which
  Xcode 27 rejects. The [Podfile](ios/Podfile) `post_install` lifts it to the app's minimum.

## Known limitations

- The rest timer doesn't alert you in the background (no notifications, by design for now).
- The Simulator used for testing holds a few test workouts from the automated flows.
- The Dead Bug has no demo clip yet, and the Romanian Deadlift clip is shown with
  dumbbells (the app says so); options in [docs/MEDIA-CREDITS.md](docs/MEDIA-CREDITS.md).
- Demo technique and written instructions haven't been reviewed by a qualified trainer.
- Video behaviours not checkable on the Simulator yet: the silent switch, mixing with music
  that's already playing, and interruptions such as a phone call. Check these on a real
  iPhone (Stage 7).
- Only tested on Simulators so far; run [docs/BETA-CHECKLIST.md](docs/BETA-CHECKLIST.md)
  on a real iPhone before calling the beta ready.
- The app icon is a placeholder (lime dumbbell); replace it if you have a designed one.
- Privacy-policy and support URLs aren't set yet ([src/config/links.ts](src/config/links.ts));
  the app shows its built-in policy until then.
- No accounts or cloud sync (optional Stage 8, not requested). Data lives on the phone
  and in its normal backups; Export data makes a copy.
- Bundle identifier is still the template default (`org.reactjs.native.example.Bodios`);
  choose the real one before signing (see docs/APP-STORE.md).
