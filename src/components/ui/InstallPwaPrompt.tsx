'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 p-4 rounded-2xl glass-card border border-purple-500/30 bg-[#1A1D26]/90 backdrop-blur-md shadow-2xl flex items-center justify-between animate-fade-in max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C3BFF] to-[#330098] flex items-center justify-center text-white shadow-lg">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-white text-sm">Installer Le Terre</h4>
          <p className="text-xs text-gray-400">Accès rapide depuis l&apos;écran d&apos;accueil</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-lg gold-gradient font-bold text-xs text-[#0F1117] shadow-md hover:opacity-90 transition-all"
        >
          Installer
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="p-1 rounded-lg text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
