export const PAYMENT_CONFIG = {
  CODEES: {
    BASE_URL: process.env.CODEES_BASE_URL || 'https://pay.codees-cm.com/api/v1',
    API_KEY: process.env.CODEES_API_KEY || '',
    SECRET_KEY: process.env.CODEES_SECRET_KEY || '',
    // Numéro marchand qui reçoit les fonds (phone_to). Vide = numéro enregistré chez Codees.
    MERCHANT_PHONE: process.env.CODEES_MERCHANT_PHONE || '',
    // Limites imposées par l'API Codees (XAF)
    MIN_AMOUNT: 100,
    MAX_AMOUNT: 500000,
    NETWORKS: {
      MTN: process.env.CODEES_NETWORK_MTN || 'MTN_CM',
      ORANGE: process.env.CODEES_NETWORK_ORANGE || 'ORANGE_CM',
    },
  },
  STRIPE: {
    SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
    MIN_AMOUNT: 350,
  },
};

/**
 * Les clés de test Stripe acceptent des cartes fictives (tok_visa...) :
 * en production, elles permettraient de créditer un solde réel gratuitement.
 */
export function isStripeTestModeForbidden(): boolean {
  return (
    PAYMENT_CONFIG.STRIPE.SECRET_KEY.startsWith('sk_test_') &&
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_TEST_PAYMENTS !== 'true'
  );
}
