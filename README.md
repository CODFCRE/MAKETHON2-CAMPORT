# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      //// Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Run with Docker

1. Copy `.env.example` to `.env` and set `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY`. Set `SIGHTENGINE_API_USER` and
   `SIGHTENGINE_API_SECRET` to enable media moderation.
2. Set any frontend values you use (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, and `VITE_GOOGLE_MAPS_API_KEY`) in `.env`.
   These are embedded in the frontend at build time, so rebuild the web image
   after changing them.
3. Build and start both containers:

   ```sh
   docker compose up --build
   ```

The app is available at http://localhost:8080. Docker Compose proxies `/api`
and `/health` requests to the Express API. Stop the containers with
`docker compose down`. If port 8080 is already in use, set `CAMPORT_PORT` in
`.env` to a free port before starting the stack.

## Marketplace, credits and cycle passes

After applying [`supabase/reset_and_schema.sql`](./supabase/reset_and_schema.sql),
run [`supabase/earn_credits_and_rentals.sql`](./supabase/earn_credits_and_rentals.sql)
in the Supabase SQL editor. The reset script is destructive; back up data before
running it. The earn migration creates private report evidence storage, credit
wallets and ledger entries, reviewer permissions, the cycle catalog and plans,
and database functions for food orders, report review, and cycle rentals.
The frontend reads menu items from active `food_stores` and `food_products`;
add those records through Supabase before food listings appear. Food order
totals are calculated from the current product price by the database.
Cycle owners can use the renter dashboard to upload a cycle photo, model,
gearing type, description, hourly rate, and pickup location. Available listings
are shown in Services and are locked when booked.

The cycle catalog and default pass plans are seeded by the SQL scripts. Update
`cycle_service_catalog` and `cycle_subscription_plans` in Supabase to change
their names, prices, limits, duration, or availability; the frontend reads those
values rather than defining them locally.

To authorize a reviewer, an administrator inserts their authenticated user ID
into `public.garbage_report_reviewers`; the migration includes the SQL template.
Reports require a photo, GPS location, and description, and earn credits only
after reviewer approval. Cycle rental pricing and the credit conversion are
configured in `cycle_service_catalog`.

Pass details and allowances are configured in `cycle_subscription_plans`.
Pass activation is demo-only and does not charge users; real subscription
checkout is not connected. Cycle listings and requests are saved, but in-app
owner/customer messaging and fulfillment tracking are not connected yet.

For Vercel, the browser app uses `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. The anon key is public and protected by RLS; never
use a Supabase service-role key in a `VITE_` variable or browser code.
