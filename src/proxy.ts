import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
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
  } = await supabase.auth.getUser();

  // 자동 로그인 해제 + 브라우저 재시작 감지
  // smegym_no_auto_login(영구)은 있지만 smegym_session_active(세션)는 없으면 → 세션 만료
  if (user) {
    const noAutoLogin = request.cookies.get("smegym_no_auto_login")?.value;
    const sessionActive = request.cookies.get("smegym_session_active")?.value;

    if (noAutoLogin && !sessionActive) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const response = NextResponse.redirect(url);
      response.cookies.delete("smegym_no_auto_login");
      return response;
    }
  }

  // 인증이 필요 없는 페이지
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register") ||
    request.nextUrl.pathname.startsWith("/forgot-password");
  // 비밀번호 리셋 관련 API만 비인증 허용 (나머지 API는 인증 필수)
  const isPublicApi =
    request.nextUrl.pathname.startsWith("/api/auth/reset-password") ||
    request.nextUrl.pathname.startsWith("/api/auth/lookup-user") ||
    request.nextUrl.pathname.startsWith("/api/auth/verify-security-answer") ||
    request.nextUrl.pathname.startsWith("/api/auth/signout");

  if (!user && !isAuthPage && !isPublicApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 로그인한 상태에서 인증 페이지 접근 시 대시보드로 리다이렉트
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
