-- Retain only organizations on the Pro plan; remove all other orgs and cascaded data.
--
-- Run as a database superuser / service role (e.g. Supabase Dashboard → SQL, or:
--   export DATABASE_URL='postgresql://postgres:...@...:5432/postgres'
--   npm run db:clean-retain-pro
-- )
--
-- Cascades: workspace_members, employees, review cycles, legacy reviews, teams,
-- departments, usage rows, etc. (all FKs → organizations use ON DELETE CASCADE).
--
-- Scope: keeps plan = 'pro' only (case-insensitive). To keep Pro+ too, change
-- the IN list below to ('pro', 'pro_plus').
--
-- Note: This does not delete migration files and does not squash schema history;
-- it only empties non–Pro org data from the database.

BEGIN;

DO $$
DECLARE
  retain_count integer;
  delete_count integer;
BEGIN
  SELECT count(*)::integer INTO retain_count
  FROM public.organizations
  WHERE lower(trim(plan)) IN ('pro');

  IF retain_count = 0 THEN
    RAISE EXCEPTION
      'Abort: no organization with plan ''pro'' exists. Add/upgrade one Pro org first, or widen the retain filter in this script.';
  END IF;

  SELECT count(*)::integer INTO delete_count
  FROM public.organizations
  WHERE lower(trim(plan)) NOT IN ('pro');

  RAISE NOTICE 'Keeping % Pro org(s); deleting % other org(s).', retain_count, delete_count;
END $$;

DELETE FROM public.organizations
WHERE lower(trim(plan)) NOT IN ('pro');

-- Optional: remove app profile rows with no workspace left (users who only had deleted orgs).
-- Uncomment if you want tighter cleanup (safe for typical dev DBs).
-- DELETE FROM public.user_profiles up
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.workspace_members wm WHERE wm.user_id = up.user_id
-- );

COMMIT;
