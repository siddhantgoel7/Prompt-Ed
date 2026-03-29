# Required Libraries

This page lists all libraries the PMCOL Teaching Tool depends on, what each one does, and how to install them.

All JavaScript/TypeScript dependencies are managed by **npm** via `app/package.json`. Running `npm install` inside the `app/` directory installs everything in one step — you do not need to install packages individually unless noted otherwise.

---

## System Prerequisites

These must be installed on your machine before running the project.

| Requirement | Minimum Version | Purpose |
|---|---|---|
| Node.js | 18+ | JavaScript runtime for Next.js and all npm packages |
| npm | 9+ | Package manager (ships with Node.js) |
| Python | 3.9+ | Required only to serve the MkDocs documentation site |

---

## Installing All App Dependencies

```bash
cd app
npm install
```

This installs every package listed in `app/package.json` — both runtime dependencies and dev tools.

---

## Runtime Dependencies

These packages are included in the production build.

| Package | Version | Purpose |
|---|---|---|
| `next` | ^16.1.6 | React framework — handles routing, server-side rendering, and API routes |
| `react` / `react-dom` | 19.2.3 | UI rendering |
| `typescript` | 5.9.3 | Static typing (compiled away at build time) |
| `@supabase/supabase-js` | ^2.95.3 | Supabase client — database queries and authentication |
| `@supabase/ssr` | ^0.8.0 | Supabase server-side rendering helpers for Next.js |
| `@supabase/auth-helpers-nextjs` | ^0.15.0 | Supabase auth integration for Next.js middleware |
| `socket.io` | ^4.8.3 | WebSocket server for real-time live session communication |
| `socket.io-client` | ^4.8.3 | WebSocket client (browser side) |
| `openai` | ^6.27.0 | OpenAI API client — used to generate AI discussion prompts |
| `@google/generative-ai` | ^0.24.1 | Google Gemini API client — used in the AI prompt pipeline |
| `@langchain/core` | ^1.1.33 | LangChain core — AI pipeline orchestration |
| `@langchain/textsplitters` | ^1.0.1 | Splits long documents into chunks for LLM processing |
| `llama-parse` | ^0.1.0 | Parses PDFs into structured markdown via the LlamaParse API |
| `pdf-parse` | ^2.4.5 | Extracts plain text from uploaded PDF files |
| `pdfjs-serverless` | ^1.1.0 | PDF rendering in server-side (Node.js) environments |
| `pdf2pic` | ^3.2.0 | Converts PDF pages to images |
| `@napi-rs/canvas` | ^0.1.95 | Native canvas implementation for Node.js (used with PDF rendering) |
| `radix-ui` | ^1.4.3 | Accessible, unstyled UI primitives |
| `tailwind-merge` | ^3.4.0 | Merges Tailwind CSS class names without conflicts |
| `class-variance-authority` | ^0.7.1 | Utility for building variant-based component styles |
| `clsx` | ^2.1.1 | Conditional className utility |
| `lucide-react` | ^0.564.0 | Icon library |
| `next-themes` | ^0.4.6 | Light/dark theme switching |
| `react-hook-form` | ^7.71.1 | Form state management |
| `@hookform/resolvers` | ^5.2.2 | Connects Zod schemas to React Hook Form |
| `zod` | ^4.3.6 | Schema validation for forms and API inputs |
| `recharts` | ^3.8.0 | Chart components (used in analytics/dashboard views) |
| `qrcode` | ^1.5.4 | Generates QR codes for session join links |
| `date-fns` | ^4.1.0 | Date formatting and manipulation |
| `uuid` | ^13.0.0 | Generates unique identifiers |
| `jszip` | ^3.10.1 | Creates ZIP archives (used for exports) |
| `fflate` | ^0.8.2 | Fast compression/decompression |
| `fast-xml-parser` | ^5.3.7 | Parses XML content from document uploads |

---

## Development Dependencies

These are used during development, testing, and CI — they are not included in the production bundle.

| Package | Version | Purpose |
|---|---|---|
| `jest` | ^30.2.0 | Unit and integration test runner |
| `jest-environment-jsdom` | ^30.2.0 | Browser-like DOM environment for Jest |
| `ts-jest` | ^29.4.6 | TypeScript preprocessor for Jest |
| `@testing-library/react` | ^16.3.2 | React component testing utilities |
| `@testing-library/dom` | ^10.4.1 | DOM query helpers |
| `@testing-library/jest-dom` | ^6.9.1 | Custom Jest matchers for DOM assertions |
| `@testing-library/user-event` | ^14.6.1 | Simulates user interactions in tests |
| `@playwright/test` | ^1.58.2 | End-to-end browser testing |
| `eslint` | ^9 | JavaScript/TypeScript linter |
| `eslint-config-next` | 16.1.6 | Next.js-specific ESLint rules |
| `eslint-config-prettier` | ^10.1.8 | Disables ESLint rules that conflict with Prettier |
| `prettier` | ^3.8.1 | Code formatter |
| `tailwindcss` | ^4 | Utility-first CSS framework |
| `@tailwindcss/postcss` | ^4 | PostCSS plugin for Tailwind v4 |
| `shadcn` | ^3.8.4 | CLI for adding shadcn/ui components |
| `swagger-ui-watcher` | 2.1.14 | Serves the OpenAPI spec with live reload |
| `redoc-cli` | ^0.8.5 | Alternative OpenAPI documentation renderer |
| `canvas-confetti` | ^1.9.4 | Confetti animation (celebration effect in UI) |
| `undici` | ^7.22.0 | HTTP client used in test environments |

---

## Documentation Dependencies (Python)

The documentation site uses MkDocs. Install with pip after creating a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install mkdocs-material
```

| Package | Purpose |
|---|---|
| `mkdocs-material` | MkDocs theme — installs MkDocs core and all required plugins |

---

## Playwright Browser Installation

After `npm install`, install the browser binaries that Playwright needs:

```bash
cd app
npx playwright install --with-deps
```

This downloads Chromium, Firefox, and WebKit. The `--with-deps` flag also installs OS-level dependencies (Linux only).
