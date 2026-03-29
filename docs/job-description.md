# Job Description: Software Developer — PMCOL Teaching Tool

This document is a ready-to-publish job description for a developer hired to install, maintain, or extend the PMCOL Teaching Tool after the initial project team has finished.

---

## About the Role

The Department of Pharmacology is seeking a software developer to support and evolve the **PMCOL Teaching Tool** — a web-based platform that enables instructors to run AI-assisted live discussion sessions in pharmacology courses. The tool uses large language models to generate discussion prompts from lecture materials and supports real-time anonymous student participation.

The successful candidate will be responsible for deploying and configuring the system, fixing bugs as they arise, and building new features as the department's teaching needs grow.

---

## Responsibilities

- Install, configure, and deploy the application on the department's servers or cloud infrastructure
- Monitor the system and respond to bug reports from instructors and students
- Maintain and update third-party dependencies (Node.js packages, Supabase, AI API integrations)
- Implement new features requested by instructors or department stakeholders
- Write and maintain automated tests (unit, integration, and end-to-end)
- Keep API keys, credentials, and environment variables secure and up to date
- Update documentation when the system changes

---

## Required Skills

### Frontend
- **Next.js 15+** and **React 19** — the entire frontend and API layer is built with Next.js (App Router)
- **TypeScript** — the codebase is fully typed
- **Tailwind CSS v4** — used for all styling
- **Radix UI / shadcn/ui** — component library used throughout the UI
- **React Hook Form + Zod** — used for form validation

### Backend & Infrastructure
- **Supabase** — the project uses Supabase for authentication (Google OAuth), PostgreSQL database, and Row Level Security (RLS) policies; the developer must be comfortable writing SQL migrations and configuring RLS
- **Socket.io** — used for real-time communication during live classroom sessions (server and client)
- **Next.js API Routes** — all backend logic is handled through Next.js server-side route handlers

### AI & Document Processing
- **OpenAI API** — used to generate discussion prompts; requires understanding of prompt engineering and token/cost management
- **Google Generative AI SDK** (`@google/generative-ai`) — used alongside OpenAI for certain AI features
- **LangChain** (`@langchain/core`, `@langchain/textsplitters`) — used for text chunking and AI pipeline orchestration
- **LlamaParse** — used for extracting structured content from uploaded lecture PDFs
- **PDF processing libraries** (`pdf-parse`, `pdfjs-serverless`, `pdf2pic`) — used to extract text and images from uploaded files

### Testing
- **Jest** + **Testing Library** — unit and integration tests
- **Playwright** — end-to-end browser tests

### DevOps & Tooling
- **GitHub Actions** — CI/CD pipeline runs tests and deploys on merge to main
- **ESLint + Prettier** — linting and formatting are enforced in CI
- **MkDocs Material** — documentation site; familiarity with Markdown and YAML configuration is sufficient
- Basic **Linux/bash** skills for server-side deployment and environment setup

---

## Nice to Have

- Experience with Vercel or other Next.js hosting platforms
- Familiarity with pharmacology or university teaching workflows
- Prior experience integrating LLM APIs in production (rate limiting, fallback handling, cost monitoring)
- Experience writing OpenAPI/Swagger specifications

