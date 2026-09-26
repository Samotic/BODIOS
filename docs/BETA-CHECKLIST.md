# Bodios: physical iPhone beta checklist

Everything below was checked on the iPhone Simulator (iOS 27) except where marked
**phone only**: those need a real iPhone. The roadmap doesn't call the beta ready until this
list has been run on a phone.

## 1. Install Bodios on your iPhone (free, no paid account needed)

1. Plug the iPhone into the Mac and unlock it. Tap **Trust** if asked.
2. On the iPhone: **Settings → Privacy & Security → Developer Mode → On** (it restarts).
3. On the Mac: `open ios/Bodios.xcworkspace` (the workspace, not the `.xcodeproj`).
4. In Xcode: select the **Bodios** target → **Signing & Capabilities**:
   - **Team:** add your Apple ID (Xcode → Settings → Accounts) and pick your *Personal Team*.
   - **Bundle Identifier:** change `org.reactjs.native.example.Bodios` to your own, e.g.
     `com.yourname.bodios` (it must be unique; you'll keep it for the App Store later).
5. Choose **Product → Scheme → Edit Scheme… → Run → Build Configuration: Release** (a
   Release build carries its own JavaScript, so it doesn't need the Mac running Metro).
6. Pick your iPhone as the run destination at the top of Xcode and press **Run** (▶).
7. First launch only: on the iPhone, **Settings → General → VPN & Device Management** →
   trust your developer certificate.

A free Personal Team build stops opening after **7 days**; re-run from Xcode to renew it.
TestFlight (paid Apple Developer Program) is Stage 9.

## 2. Core flow (the roadmap's acceptance checklist)

- [ ] Open the app → Workouts → search "curl" → **Dumbbell Curl** → tap play: a dumbbell
      curl clip plays, with its credit underneath and the written steps below.
- [ ] **Add to routine** → New routine → start it → log 3 sets → **Finish** → the summary
      shows exactly the sets you marked done.
- [ ] Progress shows the workout, the best lift and the chart; nothing is a sample number.
- [ ] Delete that workout from History: everything updates.

## 3. Recovery and reliability

- [ ] Mid-workout, swipe the app away in the app switcher (force quit). Reopen: **Resume
      workout** is on Home and every entered value is still there.
- [ ] Complete a set, lock the phone for longer than the rest time, unlock: the rest timer
      shows *Rest over* (it doesn't count on in the background, and doesn't alarm).
- [ ] Complete a set, go to the Home screen for 30 s, come back: the timer shows 30 s less.
- [ ] Double-tap **Complete set** and **Finish** quickly: only one set / one workout is saved.
- [ ] **phone only:** Airplane mode on → full workout (log, finish, history) works.
- [ ] **phone only:** Low Power Mode on → same.

## 4. iPhone behaviour

- [ ] Swipe-back from the left edge works on every pushed screen; sheets close with a
      swipe down and with **Cancel**.
- [ ] With the keyboard open while logging, **Complete set** and **Done** stay visible.
- [ ] Nothing hides behind the notch/Dynamic Island or the home indicator.
- [ ] **phone only:** Settings → Accessibility → Display & Text Size → **Larger Text** at the
      largest size: every screen still works (titles grow less than body text by design).
- [ ] **phone only:** VoiceOver on: every button is announced with a sensible name; the rest
      timer announces *Rest over*; charts can be read point by point and via *Show numbers*.
- [ ] **phone only:** Settings → Accessibility → Motion → **Reduce Motion** on: screen
      transitions follow the system setting (Bodios adds no custom animations).

## 5. Demo videos (19 exercises; the clips have no sound)

- [ ] Nothing autoplays; tap play starts the clip. Pause, replay, 0.5× and the timeline
      work, and it loops.
- [ ] Each clip shows the exercise it's attached to (spot-check a few; the list is in
      Profile → **Video credits**).
- [ ] **phone only:** play music in another app, then play a demo: the music keeps playing.
- [ ] **phone only:** a phone call or Siri while a demo plays: the demo pauses and doesn't
      resume by itself.
- [ ] Full screen opens and **Close** returns to the exercise.
- [ ] Leaving the screen or the app pauses the demo.
- [ ] During a workout, type a weight, complete a set so the rest timer runs, then
      **Watch demonstration** → play → **Done**: your numbers, the done set and the rest
      timer are unchanged.
- [ ] Airplane mode: demos still play (they're built into the app).
- [ ] Dead Bug says *No demo video yet*; Romanian Deadlift says it's shown with dumbbells.

## 6. Data

- [ ] Profile → **Export data** → Save to Files: the file contains your routines and
      workouts in kilograms.
- [ ] Switch to **lb**: all weights display in lb; switch back: identical kg values.
- [ ] Profile → **Delete all data** asks first, then empties routines and history.

Write down anything that fails, with the screen and what you did; that becomes the Stage 7
fix list.
