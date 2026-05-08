import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WK Oranje Poule 2026',
    short_name: 'WK Poule',
    description: 'Voorspel WK 2026 wedstrijden, selectie en incidenten',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#003082',
    theme_color: '#003082',
    icons: [
      { src: '/icon-192', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
