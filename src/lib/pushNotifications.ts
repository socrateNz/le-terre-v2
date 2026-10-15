/**
 // Gestionnaire des Notifications Push pour Le Terre Digital Arena
 */

export class PushNotificationManager {
  /**
   * Enregistre le Service Worker
   */
  public static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      return reg;
    } catch (error) {
      console.error('[PUSH_NOTIF] Erreur enregistrement Service Worker:', error);
      return null;
    }
  }

  /**
   * Demande la permission de notification au navigateur
   */
  public static async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Vérifie si les notifications sont activées
   */
  public static isSupportedAndGranted(): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    return Notification.permission === 'granted';
  }

  /**
   * Affiche une notification push enrichie
   */
  public static async showNotification(
    title: string,
    options: {
      body: string;
      icon?: string;
      url?: string;
      tag?: string;
    }
  ): Promise<void> {
    if (!this.isSupportedAndGranted()) {
      return;
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();

      const notifOptions: NotificationOptions = {
        body: options.body,
        icon: options.icon || '/favicon.png',
        badge: '/favicon.png',
        tag: options.tag || 'le-terre-notif',
        data: { url: options.url || '/dashboard' },
      };

      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, notifOptions);
      } else {
        new Notification(title, notifOptions);
      }
    } catch (err) {
      console.error('[PUSH_NOTIF] Erreur lors de l\'affichage de la notification:', err);
    }
  }

  // --- NOTIFICATIONS PAR ÉVÉNEMENTS SPÉCIFIQUES ---

  /** 🎲 Un adversaire a rejoint l'arène */
  public static notifyOpponentJoined(opponentUsername: string, gameId: string) {
    this.showNotification('⚔️ Adversaire Rejoint !', {
      body: `${opponentUsername} vient de rejoindre votre arène. La partie commence !`,
      url: `/games/${gameId}`,
      tag: `game-start-${gameId}`,
    });
  }

  /** 🎲 C'est au tour du joueur de lancer les dés */
  public static notifyYourTurn(gameId: string) {
    this.showNotification('🎲 C\'est votre tour !', {
      body: 'À vous de lancer les dés dans l\'arène. Ne faites pas attendre votre adversaire !',
      url: `/games/${gameId}`,
      tag: `game-turn-${gameId}`,
    });
  }

  /** 🏆 Victoire et gain de FCFA */
  public static notifyVictory(amount: number, gameId: string) {
    this.showNotification('🏆 Victoire Éclatante !', {
      body: `Félicitations ! Vous avez remporté le pot de ${amount.toLocaleString()} FCFA !`,
      url: `/games/${gameId}`,
      tag: `game-win-${gameId}`,
    });
  }

  /** 💰 Dépôt confirmé */
  public static notifyDepositSuccess(amount: number) {
    this.showNotification('💰 Dépôt Crédité !', {
      body: `Votre portefeuille Le Terre a été crédité de +${amount.toLocaleString()} FCFA.`,
      url: '/wallet',
      tag: `deposit-success-${Date.now()}`,
    });
  }

  /** ✅ Retrait approuvé par l'admin */
  public static notifyWithdrawalApproved(amount: number) {
    this.showNotification('✅ Retrait Approuvé !', {
      body: `Votre virement de ${amount.toLocaleString()} FCFA a été validé et envoyé sur votre Mobile Money.`,
      url: '/wallet',
      tag: `withdraw-approved-${Date.now()}`,
    });
  }

  /** ❌ Retrait rejeté par l'admin */
  public static notifyWithdrawalRejected(amount: number, reason?: string) {
    const reasonText = reason ? ` Motif : ${reason}.` : '';
    this.showNotification('❌ Demande de Retrait Rejetée', {
      body: `Votre demande de ${amount.toLocaleString()} FCFA a été rejetée.${reasonText} Les crédits ont été restitués sur votre compte.`,
      url: '/wallet',
      tag: `withdraw-rejected-${Date.now()}`,
    });
  }
}
