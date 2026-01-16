import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const url = request.nextUrl.clone()
  
  // Always allow API routes to pass through
  if (url.pathname.startsWith('/api')) {
    return NextResponse.next()
  }
  
  // Extract subdomain
  const subdomain = host.split('.')[0]
  
  // Route demo subdomain to demo pages
  if (subdomain === 'demo') {
    // If already on demo route, allow it
    if (url.pathname.startsWith('/demo')) {
      return NextResponse.next()
    }
    
    // Redirect root to /demo
    if (url.pathname === '/') {
      url.pathname = '/demo'
      return NextResponse.redirect(url)
    }
    
    // For other paths (except static files), prepend /demo if not already there
    if (!url.pathname.startsWith('/demo') && 
        !url.pathname.startsWith('/_next') &&
        !url.pathname.startsWith('/favicon')) {
      url.pathname = `/demo${url.pathname}`
      return NextResponse.rewrite(url)
    }
  }
  
  // For app subdomain or no subdomain, ensure demo routes are not accessible
  if ((subdomain === 'app' || !host.includes('.')) && url.pathname.startsWith('/demo')) {
    // Redirect to home if trying to access demo on app subdomain
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

