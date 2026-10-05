# README.md

## English Vocabulary Coach

A **Next.js** web app that helps you learn English vocabulary (B2‑C1 level) every day. It:
- Generates new words with **Google Gemini**.
- Lets you mark words as *known* or *unknown*.
- Tracks daily learning target, streaks, and progress charts.
- Stores data in **Firebase Firestore** with optional authentication.
- Includes a 5‑minute reminder (you can add a Service Worker later).

### Tech Stack
- **Next.js 13** (React, TypeScript) – front‑end UI
- **Firebase Auth + Firestore** – user management and data storage
- **Google Gemini API** – AI‑generated vocabulary
- **Recharts** – progress bar chart

### Quick Start
1. **Clone / open the folder** (`C:\Users\Sebas\Desktop\english app`).
2. Install dependencies:
   ```bash
   cd "C:/Users/Sebas/Desktop/english app"
   npm install
   ```
3. Create a **Firebase project** and enable:
   - Authentication (email/password)
   - Firestore (Native mode)
   - (optional) Cloud Functions if you want server‑side generation later.
4. Copy `.env.example` to `.env.local` and fill in the values:
   ```text
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   GEMINI_API_KEY=your_gemini_api_key
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```
   Open <http://localhost:3000> in a browser.
6. **Sign up / log in**, set your daily target, and click **Load Words** to fetch fresh vocabulary from Gemini.
7. Mark words you know – the app updates your streak and progress chart.

### Project Structure (important files)
- `pages/_app.tsx` – global app wrapper & auth redirect.
- `pages/login.tsx` – sign‑in / sign‑up UI.
- `pages/index.tsx` – main dashboard (target, word list, streak, chart).
- `pages/api/generateWords.ts` – API route that calls Gemini.
- `components/WordCard.tsx` – UI component for a single word.
- `firebaseConfig.ts` / `firebaseClient.ts` – client‑side Firebase init.
- `firebaseAdmin.ts` – admin init for future server‑side functions.
- `firebase.json` – Firebase Hosting config (if you later deploy).
- `package.json` – dependencies.

### Next Steps / Enhancements
- **Reminder**: add a Service Worker to push a 5‑minute notification while the user is on a bus.
- **Level selector**: let the user choose B2, C1, or mixed before loading words.
- **Seed word list**: import a CSV of curated B2‑C1 vocabulary for fallback.
- **Deploy**: `npm run build && firebase deploy --only hosting,functions`.
- **PWA**: enable offline support with `next-pwa`.

---

If you need any additional feature (e.g., push notifications, custom UI theme, or CI/CD), just let me know and I’ll add the code.
