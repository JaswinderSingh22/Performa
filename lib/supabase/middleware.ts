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
  if (user) {
    const { data: profileRow } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();
    hasOrg = Boolean(profileRow?.org_id);
  }

  const isHome = pathname === "/";

  if (isHome) {
    if (!user) {
      if (devBypass) {
        return redirectPreservingCookies(req, res, "/dashboard");
      }
      return redirectPreservingCookies(req, res, "/login");
    }
    if (!hasOrg) {
      return redirectPreservingCookies(req, res, "/onboarding");
    }
    return redirectPreservingCookies(req, res, "/dashboard");
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
  }

  return res;
}
