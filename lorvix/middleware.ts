import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const baseDomain = process.env.BASE_DOMAIN ?? 'lorvix.com.br'
  const { pathname } = request.nextUrl

  // Refresh Supabase session
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) =>
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          ),
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Admin panel
  if (host === `app.${baseDomain}`) {
    if (!user && pathname !== '/admin/login') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return response
  }

  // Root domain — landing page, no auth needed
  const isRootDomain = host === baseDomain || host === `www.${baseDomain}`
  if (isRootDomain) return response

  // Clinic subdomain — protect dashboard routes
  const subdomainMatch = host.match(
    new RegExp(`^([a-z0-9-]+)\\.${baseDomain.replace('.', '\\.')}$`),
  )

  if (subdomainMatch) {
    const slug = subdomainMatch[1]

    // Public routes don't need auth
    const publicPaths = ['/login', '/agendar', '/api']
    const isPublic = publicPaths.some((p) => pathname.startsWith(p))

    if (!user && !isPublic) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Inject slug as header for server components
    response.headers.set('x-clinic-slug', slug)
    return response
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
