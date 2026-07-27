export const PAYMENT_CONFIG = {
  NOTCHPAY: {
    BASE_URL: process.env.NOTCHPAY_BASE_URL || 'https://api.notchpay.co',
    PUBLIC_KEY: process.env.NOTCHPAY_PUBLIC_KEY || '',
    PRIVATE_KEY: process.env.NOTCHPAY_PRIVATE_KEY || '',
    WEBHOOK_SECRET: process.env.NOTCHPAY_WEBHOOK_SECRET || '',
    SUPPORTED_CURRENCIES: ['XAF', 'XOF', 'EUR', 'USD'],
  },
  STRIPE: {
    SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
    SUPPORTED_CURRENCIES: ['EUR', 'USD', 'GBP'],
  },
};
