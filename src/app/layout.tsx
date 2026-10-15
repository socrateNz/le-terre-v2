import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { InstallPwaPrompt } from '@/components/ui/InstallPwaPrompt';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });
const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: 'Le Terre | Élite Digital Arena',
  description: 'Plateforme de jeux de dés et d\'arène en temps réel avec portefeuille FCFA.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
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
    <html lang="fr" className={`dark ${jakarta.variable} ${hanken.variable} ${jetbrains.variable}`}>
      <body className="antialiased min-h-screen bg-[#0F1117] text-[#e2e2eb] selection:bg-[#6C3BFF] selection:text-white">
        <Providers>
          {children}
          <InstallPwaPrompt />
        </Providers>
      </body>
    </html>
  );
}
