import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { InstallPwaPrompt } from '@/components/ui/InstallPwaPrompt';

export const metadata: Metadata = {
  title: 'Le Terre | Elite Digital Casino',
  description: 'Plateforme de jeux de dés et d\'arène en temps réel avec portefeuille virtuel.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0F1117',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-[#0F1117] text-[#e2e2eb] selection:bg-[#6C3BFF] selection:text-white">
        <Providers>
          {children}
          <InstallPwaPrompt />
        </Providers>
      </body>
    </html>
  );
}
