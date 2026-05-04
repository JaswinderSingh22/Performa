import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { safeNextPath } from "@/lib/auth/safe-next-path";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  const nextPath = safeNextPath(searchParams.get("next"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const failUrl = `${origin}/login?message=${encodeURIComponent(
    "Google sign-in could not be completed. Try again or use email.",
  )}`;

  if (!code || !supabaseUrl?.length || !anonKey?.length) {
    return NextResponse.redirect(failUrl);
  }

  const successRedirect = `${origin}${nextPath}`;
  const response = NextResponse.redirect(successRedirect);

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback]", error.message);
    return NextResponse.redirect(failUrl);
  }

  return response;
}
