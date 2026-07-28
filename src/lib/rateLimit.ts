import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const ipCache = new Map<string, RateLimitStore>();

// Nettoyage périodique toutes les 5 minutes des anciennes entrées expirées
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of ipCache.entries()) {
    if (now > value.resetTime) {
      ipCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Nombre maximum de requêtes autorisées dans la fenêtre de temps */
  limit: number;
  /** Durée de la fenêtre en secondes */
  windowSeconds: number;
}

/**
 * Configuration des limites logiques par catégorie d'actions
 */
export const RATE_LIMIT_RULES: Record<string, RateLimitConfig> = {
  // Authentification : 5 tentatives par minute (Anti brute-force)
  AUTH: { limit: 5, windowSeconds: 60 },

  // Portefeuille & Transactions : 10 requêtes par minute
  WALLET: { limit: 10, windowSeconds: 60 },

  // Actions de jeu (Dés, Rejoindre) : 30 requêtes par minute
  GAME: { limit: 30, windowSeconds: 60 },

  // API Générale : 100 requêtes par minute (Anti-spam / Anti-DDoS)
  DEFAULT: { limit: 100, windowSeconds: 60 },
};

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Vérifie si le client a dépassé son quota de requêtes
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetSeconds: number; response?: NextResponse } {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  const current = ipCache.get(key);

  if (!current || now > current.resetTime) {
    // Première requête ou fenêtre expirée
    const resetTime = now + windowMs;
    ipCache.set(key, { count: 1, resetTime });

    return {
      allowed: true,
      remaining: config.limit - 1,
      resetSeconds: Math.ceil(windowMs / 1000),
    };
  }

  // Fenêtre en cours
  if (current.count >= config.limit) {
    const resetSeconds = Math.ceil((current.resetTime - now) / 1000);
    const response = NextResponse.json(
      {
        success: false,
        error: `Trop de requêtes. Veuillez patienter ${resetSeconds} seconde(s) avant de réessayer.`,
        retryAfterSeconds: resetSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': resetSeconds.toString(),
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-[#6C3BFF]': '0',
          'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString(),
        },
      }
    );

    return {
      allowed: false,
      remaining: 0,
      resetSeconds,
      response,
    };
  }

  // Incrémenter le compteur
  current.count += 1;
  const remaining = config.limit - current.count;
  const resetSeconds = Math.ceil((current.resetTime - now) / 1000);

  return {
    allowed: true,
    remaining,
    resetSeconds,
  };
}
