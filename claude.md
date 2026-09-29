# claude.md

Orientation for Claude Code in this repository. `knowledge.md` documents the system;
`agents.md` documents how to work in it. This file is the short version — read it first,
then dip into the others as needed.

## What this is

**DermaLink** — an Expo / React Native app for acne care with two roles in one codebase:
`patient` (AI skin scan → report → consult derma) and `derma` (review and validate AI
reports, manage patients, prescribe). Firebase (Auth + Firestore) and Google Gemini back
it. **All app code is in `StartAss/`; run every command from there.**

## Commands

```bash
cd StartAss
npm start              # Expo dev server
npm run start:clear    # clear Metro cache — use after .env.local / app.json changes
npm run web            # quickest way to validate UI and logic
npm run android | ios  # needed for camera / file-system behaviour
```

No test suite, no linter, no CI. Verify by bundling cleanly and exercising the screen.

## Where things live

- `src/navigation/index.js` — role-based root stack (the entry point for routing questions)
- `src/context/AuthContext.js` — the only global state: `useAuth()` → `{ user, profile, authLoading }`
- `src/firebase/firestore.js` — all Firestore reads/writes and realtime subscriptions
- `src/firebase/gemini.js` — prompts, the `scanResultCache`, the scan lock
- `src/firebase/prescriptions.js` — prescriptions + premium 50% discount codes
- `src/firebase/storage.js` — ImgBB image upload
- `src/theme/colors.js` — every color and gradient; `src/data/constants.js` — IGA labels, FAQs
- `src/screens/patient/*` and `src/screens/derma/*` — separate copies per role

## Conventions

- Plain **JavaScript + JSX**, no TypeScript. Functional components, hooks, `export default`.
- `StyleSheet.create({...})` at the **bottom** of the file; colors only from
  `src/theme/colors.js`; `SafeAreaView` from `react-native-safe-area-context`.
- Firebase in **compat** style (`firebase/compat/app`), timestamps via
  `FieldValue.serverTimestamp`, and `collection.where(...).onSnapshot(...)`.
- `subscribeTo*` helpers guard on a missing id, `console.warn` + fall back to `[]` on
  error, sort by `createdAt?.seconds`, and **return the unsubscribe function** (return it
  from `useEffect`).
- Screens: `useAuth()` for identity, `Alert.alert` for user-facing errors, a loading flag
  to disable buttons while awaiting, `console.warn` (not `log`) for recoverable issues.

## Guardrails

- Do not touch `.env.local`, commit secrets, or hardcode new API keys.
- Do not weaken the Gemini prompts' ban on naming medications, prescriptions, or
  retinoids — the AI gives lifestyle advice; prescribing is the dermatologist's job.
- Remember screens are **duplicated per role** — fix the patient file, the derma file, or
  both, and say which.
- Prefer reusing existing helpers and components over new files or dependencies; confirm a
  package is in `StartAss/package.json` before importing it.
- Stage only the files you changed; other agents and the user share this checkout.
- Ask before adding dependencies, changing the Firestore schema, altering auth/role
  logic, or removing a screen or tab.

Report the files you changed, the command you ran, and anything you couldn't verify.
