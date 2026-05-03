import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: 'linear-gradient(135deg, #5C0018 0%, #9B1040 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
        }}
      >
        <span style={{ color: 'white', fontSize: 18, fontWeight: 700, fontFamily: 'system-ui', lineHeight: 1 }}>
          L
        </span>
      </div>
    ),
    { width: 32, height: 32 },
  )
}
