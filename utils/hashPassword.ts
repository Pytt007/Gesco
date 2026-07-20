/**
 * utils/hashPassword.ts
 * Hash SHA-256 côté client — à des fins de validation locale uniquement.
 * ⚠️  Ne jamais utiliser ce hash pour stocker des mots de passe en production.
 *     L'authentification sécurisée est gérée par Supabase Auth.
 */
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
