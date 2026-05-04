/**
 * The root URL `/` redirects in middleware (see `lib/supabase/middleware.ts`):
 * guests → `/login`, signed-in without org → `/onboarding`, else → `/dashboard`.
 */
export default function Home(): null {
  return null;
}
