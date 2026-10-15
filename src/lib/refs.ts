/** Identifiant d'une référence Mongo sérialisée, qu'elle soit peuplée ({ _id }) ou brute (string). */
export function refId(ref: string | { _id: string } | null | undefined): string | undefined {
  if (!ref) return undefined;
  return typeof ref === 'string' ? ref : ref._id;
}

/** Objet utilisateur d'une référence peuplée, ou undefined si la référence n'est qu'un id. */
export function refUser<T extends object>(ref: string | T | null | undefined): T | undefined {
  return ref && typeof ref === 'object' ? ref : undefined;
}
