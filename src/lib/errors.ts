import { ZodError } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Non autorisé. Veuillez vous connecter.') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Accès interdit.') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Ressource non trouvée.') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Données d\'entrée invalides.') {
    super(message, 400);
  }
}

export class PaymentError extends AppError {
  constructor(message: string = 'Erreur lors du traitement du paiement.') {
    super(message, 402);
  }
}

/**
 * Message renvoyé au client pour une erreur qui n'est pas une AppError :
 * le détail d'une validation Zod, sinon un message générique (pas de fuite d'erreurs internes).
 */
export function publicErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ZodError) return error.issues[0]?.message || fallback;
  return fallback;
}
