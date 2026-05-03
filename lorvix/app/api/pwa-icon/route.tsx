import { ImageResponse } from 'next/og'
import { type NextRequest } from 'next/server'

export const runtime = 'edge'

export function GET(req: NextRequest) {
  const size = parseInt(req.nextUrl.searchParams.get('size') ?? '192')
  const radius = Math.round(size * 0.22)
  const fontSize = Math.round(size * 0.46)

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, #5C0018 0%, #9B1040 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius,
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize,
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          L
        </span>
      </div>
    ),
    { width: size, height: size },
  )
}
