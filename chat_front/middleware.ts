import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const requestedPath = request.nextUrl.pathname;
  console.log("hits", requestedPath);
  const allowedRoutes = ['/dashboard', '/ui-components/forms', '/setup-mfa', '/register', '/webbuilder', '/forgot-password', '/admin'];

  // Static assets and files bypass
  if (
    requestedPath.startsWith('/_next/static') ||
    requestedPath.startsWith('/_next/server/') ||
    requestedPath.startsWith('/favicon.ico') ||
    requestedPath.endsWith('.js') ||
    requestedPath.endsWith('.jpg') ||
    requestedPath.endsWith('.png') ||
    requestedPath.endsWith('.jpeg') ||
    requestedPath.endsWith('.gif') ||
    requestedPath.endsWith('.svg')
  ) {
    return NextResponse.next();
  }
  // Allow direct access to fund approval confirmation without authentication
  if (requestedPath.startsWith('/admin/approve-fund-confirmation')) {
    return NextResponse.next();
  }
  console.log(requestedPath)

  const token = request.cookies.get('token');
  const refresh_token = request.cookies.get('refresh_token');
  const admin_token = request.cookies.get('admin_token')
  const admin_refresh_token = request.cookies.get('admin_refresh_token')

  if (requestedPath.startsWith('/login') || requestedPath.startsWith('/register') || requestedPath.startsWith('/forgot-password')) {
    if (token || refresh_token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (requestedPath.startsWith('/admin')){
    console.log("ppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppp")
    if(!admin_token && !admin_refresh_token){
      return NextResponse.redirect(new URL('/login', request.url));
    }
    else{
      return NextResponse.next();
    }
  }

  const isAllowedRoute = allowedRoutes.some((route) => requestedPath.startsWith(route));
  if (!isAllowedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!token && !refresh_token && !admin_token && !admin_refresh_token) {
    const host = request.headers.get('host') || ''; // Dynamically fetch the host
    const protocol = request.headers.get('x-forwarded-proto') || 'https'; // Use forwarded protocol if present
    const loginUrl = new URL(`${protocol}://${host}/login`);
    loginUrl.searchParams.set('next', `${protocol}://${host}${requestedPath}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}