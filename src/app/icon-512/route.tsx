import { ImageResponse } from 'next/og'

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(145deg, #001a5e 0%, #003082 55%, #0047b3 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 108,
          gap: 0,
        }}
      >
        <div style={{ fontSize: 300, lineHeight: 1, filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.6))' }}>⚽</div>
        <div
          style={{
            color: '#FF6200',
            fontSize: 76,
            fontWeight: 900,
            letterSpacing: 8,
            marginTop: 16,
            fontFamily: 'sans-serif',
            textShadow: '0 4px 16px rgba(0,0,0,0.6)',
          }}
        >
          WK 2026
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  )
}
