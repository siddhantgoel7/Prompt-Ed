# API & Supabase Guide

This project uses a small set of Next.js App Router API endpoints and relies on Supabase for auth, database access, and realtime events. Below is an OpenAPI 3.1 overview plus implementation notes.

## OpenAPI specification

```yaml
openapi: 3.1.0
info:
  title: PMCOL Teaching Tool API
  version: 0.1.0
  description: Minimal server endpoints; most data access happens directly from the browser via Supabase.
servers:
  - url: https://ualberta-cmput401.github.io/W26project-DeptofPharmacology
    description: Deployed site (static; API hosted with the app runtime)
  - url: http://localhost:3000
    description: Local dev server
paths:
  /api/auth/callback:
    get:
      summary: Exchange Supabase OAuth code for a session
      parameters:
        - name: code
          in: query
          required: true
          schema:
            type: string
          description: Authorization code from Supabase OAuth provider
      responses:
        '302':
          description: Redirects to instructor dashboard on success
          headers:
            Location:
              schema:
                type: string
              description: Redirect target (e.g., /instructor_dashboard)
        '302_error':
          description: Redirects to /create_instructor?error=<message> when Supabase returns an error
      security: []
  /api/socket:
    get:
      summary: Placeholder endpoint for Socket.io
      responses:
        '200':
          description: Indicates placeholder or connected state
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
      security: []
```

## Supabase configuration
- Public keys live in `app/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- Browser client factory: `app/src/lib/supabase/client.ts`.
- Server client with cookie-based auth: `app/src/lib/supabase/server.ts`.
- Auth helpers (email/password, Google OAuth redirect to `/api/auth/callback`): `app/src/lib/supabase/auth.ts`.

## Data access (client → Supabase)
These functions call Supabase directly from the frontend using the anon key:
- Courses: `app/src/services/courseService.ts`
- Lessons: `app/src/services/lessonService.ts`
- Discussions: `app/src/services/discussionService.ts`
- Responses: `app/src/services/responseService.ts`

Refer to the TypeScript models in `app/src/types/*.ts` for field names used in the Supabase tables (`courses`, `lessons`, `discussions`, `responses`).

## Realtime
- Channel naming: `lesson:{lessonId}`
- Managed by hook `app/src/lib/realtime/useRealtime.ts` with `broadcast` ack enabled.
- Used for live updates between instructors and students within a lesson.

## Swagger UI preview
- Install deps (once): `cd app && npm install`
- Serve the OpenAPI spec with Swagger UI:  
  ```bash
  cd app
  npm run api:swagger
  ```
  Opens http://127.0.0.1:8080 using `docs/openapi.yaml` with live reload.


## Change log notes
- `/api/auth/callback` uses the **server** Supabase client and awaits `exchangeCodeForSession`.
- OAuth redirects now go through `/api/auth/callback` to ensure cookies are set server-side.
