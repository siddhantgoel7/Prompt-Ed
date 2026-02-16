# Run Locally

Use this guide to spin up the Next.js app, configure Supabase, serve the MkDocs docs site, and run tests.

## Prerequisites
- Node.js 18+ and npm
- Python 3.9+ (for MkDocs docs)
- Supabase project with URL and anon key

## App setup (Next.js)
1. Install dependencies  
   ```bash
   cd app
   npm install
   ```
2. Create `app/.env.local` with your Supabase credentials:  
   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=<your-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```
3. Run the dev server (includes API routes under `/api/*`):  
   ```bash
   npm run dev
   ```
4. Production build/start (optional):  
   ```bash
   npm run build
   npm start
   ```

## Docs server (MkDocs)
From the repo root:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install mkdocs-material
mkdocs serve
```
Site is available at http://127.0.0.1:8000 with live reload.

## Swagger UI for the API spec
The OpenAPI file lives at `docs/openapi.yaml`.

```bash
cd app
npm install          # first time, pulls swagger-ui-watcher
npm run api:swagger  # serves http://127.0.0.1:8080 with live reload
```
Stop with Ctrl+C when done.

## Testing
- Unit/integration (Jest):  
  ```bash
  cd app
  npm test          # one-shot
  npm run test:watch
  npm run test:coverage
  ```
- UI tests (Playwright):  
  ```bash
  cd app
  npm run test:ui       # headless
  npm run test:ui:headed
  npm run test:ui:debug
  ```
  Install Playwright browsers first if needed: `npx playwright install --with-deps`.
- Linting:  
  ```bash
  cd app
  npm run lint
  ```

## Notes
- The app uses Supabase auth and database calls directly from the browser (anon key) plus a server-side OAuth callback at `/api/auth/callback`.
- Docs navigation is defined in `mkdocs.yml`; content lives in `docs/`.
