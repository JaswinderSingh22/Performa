-- Middleware and clients query `public.users` WHERE id = auth.uid() to detect onboarding state.
-- `users_select_org` alone does not reliably allow selecting one's own row (recursive EXISTS).
-- Reading own profile must always succeed for authenticated users.

drop policy if exists users_select_self on public.users;

create policy users_select_self
on public.users
for select
to authenticated
using (id = auth.uid());
