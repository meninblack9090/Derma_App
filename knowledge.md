# knowledge.md — DermaLink system knowledge base

Durable, factual reference for humans and AI agents working in this repository.
For *how to work* here, see `agents.md` and `claude.md`.

---

## 1. What this is

**DermaLink** (`app.json` name, package `dermalink`, slug `dermalink`) is a two-sided
dermatology mobile app built with **Expo / React Native**, backed by **Firebase**
(Auth + Firestore) and **Google Gemini** for AI skin analysis.

Two roles share one codebase and one navigation root:

| Role | Purpose | Theme |
| --- | --- | --- |
| `patient` | Photo-based acne scan, AI report, book a dermatologist, chat, prescriptions, track progress | Blue (`colors.primary`) |
| `derma` | Review AI reports, validate/modify/reject them, manage patients, appointments, prescriptions | Teal (`colors.teal`) |

The core product loop is: **patient scans face → Gemini produces a structured acne
report → the report is auto-sent to dermatologists → a derma validates or corrects it
→ the patient sees clinician-confirmed findings.**

## 2. Repository layout

```
/                       workspace root (this file, README.md, .freebuff/)
└── StartAss/           the actual Expo app — run all commands from here
    ├── App.js          root component: ErrorBoundary → SafeAreaProvider → AuthProvider → NavigationContainer
    ├── app.json        Expo config (name, slug, icons, bundle ids com.dermalink.app)
    ├── babel.config.js babel-preset-expo
    ├── metro.config.js default Expo config + `.cjs` added to resolver.sourceExts (Firebase v10 ships .cjs)
    ├── jsconfig.json   editor path mapping only (no TypeScript)
    ├── .env.local      local secrets, git-ignored
    ├── assets/         icon, splash, adaptive-icon, favicon, logo
    └── src/
        ├── components/ 3 shared components (analytics dashboard, notification bell, profile avatar)
        ├── context/    AuthContext.js — the only global state
        ├── data/       constants.js (IGA labels, symptom questions, FAQs) + mockData.js (near-duplicate)
        ├── firebase/   all backend access (config, auth, firestore, gemini, prescriptions, storage)
        ├── navigation/ root stack + `PatientTabNavigator` + `DermaTabNavigator`
        ├── screens/    LandingScreen + patient/ (14 screens) + derma/ (9 screens)
        └── theme/      colors.js — single source of palette + LinearGradient presets
```

There is **no** `src/types`, no test directory, no linter config, and no CI. Files are
JavaScript (`.js`) with JSX, ESM `import`/`export`.

## 3. Tech stack

- **Expo SDK ~55**, React 19.2, React Native 0.83, `react-dom` + `react-native-web`
- **Navigation:** `@react-navigation/native` v7 with `stack` and `bottom-tabs`
- **Firebase:** `firebase` **v9 in compat mode** (`firebase/compat/app`, `compat/auth`, `compat/firestore`)
- **AI:** `@google/generative-ai`, model `gemini-1.5-flash`
- **Device APIs:** `expo-image-picker`, `expo-file-system/legacy`, `expo-clipboard`, `expo-linear-gradient`, `async-storage`, `react-native-svg` (charts), `@expo/vector-icons` (Ionicons)
- **Image hosting:** **ImgBB** free API (`src/firebase/storage.js`) — Firebase Storage is initialized but not used for scan uploads

## 4. Running it

```bash
cd StartAss
npm start              # expo start
npm run start:clear    # expo start -c   (clear Metro cache — use after env/config changes)
npm run android | ios | web
npm run start:tunnel   # for physical devices on another network
```

Requires the local `.env.local` (see §5). Expo injects `EXPO_PUBLIC_*` vars into the
client at bundle time, so **restart with `npm run start:clear` after changing them.**

## 5. Environment variables

Read only in `src/firebase/gemini.js`:

```
EXPO_PUBLIC_GEMINI_API_KEY   # preferred (Expo public var)
REACT_APP_GEMINI_API_KEY     # legacy fallback, also accepted
```

If neither is set the app does not crash — Gemini calls return
`{ success: false, error: 'Gemini API key is missing…' }`. A placeholder value of
`YOUR_GEMINI_API_KEY_HERE` is also treated as missing.

**Secrets currently hardcoded in source** (client-side keys, move to env when
convenient): the Firebase web config in `src/firebase/config.js` and the ImgBB API key
in `src/firebase/storage.js`. `.env`, `.env.local`, and `.env.*.local` are git-ignored.

## 6. Firestore data model

`src/firebase/firestore.js` and `prescriptions.js` are the only places that talk to
Firestore. Collections in use:

| Collection | Key fields |
| --- | --- |
| `users/{uid}` | `uid, displayName, email, role ('patient'\|'derma'), plan, phone, gender, createdAt`; derma adds `specialty, licenseNumber, clinic, verified, rating`; aggregates `averageRating, totalReviews`; premium adds `subscriptionExpiresAt` |
| `users/{uid}/scanHistory/{scanId}` | `scanId, imageHash, timestamp (ISO), geminiResult, status` — written by `saveAnalysisToProfile` |
| `skinReports/{id}` | Gemini fields (§8) + `patientId, patientName, status ('Pending'\|'Validated'\|'Rejected'), isValidated, validationRequested, assignedDermaId, validatedBy, validatedAt, dermaNote, rejectionReason, modifiedByDerma, originalAiFindings, dermaNotifications[], sentToDermaAt, createdAt` |
| `dermaNotifications/{id}` | `reportId, dermaId, patientId, patientName, reportData, status ('pending'\|'viewed'\|'responded'), createdAt, viewedAt, respondedAt, dermaResponse ('approved'\|'rejected'\|'needs_more_info'), dermaNote` |
| `dailyScanUsage/{uid_YYYY-MM-DD}` | `userId, scanDateKey, dailyScanCount, lastScanAt, createdAt, updatedAt` — server-side scan quota |
| `scanResultCache/{imageHash}` | `result, cachedAt` — content-addressed Gemini cache |
| `consultations/{id}` | `patientId, patientName, dermaId, dermaName, date, time, type, issue, igaGrade, avatar, status ('upcoming'\|'completed'\|'rejected'), rated, rating, rejectionReason, notes, createdAt` |
| `conversations/{id}` + `messages/{mid}` | conversation: `patientId, dermaId, patientName, dermaName, lastMessage, lastTime, unreadByPatient, unreadByDerma`; message: `senderId, senderRole, text, timestamp, read` |
| `ratings/{id}` | `consultationId, patientId, patientName, dermaId, rating, comment, createdAt` |
| `prescriptions/{id}` | **snake_case**: `patient_id, patient_name, doctor_id, doctor_name, medications[], issued_at, original_price, discount_amount, final_price, has_discount, discount_percent, discount_label, discount_code, discount_expires_at, discount_used, status ('sent'\|'verified'\|'used'\|'expired'), createdAt` |

Timestamps are Firestore `serverTimestamp()`; callers sort with
`(b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)`. Note the **camelCase vs
snake_case split** between `firestore.js` and `prescriptions.js` — keep each module
internally consistent.

## 7. Auth & routing

- `AuthContext` (`src/context/AuthContext.js`) is the single source of truth for
  `{ user, profile, authLoading }`. It subscribes to `users/{uid}` with `onSnapshot`,
  defaults a missing `role` to `'patient'`, and **self-heals** a missing profile
  document via `ensureProfileExists` (re-read → create from Auth metadata → re-subscribe).
  A 15s timeout guarantees `authLoading` eventually resolves.
- `src/navigation/index.js` branches on `profile.role`:
  - no user → `Landing`, `PatientSignIn/SignUp`, `DermaSignIn/SignUp`
  - `patient` → `PatientTabNavigator` + stacked modals: `Result`, `Validation`, `Subscription`, `SymptomChecker`, `Help`
  - `derma` → `DermaTabNavigator`
  - profile missing / unknown role → `ProfileErrorScreen` with a sign-out action
- `src/firebase/auth.js` wraps sign-up/sign-in. `signInDerma` **verifies `role === 'derma'`
  and signs the user out** if it is not, so the derma portal cannot be entered with a
  patient account.
- Demo/entry screens for a role are **duplicated** under `screens/patient/` and
  `screens/derma/` (e.g. `SignInScreen`, `SignUpScreen`, `MessagesScreen`,
  `PrescriptionScreen`, `SettingsScreen`). Editing one does not change the other.

## 8. The scan pipeline (the heart of the app)

`src/screens/patient/ScanScreen.js` → `src/firebase/gemini.js` → `firestore.js`:

1. **Pick image** (`expo-image-picker`, camera or library, quality 0.4, 1:1).
2. **Quota check** — two independent gates:
   - `reserveDailyScanSlot(uid)` runs a Firestore **transaction** on
     `dailyScanUsage/{uid_YYYY-MM-DD}` with `DAILY_SCAN_LIMIT = 2` and returns
     `{ allowed, dailyScanCount, limit }`.
   - An `AsyncStorage` key `scanCount_<uid>_<toDateString()>` mirrors the limit for
     offline/UX messaging.
3. **Scan lock** — `isPatientScanLocked(uid)` returns true while the patient has a
   report with `validationRequested == true` and `isValidated == false`; it blocks
   rescanning until a dermatologist closes the submission.
4. **Analyze** — `analyzeSkinWithGemini(base64, mimeType, userId)`:
   - hashes the base64 with SHA-256 (`crypto.subtle`, djb2 fallback) → `imageHash`
   - looks up `scanResultCache/{imageHash}`; a hit returns `source: 'gemini-cache'`
     with **zero API calls**
   - otherwise calls `gemini-1.5-flash` with `temperature 0.1, topK 1, topP 0.9` and a
     strict JSON-only prompt, strips markdown fences, `JSON.parse`s, then **clamps and
     defaults every field** (igaScore 0–4, confidence/skinScore 0–100, etc.)
   - writes the cache doc and appends to `users/{uid}/scanHistory`
   - returns `{ success, data, source, imageHash }` — it **never throws**; failures come
     back as `{ success: false, error }`
5. **Local fallback** — if Gemini fails, ScanScreen's `generateFallbackDiagnosis()`
   fabricates a randomized report (`analysisSource: 'fallback'`) so the UI always has
   data. Be aware this means *random* results can reach the database; treat it as a
   known product risk.
6. **Persist & fan out** — `uploadScanImage()` pushes the photo to ImgBB, then
   `saveSkinReport()` creates the `skinReports` doc, `requestValidation()` assigns a
   derma, and `sendReportToDerma()` writes one `dermaNotifications` doc per derma plus
   appends to the report's `dermaNotifications` array.

Derma side (`DashboardScreen`, `PatientsScreen`): `subscribeToPendingValidations` drives
the queue; `validateReport`, `rejectReport`, and `modifyAndValidateReport` close it out.
`modifyAndValidateReport` keeps the AI's original values in `originalAiFindings` before
applying clinician overrides — preserve that behavior when touching it.

## 9. Clinical & business constants

- **IGA scale** (`src/data/constants.js`): 0 Clear, 1 Almost Clear, 2 Mild, 3 Moderate,
  4 Severe — with matching color/bg pairs reused across reports and charts.
- **Gemini report fields:** `acneType, severity, igaScore, lesionCount, confidence,
  skinConditions[], affectedArea, recommendation, skinScore, inflammatory,
  nonInflammatory, aiAnalysis`. `inflammatory + nonInflammatory` should sum to 100.
- **Prompt policy:** the Gemini prompts explicitly forbid naming medications,
  prescriptions, antibiotics, or retinoids — the AI gives lifestyle/skincare advice and
  treatment stays with the dermatologist. Do not weaken this without a product decision.
- **Daily scan limit:** 2 per patient per local day.
- **Premium:** determined by `users/{uid}.subscriptionExpiresAt` in the future, checked by
  `checkIsPremium()`. Premium patients get a **50% prescription discount** and a
  `discount_code` of the form `DL-PREM-<first 6 chars of prescription id>` that expires
  after 24h and is single-use (`verifyDiscountCode()` marks it used).
- **Third-party:** `DermatologyPatientAnalyticsDashboard.js` is a standalone, reusable
  chart component with its own sample data — see `StartAss/README.md`.

## 10. Known gaps & gotchas

- **Untyped JS.** No TypeScript, no PropTypes; field shapes are conventions only.
- **No tests, no linter, no CI.** Verification is manual (§4) — see `agents.md` §"Verifying".
- **`src/data/constants.js` and `src/data/mockData.js` are near-duplicates** — both define
  the same `igaLabels`, `symptomQuestions`, and `faqItems` (copy-paste, not a re-export).
  Screens import from one or the other; check the import before editing, and prefer
  `constants.js` for new code.
- **`src/screens/derma/ScheduleScreen.js` is orphaned** — nothing imports it and it is not
  registered in any navigator. Either wire it up or treat it as dead code; don't assume it
  renders anywhere.
- **Gemini API key is bundled client-side** — anyone with the app can extract it. Fine
  for a prototype, not for production; a server-side proxy is the real fix.
- **ImgBB is a third party with no delete support** (`deleteScanImage` is a no-op), so
  scan photos are effectively permanent once uploaded.
- **`firebase/compat` + `experimentalForceLongPolling`** is a deliberate workaround for
  React Native networking; keep it unless you migrate to the modular SDK.
- **Firestore security rules are not in this repo** — data access depends on rules
  configured in the Firebase console (`dermalink45`).
- **`metro.config.js` pushes `.cjs`** to resolve Firebase v10 internals; removing it
  breaks the bundle.
- **Root `README.md` is a UTF-16 file** describing only the analytics dashboard. The real
  app docs live in `StartAss/GEMINI_SETUP.md` and `StartAss/GEMINI_QUICK_REFERENCE.md`
  (note: those mention `REACT_APP_…`/`.env.local` and an older mock-based flow).
- `knowlege.md` at the repo root is an empty file with a typo — superseded by this file.
