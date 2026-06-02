# PMCOL Teaching Tool

**Full Documentation:** [MkDocs Site](https://ualberta-cmput401.github.io/W26project-DeptofPharmacology/)
**Demo Vidoe:** [Video](https://drive.google.com/file/d/1rE4iz-V_9jLGCDSnYRiR1ZHTrkuroBhb/view)

The PMCOL Teaching Tool is an interactive, AI-driven educational platform designed for the Department of Pharmacology. It empowers instructors to seamlessly create, host, and manage live classroom sessions while allowing students to join anonymously and answer AI-generated and instructor-curated discussion prompts.

---

## Features

### For Instructors
- **Course & Lesson Management:** Create courses and lessons directly from an authenticated dashboard.
- **AI-Powered Question Generation (RAG Pipeline):**
  - Upload lecture materials (PDF & PPTX). The system automatically parses text, extracts images, and chunks the content securely storing it via `pgvector` embeddings.
  - **Live Speech-to-Text:** Record micro-lectures during a session. OpenAI Whisper transcribes the speech in real-time.
  - **Context-Aware Prompts:** The platform automatically retrieves relevant slide content matching the recent transcription and uses GPT-4o to suggest highly relevant multiple-choice, short-answer, and long-answer questions.
  - Full control to edit, regenerate, or manually publish these AI-created questions to the class.
- **Live Response Dashboard:** View incoming student responses in real-time.

### For Students
- **Zero-Friction Access:** Join sessions anonymously using just a 6-digit PIN. No accounts or personal data required.
- **Engaging UI:** A mobile-first, responsive interface to seamlessly interact with published prompts.
- **Instant Feedback:** Receive immediate correctness feedback on multiple-choice questions once submitted.

---

## Tech Stack

**Frontend & Server Framework:**
- [Next.js (App Router)](https://nextjs.org/) — React framework for UI components and serverless API endpoints.
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first styling with custom glassmorphic and elegant themes.
- [shadcn/ui](https://ui.shadcn.com/) — Accessible component primitives.

**Backend & Infrastructure:**
- [Supabase](https://supabase.com/) — Handling PostgreSQL database, Authentication, Realtime (WebSockets) for live syncing, and Storage for uploaded lecture files.
- `pgvector` — For similarity search against embedded lecture chunks.

**AI Pipeline:**
- **OpenAI API:** GPT-4o (Vision logic for files, intelligent generation), `text-embedding-3-small` (RAG document embeddings), and Whisper (Transcription).
- `pdfjs-serverless` & `jszip` — For robust file and image extraction natively on the server.

**Testing & Quality Assurance:**
- [Playwright](https://playwright.dev/) — End-to-end and UI-level tests.
- [Jest](https://jestjs.io/) — Unit, API, and component testing.

---

## Running Locally

Detailed instructions on running the project locally can be found in the [Run Locally](https://ualberta-cmput401.github.io/W26project-DeptofPharmacology/run-local/) section of the documentation.

1. **Clone the repository.**
2. **Install Dependencies:**
   ```bash
   cd app
   npm install
   ```
3. **Configure Environment Variables:**
   Copy `.env.example` to `.env.local` and fill in your Supabase and OpenAI API keys.
4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

---

## Testing Locally

The project includes unit, acceptance, component, API, and UI automation tests. End-to-end tests use Playwright and automatically provision sample database data via `global-setup.ts`.

All active commands must be run from inside the `app` directory:
```bash
cd app
```

### Quick Commands

- **Run unit, api, and acceptance tests:**
  ```bash
  npm test
  ```
- **Run fast tests in watch mode:**
  ```bash
  npm run test:watch
  ```
- **Generate coverage report:**
  ```bash
  npm run test:coverage
  ```
- **Run Playwright End-to-End Tests (UI):**
  ```bash
  npx playwright test
  ```
  *(Note getting UI tests working requires your local environment variables to include Supabase credentials. Playwright is configured to run automatically in CI on pull requests).*

