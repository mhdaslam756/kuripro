import type { AuthUser } from "./auth-context";

const STORAGE_KEY = "kuripro_saved_accounts";

export interface SavedAccount {
  id: string;
  email: string;
  name: string;
  role: { id?: string; name: string; slug?: string };
  tenantId: string | null;
  lastLoginAt: number;
}

export function getSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveAccount(user: AuthUser): void {
  if (!user || !user.id) return;
  try {
    const existing = getSavedAccounts();
    const filtered = existing.filter((a) => a.id !== user.id && a.email.toLowerCase() !== user.email.toLowerCase());
    const updated: SavedAccount = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      lastLoginAt: Date.now(),
    };
    const nextList = [updated, ...filtered].slice(0, 8); // Keep up to 8 remembered accounts
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
  } catch {
    // Ignore localStorage write failures
  }
}

export function removeSavedAccount(id: string): void {
  try {
    const existing = getSavedAccounts();
    const nextList = existing.filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
  } catch {
    // Ignore
  }
}

export function clearAllSavedAccounts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
