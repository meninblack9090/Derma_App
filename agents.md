# agents.md — working instructions for AI agents in this repo

Applies to any coding agent (Claude Code, Codex, Cursor, Gemini, Freebuff, …) editing
this repository. Read `knowledge.md` for *what the system is*; this file is *how to
change it without breaking it*.

---

## 1. Ground rules

1. **The app lives in `StartAss/`.** All source edits and all npm/Expo commands happen
   there. Repo-root files (`README.md`, `knowledge.md`, `agents.md`, `claude.md`,
   `.freebuff/`) are documentation only.
2. **JavaScript, not TypeScript.** Match the existing style; do not introduce `.ts`/`.tsx`,
   type annotations, or a TS toolchain.
3. **Make the smallest change that solves the problem.** Reuse the existing helpers,
   colors, and navigation over adding new abstractions or dependencies. Confirm a library
   is already in `StartAss/package.json` before importing it.
4. **Never invent a screen, tab, or Firestore collection** without checking §4 first —
   most of what you need already exists.
5. **Do not edit `.env.local`** or commit it. Do not add new hardcoded secrets; if you
   touch an existing hardcoded key, prefer moving it to `EXPO_PUBLIC_*`.
6. **Don't touch `node_modules/`, `dist/`, `.expo/`, or `package-lock.json` by hand.**
7. **Only `git add` the files you changed.** Never `git add -A` or commit unrelated work —
   other agents and the user share this checkout.

## 2. Commands (run from `StartAss/`)

```bash
npm start              # start Metro / Expo dev server
npm run start:clear    # clear cache — required after changing .env.local or app.json
npm run web            # fastest smoke test in a browser
npm run android | ios  # device/emulator
npm run start:tunnel   # physical device on another network
```

There is no `npm test`, no `npm run lint`, and no build step. Don't promise test output
you can't produce.

## 3. Verifying your change

Because there is no automated suite, verify like this:

1. `cd StartAss && npm run start:clear` and confirm Metro bundles **without errors**
   (a red screen or "Unable to resolve module" means the change is broken).
2. Exercise the affected flow — `npm run web` is usually enough for layout, logic, and
   Firestore calls; use `android`/`ios` for camera, `expo-image-picker`, and
   `expo-file-system`.
3. For UI work, open the relevant tab as the correct role and confirm nothing regressed
   at the edges (empty lists, `null` profile, missing API key).
4. If a change spans both roles, test **patient and derma** separately — they share
   components but have separate screens.

State explicitly in your summary what you ran and what you could not verify.

## 4. Codebase map — where to make each kind of change

| Change | File(s) |
| --- | --- |
| App shell, providers, global error boundary | `App.js` |
| Which screens exist / role routing | `src/navigation/index.js` |
| Tab bar entries (patient) | `src/navigation/PatientTabNavigator.js` |
| Tab bar entries (derma) | `src/navigation/DermaTabNavigator.js` |
| Auth state, profile self-heal | `src/context/AuthContext.js` |
| Sign-up / sign-in / sign-out / reset | `src/firebase/auth.js` |
| Firestore reads & writes, realtime listeners | `src/firebase/firestore.js` |
| Gemini prompts, caching, scan lock | `src/firebase/gemini.js` |
| Prescriptions, premium discount, code verify | `src/firebase/prescriptions.js` |
| Image upload (ImgBB) | `src/firebase/storage.js` |
| Palette, gradients | `src/theme/colors.js` |
| IGA labels, symptom questions, FAQs | `src/data/constants.js` |
| Shared widgets | `src/components/*` |

Patient screens: `Home, Scan, Consultation, Prescription, Messages, SkinReport, Settings,
Landing + Result, Validation, Subscription, SymptomChecker, Help, SignIn, SignUp`.
Derma screens: `Dashboard, Patients, Prescription, Messages, Appointments, Settings,
SignIn, SignUp` — plus `ScheduleScreen`, which is orphaned (not imported by any navigator).

**Screens are duplicated per role.** `screens/patient/MessagesScreen.js` and
`screens/derma/MessagesScreen.js` are different files; the same goes for `SignInScreen`,
`SignUpScreen`, `PrescriptionScreen`, `SettingsScreen`. Change the right one — or both if
the fix is genuinely shared — and say which you touched.

## 5. Conventions to follow

**Imports** — React first, then `react-native`, then third-party, then local
(`../../theme/colors`, `../../firebase/…`, `../../context/AuthContext`). Firebase is
imported in **compat** style only:

```js
import firebase from 'firebase/compat/app';
import { db } from './config';
const TS = firebase.firestore.FieldValue.serverTimestamp;
```

**Components** — `export default function ScreenName({ navigation })`, hooks at the top,
helper components and `const` data declared *above* the default export, and
`const styles = StyleSheet.create({...})` at the **bottom of the file**. Screens use
`SafeAreaView` from `react-native-safe-area-context` (not the RN one).

**Styling** — pull every color from `src/theme/colors.js` (`colors.primary`,
`colors.teal`, `colors.slate500`, …) and gradients from `gradients`; do not sprinkle new
hex literals. Inline styles are tolerated for one-off layout, but a repeated style belongs
in the `StyleSheet`.

**Firestore helpers** — the established shape:

```js
export const subscribeToThing = (id, callback) => {
  if (!id) { callback([]); return () => {}; }      // guard: no id → immediate empty
  return db.collection('things').where('owner', '==', id).onSnapshot(
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      callback(docs);
    },
    (err) => { console.warn('subscribeToThing:', err.message); callback([]); },  // never throw
  );
};
```

- `subscribeTo*` **returns the unsubscribe function** — always `return unsub` from the
  `useEffect` that calls it.
- `onSnapshot` error handlers call `console.warn` and degrade to an empty list; don't
  surface raw Firestore errors to users.
- Mutations are `async` named exports (`bookConsultation`, `validateReport`, …).
- Only `src/firebase/*` touches Firestore or Firebase. Screens import those helpers.
- Match the module's existing field naming: `firestore.js` is camelCase,
  `prescriptions.js` is snake_case.

**Async UI** — wrap awaits in `try/catch`, use `Alert.alert` for user-facing failures, use
a loading flag to disable the button while in flight (see `ScanScreen.handleScan`), and
`console.warn` (not `console.log`) for recoverable problems.

**AI/medical content** — keep the prompts' prohibition on naming medications, drugs,
antibiotics, or retinoids. The AI gives causes and lifestyle advice; only a dermatologist
prescribes. Don't silently relax this to "make the output more helpful".

## 6. Boundaries

- **Ask before:** adding a dependency, changing the Firestore schema in a way that breaks
  existing documents, changing auth/role behavior, touching Firestore security rules, or
  removing a screen or tab.
- **Never:** commit `.env*`, hardcode a new API key, run `git push`/`git reset --hard`/
  `git checkout .`, delete files you didn't create, or rewrite `package-lock.json`.
- **Flag, don't silently fix:** the `constants.js`/`mockData.js` duplication, the
  randomized `generateFallbackDiagnosis()` in `ScanScreen`, client-side API keys, and the
  missing security rules. These are product/security decisions, not casual refactors.

## 7. Definition of done

- The change is complete and consistent across the flows it touches (patient *and* derma
  if shared).
- Metro bundles cleanly and you've exercised the affected screen(s).
- No new hardcoded secrets, no unused imports, no leftover debug `console.log`s.
- Your summary names the files changed, the commands you ran, and anything unverified.
