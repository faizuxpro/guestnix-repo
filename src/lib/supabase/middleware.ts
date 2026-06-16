import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type AuthApiErrorLike = {
  code?: string;
  message?: string;
  name?: string;
  status?: number;
};

function isAuthSessionMissingError(error: AuthApiErrorLike | null) {
  return (
    error?.name === "AuthSessionMissingError" ||
    error?.message === "Auth session missing!"
  );
}

function isMissingRefreshTokenError(error: AuthApiErrorLike | null) {
  return (
    error?.code === "refresh_token_not_found" ||
    error?.message?.includes("Invalid Refresh Token") === true
  );
}

function getSupabaseAuthCookiePrefix() {
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
    const projectRef = host.split(".")[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return null;
  }
}

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  const authCookiePrefix = getSupabaseAuthCookiePrefix();

  request.cookies
    .getAll()
    .filter(({ name }) =>
      authCookiePrefix
        ? name.startsWith(authCookiePrefix)
        : name.startsWith("sb-") && name.includes("auth-token")
    )
    .forEach(({ name }) => {
      request.cookies.delete(name);
      response.cookies.set(name, "", { maxAge: 0, path: "/" });
    });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  const hasMissingRefreshToken = isMissingRefreshTokenError(error);

  if (error && hasMissingRefreshToken) {
    clearSupabaseAuthCookies(request, supabaseResponse);
    console.warn("[auth] Cleared stale Supabase session cookie", {
      code: error.code,
      status: error.status,
      path: request.nextUrl.pathname,
    });
  } else if (error && !isAuthSessionMissingError(error)) {
    console.warn("[auth] Supabase user lookup failed", {
      code: error.code,
      status: error.status,
      message: error.message,
      path: request.nextUrl.pathname,
    });
  }

  // Protected routes: redirect to login if no user
  if (
    !user &&
    request.nextUrl.pathname.startsWith("/dashboard")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    if (hasMissingRefreshToken) {
      url.searchParams.set("reason", "session_expired");
    }
    const redirectResponse = NextResponse.redirect(url);
    if (hasMissingRefreshToken) {
      clearSupabaseAuthCookies(request, redirectResponse);
    }
    return redirectResponse;
  }

  // Auth routes: redirect to dashboard if user exists
  if (
    user &&
    (request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/signup"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
