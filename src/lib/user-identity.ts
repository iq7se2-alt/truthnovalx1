// سيد الحقيقة — User identity (no registration, localStorage-based)

const USER_ID_KEY = "truth_user_id";
const NICKNAME_KEY = "truth_nickname";

/** Generate a UUID v4. */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Get or create a persistent user ID. */
export function getUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

/** Get stored nickname (or null if not set). */
export function getNickname(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NICKNAME_KEY);
}

/** Set nickname. */
export function setNickname(nickname: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NICKNAME_KEY, nickname);
}

/** Check if user has completed onboarding (has both ID + nickname). */
export function isOnboarded(): boolean {
  return !!getUserId() && !!getNickname();
}

/** Clear all user data (for debugging). */
export function clearUserIdentity(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(NICKNAME_KEY);
}
