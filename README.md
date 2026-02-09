# Admin Portal

React admin dashboard for the project, built with Vite and React Router.

## Setup

1. **Install dependencies**

   ```bash
   cd Admin_Portal
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set your backend URL:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   ```
   VITE_API_URL=http://localhost:5000
   ```

   Ensure the backend is running on the same port (or update the URL).

3. **Run dev server**

   ```bash
   npm run dev
   ```

   App runs at [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — Start Vite dev server (port 3000)
- `npm run build` — Production build
- `npm run preview` — Preview production build
- `npm run lint` — Run ESLint

## Project structure

- `src/layouts/` — Layout components (e.g. `MainLayout`)
- `src/pages/` — Page components (Dashboard, Login, etc.)
- `src/components/` — Reusable UI components
- `src/routes/` — React Router config
- `src/services/` — API client (`api.js`)
- `src/hooks/` — Custom React hooks
- `src/utils/` — Helpers

## API proxy

In development, requests to `/api` are proxied to the backend (see `vite.config.js`). Use `VITE_API_URL` for full URLs when not using the proxy.
