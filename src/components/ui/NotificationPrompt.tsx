'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { PushNotificationManager } from '@/lib/pushNotifications';
import toast from 'react-hot-toast';

export function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Initialiser le Service Worker
    PushNotificationManager.registerServiceWorker();

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        // Afficher la bannière de demande si pas encore répondu
        const timer = setTimeout(() => setIsVisible(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleEnable = async () => {
    const res = await PushNotificationManager.requestPermission();
    setPermission(res);
    setIsVisible(false);

    if (res === 'granted') {
      toast.success('Notifications Push activées ! Vous recevrez des alertes de jeu et de retraits.');
      PushNotificationManager.showNotification('🎉 Notifications Activées !', {
        body: 'Vous recevrez désormais des alertes en temps réel lors de vos victoires et retraits.',
        url: '/dashboard',
      });
    } else if (res === 'denied') {
      toast.error('Notifications bloquées dans les paramètres de votre navigateur.');
    }
  };

  if (!isVisible || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-50 bg-[#1A1D26]/95 backdrop-blur-md border border-purple-500/30 p-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-[#6C3BFF] border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bell className="w-5 h-5 text-[#F4B400] animate-bounce" />
        </div>

        <div className="flex-1">
          <h4 className="font-bold text-white text-xs">Activer les Notifications Push 🔔</h4>
          <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">
            Recevez des alerte en temps réel lorsque c&apos;est votre tour de jouer, en cas de victoire ou lors de la validation de vos retraits !
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleEnable}
              className="py-1.5 px-3 rounded-lg gold-gradient text-[#0F1117] font-extrabold text-[11px] flex items-center gap-1 shadow-md hover:opacity-95 transition-all uppercase"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" /> Activer
            </button>

            <button
              onClick={() => setIsVisible(false)}
              className="py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 font-semibold text-[11px] transition-all"
            >
              Plus tard
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
