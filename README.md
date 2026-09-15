# Bump 🫧

A reminder app for people who hate reminder apps.

> Just tell it what you don't want to forget.

Type `Call Dad tomorrow at 2` and press one button. Bump works out the date, the
time, the emoji, and — if you ask it to — keeps nudging you until it's done.

---

## Running it

```bash
npm install
npx expo start
```

Then press `i` for the iOS simulator, `a` for Android, or scan the QR code with
Expo Go. `npm run web` also works and is useful for quick UI checks.

**To see the finished interface immediately:** open **Settings → Developer →
Load sample reminders**. That populates all four sections plus a few completed
items. (The Developer group only renders in development builds.)

### Notifications on a simulator

Local notifications are delivered by the OS, and simulators are unreliable
about it — iOS Simulator generally does deliver scheduled local notifications,
Android emulators are hit and miss. **Test the Bump chain on a real device.**
Expo Go is fine for this; you do not need a dev build.

### Checks

```bash
npm run typecheck   # tsc --noEmit over the app
npm run lint        # eslint (expo config, flat)
npm test            # 62 unit tests over the parser, domain and scheduler
```

All three are green. `tests/tsconfig.json` type-checks the test files
separately, since they are the only place Node types are in scope.

---

## Architecture

```
app/                      expo-router routes only — thin, no business logic
  _layout.tsx             providers, fonts, onboarding gate, notification deep links
  onboarding.tsx          three pages + personality + permission request
  compose.tsx             full-screen composer (the middle tab button)
  completed.tsx           "Remembered"
  reminder/[id].tsx       detail + inline edit
  (tabs)/                 Today · Add · Settings

src/
  components/             presentational, themed, reusable
  constants/              theme tokens, quick-time presets
  hooks/                  React state: settings, reminders, theme, composer, clock
  services/               the actual logic — no React in here
    parser/               natural language → { title, date, recurrence }
    notificationPlan.ts   *what* to schedule (pure, budget-aware)
    notifications.ts      *how* to schedule it (Expo/OS calls)
    reminders.ts          grouping, completion, snooze, recurrence
    copy.ts               every string that has a voice
    storage.ts            AsyncStorage boundary
    seed.ts               sample data
  types/                  the `Reminder` and `Settings` shapes
  utils/                  dates, ids, emoji, haptics
```

Three rules hold the structure together:

**Services never import React.** `parser/`, `reminders.ts`, `notificationPlan.ts`
and `copy.ts` are pure functions over plain data, which is why they can be unit
tested with `node --test` and no renderer.

**Screens never reach past a hook.** `app/` talks to `useReminders`,
`useSettings` and `useComposer`; those talk to services. Swapping AsyncStorage
for Supabase means rewriting `storage.ts` and the two providers, and nothing else.

**The parser is behind one export.** Everything imports `parseReminderText` from
`@/services/parser`. Replacing it with an LLM call means implementing the same
signature (async) in that one module — no screen knows how parsing happens.

### The parser

`src/services/parser/` is a small ordered-rule scanner rather than a regex
free-for-all. Each rule *claims* the span of text it understood, so later rules
and the title extractor never see text that has already been interpreted. Rules
run in this order: recurrence → relative duration → calendar date → day
reference → clock time → time of day. Whatever is left becomes the title, minus
conversational lead-ins ("remind me to…") and dangling prepositions.

It resolves the genuinely ambiguous cases the way a person would:

| You type | Bump hears |
|---|---|
| `Call Dad tomorrow at 2` | Tomorrow, 2:00 PM — *2 AM is not a real reminder* |
| `Standup at 9` (typed at 10 AM) | 9:00 PM — *the next 9 o'clock* |
| `Take medication every morning at 8` | 8:00 AM daily — *"morning" disambiguates the 8* |
| `Text Sarah Monday morning` (typed Monday 10 AM) | *Next* Monday — *this one already passed* |
| `Book haircut` | Someday — no date invented |

Every parse carries a **confidence**:

- `high` — you gave a time (or a duration). Created instantly, no interruption.
- `medium` — you gave a day but no time. The confirmation sheet opens with the
  guess pre-filled, one tap from accepted.
- `low` — no temporal signal at all. The sheet opens offering times or Someday.

### The Bump chain

Scheduling is split into a pure planner and an OS adapter, because the
interesting part is a **budget problem**: iOS keeps only 64 pending local
notifications per app and silently drops the rest. Eight reminders with
eight-nudge chains would blow through that.

`notificationPlan.ts` therefore allocates in two passes:

1. Every timed reminder gets its own notification. Non-negotiable.
2. The remaining slots go to Bump chains **round-robin by nudge index**, soonest
   reminder first — so under pressure everyone gets nudge #1 before anyone gets
   nudge #2, instead of one reminder eating the budget.

`notifications.ts` then rebuilds the entire OS schedule from scratch — cancel
all, reschedule — on every change and every foreground. At this size that costs
nothing and removes every class of drift bug that incremental cancel/reschedule
logic produces. Completing a reminder simply removes it from the next plan, so
its queued nudges disappear with it.

Copy escalates with the nudge index across five stages, picked deterministically
from `hash(reminderId + nudgeIndex)` — so a given nudge always reads the same
(reschedules don't reshuffle it) while consecutive nudges never repeat a
sentence. All four personalities are covered at every stage.

---

## Limitations of Expo local notifications

These are properties of the platform, not bugs, and they shape what the MVP can
promise:

1. **iOS caps pending notifications at 64 per app.** Handled by the budget
   above, but it is a real ceiling: with 30-minute chains a heavy user's later
   nudges get trimmed. `droppedBumps` in the sync result tracks how many.
2. **There is no "repeat until dismissed" trigger.** A Bump chain is N
   individually-scheduled notifications at fixed offsets. The chain is 8 nudges
   long (4 hours at 30-minute spacing, 24 hours at 3-hour spacing) and is
   re-extended each time the app is opened.
3. **Repeats beyond "every 1 unit" are not expressible.** The OS offers daily /
   weekly / monthly / yearly triggers only. "Every other Friday" and "every 3
   days" fall back to a one-shot for the next occurrence, rebuilt on next
   launch — so a user who never opens the app for weeks gets one occurrence, not
   the full series.
4. **Nothing runs while the app is closed.** Rescheduling only happens on
   foreground. This is why the app re-syncs on every `AppState` change to
   `active`.
5. **Notification action buttons need the app to open** to be handled reliably,
   so Done and Snooze are configured with `opensAppToForeground: true`. It's a
   slightly heavier tap than a silent action, but it always works.
6. **Delivery is not guaranteed to the second.** iOS may batch or delay
   notifications under Low Power Mode, Focus modes, or Scheduled Summary. A user
   with Scheduled Summary on will see Bump's nudges collected rather than
   escalating live.
7. **Simulators are unreliable** for delivery; Android emulators especially.
8. **Permission is one-shot.** If a user denies notifications, Expo cannot
   re-prompt — Settings deep-links them to the OS settings page instead.
9. **Timezone changes don't reschedule automatically.** Absolute dates hold, but
   a user who flies across timezones sees their next foreground re-sync fix it.

---

## The next five features I'd build

1. **LLM parsing behind the existing interface.** The local parser covers the
   common 80% but breaks on "the day before my flight" or "when I get home from
   work". Implement `parseReminderText` against an API, keep the local parser as
   the offline fallback and as the instant preview while typing. Nothing else in
   the app changes — that was the point of isolating it.
2. **Supabase + auth, so reminders survive a new phone.** Right now everything
   is on-device; losing the phone loses everything. The `Reminder` type is
   already a flat serialisable row. Needs an account, a sync queue, and
   last-write-wins conflict handling.
3. **Shared reminders.** "Bump *us* until one of us does it" is the feature
   nobody else has — a reminder with two recipients that stops nudging both when
   either completes it. Depends on (2).
4. **Location and calendar triggers.** "Bring the passport" should fire when you
   pick up your keys, not at 7:30 AM. `expo-location` geofencing plus a
   "before my next event" option covers most of what people actually want and
   costs no new UI surface.
5. **A lock-screen/home-screen widget and a share-sheet capture target.** The
   fastest reminder is the one you never open the app for. An iOS widget with
   the top three items and an "Add" deep link, plus a share extension so you can
   Bump a link or a text message directly.

---

## Before TestFlight

Everything below is required or strongly advised before handing builds to
people outside the team.

**Apple account and identifiers**

- Apple Developer Program membership ($99/yr).
- Register the bundle identifier — currently `com.bump.app` in `app.json`.
  Change it to something you own before the first build; it cannot be changed
  afterwards.
- App Store Connect record for the app (name, primary language, SKU).

**Build pipeline**

- `npm install -g eas-cli`, `eas login`, `eas build:configure`.
- An `eas.json` with at least `preview` (internal distribution) and
  `production` profiles. Not committed yet — generate it with
  `eas build:configure` so it matches your account.
- Let EAS manage signing (distribution certificate + provisioning profile), or
  supply your own.
- Set `ios.buildNumber` and bump it per submission, or enable EAS auto-increment.
- `eas build --platform ios --profile production`, then
  `eas submit --platform ios`.

**Assets and metadata**

- Replace the placeholder icon and splash in `assets/` with real 1024×1024
  artwork (no alpha channel on the App Store icon).
- Screenshots for 6.7" and 6.5" iPhone at minimum.
- App description, keywords, support URL, marketing URL.
- **Privacy policy URL** — required even though the app collects nothing. Say
  so explicitly.

**App Store review requirements**

- Complete the App Privacy questionnaire. Bump's honest answer today is "Data
  Not Collected", which is fast to approve — keep it that way until Supabase
  lands, then update it.
- Add an `NSUserNotificationsUsageDescription`-style rationale in the
  permission priming screen (onboarding already does this; reviewers look for it).
- Export compliance answer (no non-exempt encryption → `ITSAppUsesNonExemptEncryption: false`
  in `ios.infoPlist` saves a round trip on every submission).
- Age rating questionnaire. Note that the **Unhinged** personality is playful
  but shouty — it stays well inside 4+, but read the strings once before
  submitting.

**Engineering gaps to close first**

- **Crash and error reporting.** There is none. Sentry or `expo-insights` before
  strangers use it, otherwise a crash is invisible.
- **A real device pass on the Bump chain.** Schedule a 30-minute chain, lock the
  phone, and confirm escalation and that completing it stops the rest. This is
  the feature the app is named after; it must be verified on hardware.
- **Permission-denied path.** Confirm the app is still coherent and honest when
  notifications are refused (it degrades to a list, and Settings deep-links out).
- **Data migration story.** `storage.ts` merges unknown fields on load, but
  there is no version bump path yet. Add one before shipping a schema change to
  real users.
- **Accessibility pass.** Labels and roles are in place; still needs a
  VoiceOver run and a Dynamic Type check at the larger sizes.
- Decide on analytics — and if you add any, the App Privacy answers change.
