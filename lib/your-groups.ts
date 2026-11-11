/**
 * "Your groups": a small list, kept only on this device, of groups the
 * person created or joined, for the home page. Never stores tokens: the
 * real access lives in the httpOnly cookies. Storage can be missing or
 * blocked (private mode, in-app browsers), so every access is guarded.
 */

export type GroupRole = "organizer" | "member";

export interface RememberedGroup {
  slug: string;
  name: string;
  roles: GroupRole[];
  /** Last seen, ms since epoch; newest first on the home page. */
  seenAt: number;
}

const KEY = "mm:groups";
const MAX = 20;
const SLUG = /^[a-z0-9]{6,32}$/;
const ROLE_ORDER: GroupRole[] = ["organizer", "member"];

function isEntry(value: unknown): value is RememberedGroup {
  const v = value as RememberedGroup;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.slug === "string" &&
    SLUG.test(v.slug) &&
    typeof v.name === "string" &&
    Array.isArray(v.roles) &&
    v.roles.every((r) => r === "organizer" || r === "member") &&
    typeof v.seenAt === "number"
  );
}

const CHANGE_EVENT = "mm:groups-change";

/** The raw stored list ("[]" if missing or blocked). A string, so it's a stable snapshot. */
export function groupsSnapshot(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

/** For useSyncExternalStore: changes from this tab and from other tabs. */
export function subscribeGroups(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function parseGroups(raw: string): RememberedGroup[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry).sort((a, b) => b.seenAt - a.seenAt) : [];
  } catch {
    return [];
  }
}

export function readGroups(): RememberedGroup[] {
  return parseGroups(groupsSnapshot());
}

export function writeGroups(list: RememberedGroup[]): void {
  try {
    const kept = list.filter((g) => g.roles.length > 0).slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(kept));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Storage blocked or full: the list is a convenience, so skip it.
  }
}

/** Adds (or refreshes) a group with a role. */
export function rememberGroup(slug: string, name: string, role: GroupRole): void {
  const list = readGroups();
  const existing = list.find((g) => g.slug === slug);
  const roles = new Set<GroupRole>([...(existing?.roles ?? []), role]);
  const entry: RememberedGroup = {
    slug,
    name,
    roles: ROLE_ORDER.filter((r) => roles.has(r)),
    seenAt: Date.now(),
  };
  writeGroups([entry, ...list.filter((g) => g.slug !== slug)]);
}

/** Drops a role (e.g. removed from the group); the group goes when no roles are left. */
export function forgetRole(slug: string, role: GroupRole): void {
  writeGroups(readGroups().map((g) => (g.slug === slug ? { ...g, roles: g.roles.filter((r) => r !== role) } : g)));
}
