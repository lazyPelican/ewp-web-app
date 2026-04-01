# EWP Quote App

A React + Vite quote and estimate application for Engstrom Wood Products.

This project provides a client-side interface for creating cabinetry and finish estimates, storing projects to Supabase, and managing pricing data via an admin panel.

## Key Features

- React app built with Vite
- Supabase authentication for sign-in / sign-up
- Account approval workflow for non-admin users
- Admin panel for pricing management and user approvals
- Quote builder with cabinetry, upgrades, finishing, installation, and summary views
- Project persistence with Supabase `projects` table
- Dark / light theme toggle stored in `localStorage`

## Stack

- React 18
- Vite 5
- Supabase JavaScript client
- JavaScript modules only (no TypeScript)

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root and add the required Supabase variables:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_ADMIN_EMAILS=admin@example.com
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Build for production:

   ```bash
   npm run build
   ```

5. Preview the production build:

   ```bash
   npm run preview
   ```

## Environment Variables

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase public anon key
- `VITE_ADMIN_EMAILS` - Comma-separated list of admin email addresses

## Project Structure

- `index.html` - App shell and Vite entry page
- `package.json` - Project scripts and dependencies
- `vite.config.js` - Vite configuration
- `src/main.jsx` - React root, auth state, approval flow, and app routing
- `src/Auth.jsx` - Sign in / sign up form and theme toggle
- `src/PendingApproval.jsx` - Waiting screen for pending user approval
- `src/App.jsx` - Main estimate builder, project list, and core UX
- `src/AdminPanel.jsx` - Admin pricing editor, user approvals, import/export helpers
- `src/supabase.js` - Supabase client instance
- `src/pricing.js` - Default pricing tables and rate definitions
- `src/global.css` - Global styles
- `public/` - Static assets served by Vite
- `extras/` - Utility files and SQL migrations included with the repo

## How It Works

- Users sign in or sign up via Supabase auth.
- New users are created with a `pending` approval status in the Supabase `user_approvals` table.
- Admin emails defined in `VITE_ADMIN_EMAILS` bypass approval and may see the admin panel.
- Approved users can create new quotes, add rooms, cabinetry items, upgrades, finishing, and installation details.
- Projects are saved to Supabase and can be reopened, duplicated, or deleted.
- Admins can update pricing lookup tables and approve or reject users.

## Notes

- The admin panel loads and saves pricing from the Supabase `pricing` table.
- `src/pricing.js` contains fallback default pricing values used when Supabase is unavailable.
- The app uses local theme persistence via `localStorage` and CSS class toggling.

## Contributing

1. Fork or clone the repository
2. Create a branch for your feature or fix
3. Install dependencies and test locally
4. Open a pull request with a clear description

## License

Use your preferred license here.
