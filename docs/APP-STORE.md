# Bodios: TestFlight and App Store preparation (Stage 9)

Development done, beta tested and approved by Apple are three separate milestones. Nothing
here has been uploaded. **Uploading a build, inviting testers and submitting for review
each need your explicit go-ahead**; preparing them isn't permission to publish.

## Where things stand

| Item | State |
|---|---|
| Release build (Simulator) | Builds and runs without Metro; UI flows pass |
| Device archive | Builds **unsigned** for iPhone (arm64, iOS 15.1+); can't be installed or uploaded until signed |
| Devices | iPhone only (`TARGETED_DEVICE_FAMILY = 1`); runs on iPad in iPhone compatibility mode |
| Version / build | 1.0 (1) |
| App icon | Placeholder (lime dumbbell); replace if you have a designed icon: [docs/design/app-icon.svg](design/app-icon.svg), then `scripts/make-app-icon.sh` |
| Launch screen | Charcoal with the BODIOS wordmark |
| Privacy manifest | Present; required-reason APIs declared (file timestamps C617.1, boot time 35F9.1, UserDefaults CA92.1); no data collected; no tracking |
| Export compliance | `ITSAppUsesNonExemptEncryption = NO` in Info.plist (the app uses no encryption and no network) |
| In-app privacy policy | Profile → Privacy policy (works offline) |
| Screenshots | 6 drafts at 1320×2868 (6.9") in [docs/store-screenshots/](store-screenshots/), from a real logged workout; taken before the demo videos, so consider adding one that shows a demo |
| Demo videos | 19 of 20 exercises, bundled (about 28 MB), licensed for app use and credited in the app; see [MEDIA-CREDITS.md](MEDIA-CREDITS.md) |
| **Blocked on you** | Apple Developer Program membership, bundle ID, signing team, hosted privacy-policy and support URLs, a trainer review of exercise instructions **and demo clips**, a Dead Bug clip (record or license one), written confirmation from Your Move for the goblet squat clip, a physical-iPhone run of [BETA-CHECKLIST.md](BETA-CHECKLIST.md) |

Built with **Xcode 27.0 / iOS 27 SDK**. Before uploading, check Apple's current SDK
requirements (developer.apple.com/news/upcoming-requirements) rather than relying on
this note.

## What you need to do first

1. **Join the Apple Developer Program** (check the current price on
   developer.apple.com/support/compare-memberships). You handle enrolment, payment and
   identity verification.
2. **Pick the bundle ID** (e.g. `com.yourname.bodios`; permanent once live) and in Xcode:
   Bodios target → Signing & Capabilities → Team = your team, Bundle Identifier = your ID,
   "Automatically manage signing" on.
3. **Host the privacy policy.** Put [PRIVACY-POLICY.md](PRIVACY-POLICY.md) on a public
   https page (GitHub Pages works), add your contact line, then set
   `PRIVACY_POLICY_URL` (and `SUPPORT_URL`) in [src/config/links.ts](../src/config/links.ts).
4. **Get the exercise content reviewed** by a qualified trainer (the written steps and
   the technique in each demo clip), then set `contentReviewStatus: 'approved'` per
   exercise and bump `CATALOGUE_VERSION`.
5. **Get a Dead Bug clip and confirm the Your Move licence** (options and details in
   [MEDIA-CREDITS.md](MEDIA-CREDITS.md)).
6. **Run [BETA-CHECKLIST.md](BETA-CHECKLIST.md) on your iPhone.**

## App Store Connect: drafts to paste

- **Name:** Bodios (check it's available when you create the app record)
- **Subtitle** (≤30): Log workouts, see progress
- **Category:** Health & Fitness
- **Promotional text:** Build routines, log every set, rest with a timer that keeps time
  even if you close the app, and watch your best lifts go up. Everything stays on your
  iPhone.
- **Description:**

  > Bodios is a simple, fast gym tracker.
  >
  > • Exercise library with step-by-step instructions and common mistakes
  > • Short demonstration videos for most exercises, built in so they work offline
  > • Build routines with your own sets, reps or time, and rest
  > • Log weight and reps set by set, with a clear label for how weight is counted
  >   (per dumbbell, including the bar, or added weight)
  > • Rest timer you can pause, adjust or skip; it keeps time even if you close the app
  > • Never lose a workout: it's saved as you go and resumes after a restart
  > • See your history, workouts per week or month, and your best lifts over time
  > • Works fully offline; no account, no ads, no tracking
  > • Kilograms or pounds; export your data any time
  >
  > Exercise instructions are general guidance, not medical advice.

- **Keywords** (≤100): workout,gym,log,tracker,strength,routine,sets,reps,rest timer,weightlifting,dumbbell,training
- **Support URL / Privacy policy URL:** your hosted pages (step 3 above)
- **Age rating:** answer "None"/"No" to every content question (no mature content, no
  gambling, no unrestricted web access, no user-generated content shared with others) →
  expected 4+. Answer them yourself in App Store Connect; this is only a guide.
- **App Privacy:** **Data Not Collected.** True for this code: no network requests, no
  analytics or crash-reporting SDKs, no accounts; exports only go where the user sends
  them. Re-check before adding any SDK, sync or login.
- **Export compliance:** covered by `ITSAppUsesNonExemptEncryption = NO`.
- **Sign in required?** No. **Notes for the reviewer:** "No account needed. All data is
  stored on the device. Start from Workouts → New routine, add an exercise, then Start
  workout."
- **Account deletion (guideline 5.1.1(v)):** not applicable, since there are no accounts.
  If accounts are added (Stage 8), in-app deletion becomes mandatory, and third-party
  login triggers guideline 4.8 (offer Sign in with Apple or an equivalent).

## Upload (only with your explicit OK)

1. Bump **Build** (CURRENT_PROJECT_VERSION) for every upload; bump **Version**
   (MARKETING_VERSION) for each App Store release.
2. Xcode: select **Any iOS Device (arm64)** → **Product → Archive** (Release).
3. Organizer → **Validate App** (fix anything it reports) → **Distribute App → App Store
   Connect → Upload**.
4. Never commit certificates, provisioning profiles or keys; Xcode keeps them in your
   keychain.

## TestFlight test plan

Internal testers (your App Store Connect team, up to 100) can test right after processing.
**External testers need Beta App Review** for the first build of a version, which can take
a day or more.

- [ ] Fresh install from TestFlight opens to the Home screen; no crash on first launch.
- [ ] **Update over an older build keeps all data**: install build N, log a workout, then
      install build N+1 from TestFlight; routines, history and settings are intact
      (database migrations run once, in order).
- [ ] Offline (airplane mode): log, finish and review a workout.
- [ ] Force-quit mid-workout, reopen: Resume workout with every value and the rest timer.
- [ ] Demo videos: tap to play, pause/replay, 0.5×, full screen, pause on leaving; Watch
      demonstration during a workout keeps your numbers and rest timer.
- [ ] Everything in [BETA-CHECKLIST.md](BETA-CHECKLIST.md).
- [ ] Accounts: not applicable (none).

## Submitting for review (only with your explicit OK)

Fill in the metadata, attach screenshots, pick the TestFlight build, answer age rating,
App Privacy and export questions, then **Submit for Review**. Approval and dates aren't
guaranteed; Apple may ask questions or reject, and the fix-and-resubmit loop is normal.
