import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Le Terre - Elite Digital Casino',
    short_name: 'Le Terre',
    description: 'Plateforme de jeux de dés et arènes d\'affrontement entre utilisateurs en temps réel avec portefeuille virtuel.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F1117',
    theme_color: '#0F1117',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
