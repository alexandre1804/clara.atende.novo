import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lorvix — Agendamento',
    short_name: 'Lorvix',
    description: 'Sistema de agendamento inteligente para clínicas',
    start_url: '/agenda',
    display: 'standalone',
    background_color: '#0D0005',
    theme_color: '#5C0018',
    orientation: 'any',
    icons: [
      {
        src: '/api/pwa-icon?size=192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/api/pwa-icon?size=512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['health', 'medical', 'productivity'],
  }
}
