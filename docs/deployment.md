# Deployment

The PMCOL Teaching Tool is deployed on **Vercel** (frontend + API routes) with **Supabase** as the database and authentication backend. This page covers everything needed to deploy your own instance from scratch.

---

## Prerequisites

Before starting you will need:

- A [Vercel](https://vercel.com) account
- A [Supabase](https://supabase.com) account
- An [OpenAI](https://platform.openai.com) account with an API key
- A [Google AI Studio](https://aistudio.google.com) account with an API key
- The repository pushed to GitHub (Vercel deploys directly from GitHub)

---

## Step 1 — Deploy to Vercel

### 1.1 Import the repository

1. Go to [vercel.com/new](https://vercel.com/new) and click **Import Git Repository**.
2. Select your GitHub repository.
3. Under **Root Directory**, set it to **`app`** — this is where `package.json` and `next.config.ts` live.
4. Framework preset will be detected as **Next.js** automatically.

### 1.2 Add environment variables

Before clicking **Deploy**, add the following environment variables in the Vercel project settings:

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Exposed to the browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Exposed to the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Server-side only — never expose publicly |
| `OPENAI_API_KEY` | Your OpenAI API key | Server-side only |
| `GOOGLE_AI_API_KEY` | Your Google AI Studio API key | Server-side only |

> Do **not** set `NEXT_PUBLIC_DEBUG_TOOLS=true` in production. Leave it unset.

### 1.3 Deploy

Click **Deploy**. Vercel will install dependencies, build the Next.js app, and publish it. The first deploy takes about 2–3 minutes.

---

## Step 2 — Verify the deployment

1. Open your Vercel URL in a browser.
2. Click **Sign In → Continue with Google** and sign in with a `@ualberta.ca` account.
3. Confirm you land on the instructor dashboard without errors.
4. Create a test course and lesson to verify Supabase read/write is working.

---

## Redeployments

### 1. Vercel (Current Production)
Any push to the `main` branch of the [Forked GitHub Repository](https://github.com/W26project-DeptofPharmacology/app) automatically triggers a new Vercel deployment. No manual steps are needed. Pull requests also get a preview deployment URL automatically.
- **Trigger**: `git push origin main`
- **Confirmation**: View the deployment status in the Vercel dashboard under **Deployments**.

### 2. VM / On-Premise (Buxton Labs)
The client intends to host this project on a colleague's VM (Buxton Labs) for a dedicated instance. This requires a manual or automated build-and-start process.

#### 2.1 One-time Setup
1.  **SSH into the VM**: Connect to the Buxton Labs server.
2.  **Clone the Repository**:
    ```bash
    git clone https://github.com/W26project-DeptofPharmacology/app.git
    cd app
    ```
3.  **Install Node.js & Dependencies**:
    ```bash
    npm install
    ```
4.  **Configure Environment Variables**:
    Create a `.env.local` file with the contents from Section 1.2.
5.  **Build the Project**:
    ```bash
    npm run build
    ```

#### 2.2 Process Management (PM2)
To ensure the app remains running after SSH disconnects:
```bash
# Install PM2 globally
npm install -g pm2

# Start the Next.js app
pm2 start npm --name "pmcol-teaching-tool" -- start

# Save process list for auto-restart on reboot
pm2 save
```

#### 2.3 Redeployment on the VM
To update the instance with new code:
```bash
git pull origin main
npm install
npm run build
pm2 restart pmcol-teaching-tool
```

---

## Notes

- **Socket.io**: The real-time session feature uses Socket.io via a Next.js API route (`/api/socket`). This works on Vercel's serverless infrastructure without any additional configuration.
- **PDF processing**: The packages `pdfjs-serverless`, `pdf-parse`, `pdf2pic`, and `@napi-rs/canvas` are listed under `serverExternalPackages` in `next.config.ts` so Vercel bundles them correctly as server-side-only packages.
- **Logs**: View server-side logs (API route errors, AI pipeline output) in the Vercel dashboard under **Deployments → Functions → Logs**.
