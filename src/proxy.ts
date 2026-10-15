import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, RATE_LIMIT_RULES } from '@/lib/rateLimit';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('token')?.value;

  // 1. RATE LIMITER SUR LES ROUTES D'API (/api/*)
  // Les webhooks (signés) viennent des IP du prestataire : ne pas les limiter
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/webhooks')) {
    const ip = getClientIp(req);
    let rule = RATE_LIMIT_RULES.DEFAULT;
    let categoryKey = 'default';

    if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
      rule = RATE_LIMIT_RULES.AUTH; // 5 requêtes / min
      categoryKey = 'auth';
    } else if (pathname.startsWith('/api/wallet/deposit') || pathname.startsWith('/api/wallet/withdraw')) {
      rule = RATE_LIMIT_RULES.WALLET; // 10 requêtes / min
      categoryKey = 'wallet';
    } else if (pathname.startsWith('/api/games')) {
      rule = RATE_LIMIT_RULES.GAME; // 30 requêtes / min
      categoryKey = 'game';
    }

    const rateKey = `${ip}:${categoryKey}:${pathname}`;
    const { allowed, response, remaining, resetSeconds } = checkRateLimit(rateKey, rule);

    if (!allowed && response) {
      return response;
    }

    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Limit', rule.limit.toString());
    res.headers.set('X-RateLimit-Remaining', remaining.toString());
    res.headers.set('X-RateLimit-Reset', resetSeconds.toString());
    return res;
  }

  // 2. PROTECTION ET REDIRECTIONS DES PAGES DU DASHBOARD
  const protectedRoutes = ['/dashboard', '/profile', '/wallet', '/games', '/admin'];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === '/login' || pathname === '/register') && token) {
    const dashboardUrl = new URL('/dashboard', req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/wallet/:path*',
    '/games/:path*',
    '/admin/:path*',
    '/login',
    '/register',
  ],
};
