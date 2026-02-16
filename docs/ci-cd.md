# CI/CD Pipeline

This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the PMCOL Teaching Tool project.

---

## Overview

The project uses **GitHub Actions** for automated testing, linting, type checking, and building. The CI pipeline runs on every push and pull request to the `sprint-2` and `main` branches, ensuring code quality and preventing regressions before merging.

The pipeline is defined in `.github/workflows/ci.yml` and consists of multiple parallel jobs that validate different aspects of the codebase.

---

## Pipeline Architecture

```
┌─────────────┐
│   Trigger   │  (push/PR to sprint-2 or main)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Setup     │  Install dependencies (npm ci)
└──────┬──────┘
       │
       ├────────────────┬────────────────┬────────────────┐
       ▼                ▼                ▼                ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   Lint   │    │Typecheck │    │   Jest   │    │Playwright│
└──────────┘    └──────────┘    └──────────┘    └──────────┘
       │                │                │                │
       └────────────────┴────────────────┴────────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │    Build     │
                        └──────────────┘
```

---

## Pipeline Stages

### 1. **Setup**
- **Purpose:** Install project dependencies
- **Working Directory:** `app/`
- **Steps:**
  - Checkout code
  - Setup Node.js 20 with npm cache
  - Run `npm ci` for clean dependency installation

### 2. **Lint**
- **Purpose:** Enforce code style and catch common errors
- **Dependencies:** Requires `setup` job
- **Steps:**
  - Run ESLint: `npm run lint`
- **What it checks:**
  - Code formatting consistency
  - TypeScript/JavaScript best practices
  - Potential bugs and anti-patterns

### 3. **Typecheck**
- **Purpose:** Validate TypeScript types without emitting files
- **Dependencies:** Requires `setup` job
- **Steps:**
  - Run TypeScript compiler: `npx tsc --noEmit`
- **What it checks:**
  - Type safety across the codebase
  - Interface compatibility
  - Proper type annotations

### 4. **Jest Tests**
- **Purpose:** Run unit and integration tests
- **Dependencies:** Requires `setup` job
- **Steps:**
  - Run Jest: `npm test`
  - Upload coverage report (if generated)
- **What it tests:**
  - Component logic
  - Service functions
  - API utilities
  - Data transformations

### 5. **Playwright UI Tests**
- **Purpose:** Run end-to-end browser tests
- **Dependencies:** Requires `setup` job
- **Environment Variables:**
  - `NEXT_PUBLIC_SUPABASE_URL` (from secrets)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from secrets)
- **Steps:**
  - Cache Playwright browsers
  - Build the Next.js app: `npm run build`
  - Free port 3000 (self-hosted cleanup)
  - Start Next.js server in background on port 3000
  - Wait for server to be ready (30 attempts, 2s intervals)
  - Run Playwright tests: `npm run test:ui`
  - Stop Next.js server
  - Upload test artifacts and logs
- **What it tests:**
  - User flows (instructor/student journeys)
  - UI interactions
  - Real-time features
  - Authentication flows

### 6. **Build**
- **Purpose:** Verify production build succeeds
- **Dependencies:** Requires `lint`, `typecheck`, `test-jest`, `test-ui`
- **Steps:**
  - Run production build: `npm run build`
- **What it validates:**
  - All code compiles successfully
  - No build-time errors
  - Production bundle is viable

---

## Trigger Conditions

The CI pipeline runs when:

1. **Push** to `sprint-2` or `main` branches
2. **Pull Request** opened/updated against `sprint-2` or `main`
3. **Manual trigger** via `workflow_dispatch`

### Skip CI

To skip CI for a commit (e.g., documentation-only changes), include `[skip ci]` in the commit message:

```bash
git commit -m "Update README [skip ci]"
```

---

## Concurrency Control

The pipeline uses concurrency groups to cancel in-progress runs when new commits are pushed:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

This prevents resource waste and ensures only the latest code is tested.

---

## Runner Configuration

- **Runner Type:** `self-hosted`
- **Working Directory:** `app/` (for all jobs)
- **Node Version:** 20.x
- **Cache:** npm dependencies are cached to speed up runs

---

## Artifacts

The pipeline generates and uploads the following artifacts:

| Artifact Name | Contents | When Uploaded |
|---------------|----------|---------------|
| `jest-coverage` | Code coverage reports | After Jest tests (if coverage exists) |
| `playwright-artifacts` | HTML reports and test results | After Playwright tests (always) |
| `next-start-log` | Next.js server startup logs | After Playwright tests (always) |

Artifacts are available for 90 days by default and can be downloaded from the GitHub Actions run page.

---

## Environment Variables & Secrets

### Required Secrets

The following secrets must be configured in GitHub repository settings:

- `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anonymous key

### Setting Up Secrets

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add each required secret

---

## Local Testing

Before pushing code, you can run the same checks locally:

```bash
cd app

# Install dependencies
npm ci

# Run linter
npm run lint

# Run type checker
npx tsc --noEmit

# Run Jest tests
npm test

# Run Playwright tests
npm run build
npm run start &  # Start server in background
npm run test:ui
```

---

## Troubleshooting

### Port 3000 Already in Use

If the Playwright job fails with port conflicts on self-hosted runners:

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# or
fuser -k 3000/tcp
```

The CI pipeline includes automatic cleanup, but manual intervention may be needed on self-hosted runners.

### Playwright Browser Installation

If browsers are not cached:

```bash
cd app
npx playwright install chromium --no-shell
```

### Failed Build Step

Check the build logs for:
- Missing environment variables
- TypeScript errors
- Import/export issues

---

## Branch Protection Rules

To enforce CI before merging:

1. Go to **Settings** → **Branches** → **Branch protection rules**
2. Add rule for `main` and `sprint-*` branches
3. Enable:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Select required checks: `Lint`, `TypeScript typecheck`, `Jest tests`, `Playwright UI tests`, `Build`

---

## Future Enhancements

Potential improvements to the CI/CD pipeline:

- **Deployment:** Add CD stage to deploy to staging/production
- **Performance Testing:** Add Lighthouse CI for performance regression detection
- **Security Scanning:** Integrate Snyk or Dependabot for vulnerability scanning
- **Docker:** Containerize the application for consistent environments
- **Preview Deployments:** Auto-deploy PR previews to Vercel/Netlify

---

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Playwright CI Guide](https://playwright.dev/docs/ci)
- [Jest Configuration](https://jestjs.io/docs/configuration)
