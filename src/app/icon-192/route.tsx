import { ImageResponse } from 'next/og'

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#003082',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 120,
          borderRadius: 36,
        }}
      >
        ⚽
      </div>
    ),
    { width: 192, height: 192 },
  )
}
