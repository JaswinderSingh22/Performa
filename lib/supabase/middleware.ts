import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function redirectPreservingCookies(
  req: NextRequest,
  source: NextResponse,
  pathname: string,
  search?: Record<string, string>,
): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  const keys = [...url.searchParams.keys()];
  for (const k of keys) {
    url.searchParams.delete(k);
  }
  if (search) {
    for (const [k, v] of Object.entries(search)) {
      url.searchParams.set(k, v);
    }
  }
  const out = NextResponse.redirect(url);
  source.cookies
    .getAll()
    .forEach((cookie) => out.cookies.set(cookie.name, cookie.value));
  return out;
}

export async function updateSession(req: NextRequest): Promise<NextResponse> {
  const res = NextResponse.next({ request: req });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const devBypass =
    process.env.NODE_ENV === "development" &&
    Boolean(process.env.DEV_ORG_ID?.length);

  const pathname = req.nextUrl.pathname;

  const isProtectedApp =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/employees") ||
    pathname.startsWith("/teams") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/usage") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/reviews") ||
    pathname.startsWith("/notes") ||
    pathname.startsWith("/achievements");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isAuthRoute = pathname === "/login" || pathname === "/signup";

  if (!supabaseUrl || !anonKey) {
    return res;
  }

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasOrg = false;
  let activeRole: string | null = null;
  if (user) {
    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("org_id, role")
      .eq("user_id", user.id);
    const orgIds = (memberships ?? [])
      .map((m) => m.org_id as string | null)
      .filter((v): v is string => Boolean(v));
    hasOrg = orgIds.length > 0;

    const active = req.cookies.get("active_org_id")?.value ?? "";
    const resolved = active && orgIds.includes(active) ? active : orgIds[0] ?? "";
    if (resolved && resolved !== active) {
      res.cookies.set("active_org_id", resolved, {
        path: "/",
        sameSite: "lax",
        httpOnly: true,
      });
    }

    if (resolved) {
      const row = (memberships ?? []).find((m) => (m.org_id as string) === resolved);
      activeRole = (row?.role as string | null) ?? null;
    }
  }

  const isHome = pathname === "/";
  if (isHome) {
    return res;
  }

  if (isOnboarding) {
    if (!user) {
      return redirectPreservingCookies(req, res, "/login", {
        next: "/onboarding",
      });
    }
    if (hasOrg) {
      return redirectPreservingCookies(req, res, "/dashboard");
    }
    return res;
  }

  if (isAuthRoute && user) {
    if (hasOrg) {
      return redirectPreservingCookies(req, res, "/dashboard");
    }
    return redirectPreservingCookies(req, res, "/onboarding");
  }

  if (isProtectedApp) {
    if (!user && devBypass) {
      return res;
    }
    if (!user && !devBypass) {
      return redirectPreservingCookies(req, res, "/login", { next: pathname });
    }
    if (user && !hasOrg) {
      return redirectPreservingCookies(req, res, "/onboarding");
    }

    // Role-based route gating (Phase 2).
    // TL/Manager should not access admin/analytics surfaces.
    if (user && activeRole && (activeRole === "manager" || activeRole === "tl")) {
      const blocked =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/billing") ||
        pathname.startsWith("/usage") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/teams");
      if (blocked) {
        return redirectPreservingCookies(req, res, "/employees");
      }
    }
  }

  return res;
}
