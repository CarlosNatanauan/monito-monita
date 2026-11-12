import { describe, expect, it } from "vitest";
import {
  afterWrongPin,
  hashPin,
  isWellFormedPin,
  PIN_FULL_LOCK_AFTER,
  PIN_LOCK_AFTER,
  PIN_LOCK_MINUTES,
  PIN_UNLOCKED,
  pinLockStatus,
  verifyPin,
  type PinLockState,
} from "@/server/pin";

const T0 = new Date("2026-12-01T10:00:00Z");
const minutes = (n: number) => new Date(T0.getTime() + n * 60_000);

/** `n` wrong tries in a row at time `at`, starting from `state`. */
function wrong(n: number, state: PinLockState = PIN_UNLOCKED, at = T0): PinLockState {
  let s = state;
  for (let i = 0; i < n; i++) s = afterWrongPin(s, at);
  return s;
}

describe("PIN lockout", () => {
  it("uses 5 tries / 15 minutes / 10 tries", () => {
    expect([PIN_LOCK_AFTER, PIN_LOCK_MINUTES, PIN_FULL_LOCK_AFTER]).toEqual([5, 15, 10]);
  });

  it("stays open for the first 4 wrong tries", () => {
    const s = wrong(4);
    expect(s).toEqual({ failedAttempts: 4, lockedUntil: null, lockedAt: null });
    expect(pinLockStatus(s, T0)).toBe("open");
  });

  it("locks for 15 minutes on the 5th wrong try", () => {
    const s = wrong(5);
    expect(s.failedAttempts).toBe(5);
    expect(s.lockedUntil).toEqual(minutes(15));
    expect(s.lockedAt).toBeNull();
    expect(pinLockStatus(s, T0)).toBe("temporary");
    expect(pinLockStatus(s, minutes(14.99))).toBe("temporary");
    // Exactly at 15 minutes it opens again.
    expect(pinLockStatus(s, minutes(15))).toBe("open");
  });

  it("keeps counting after the 15 minutes, and fully locks on the 10th", () => {
    const afterFive = wrong(5);
    const later = minutes(20);
    const nine = wrong(4, afterFive, later);
    expect(nine.failedAttempts).toBe(9);
    expect(pinLockStatus(nine, later)).toBe("open");

    const ten = afterWrongPin(nine, later);
    expect(ten.failedAttempts).toBe(10);
    expect(ten.lockedAt).toEqual(later);
    expect(pinLockStatus(ten, later)).toBe("full");
    // A full lock never expires by itself.
    expect(pinLockStatus(ten, new Date("2030-01-01T00:00:00Z"))).toBe("full");
  });

  it("a full lock wins over a temporary one, and keeps its first time", () => {
    const full = { failedAttempts: 10, lockedUntil: minutes(5), lockedAt: T0 };
    expect(pinLockStatus(full, T0)).toBe("full");
    expect(afterWrongPin(full, minutes(60)).lockedAt).toEqual(T0);
  });

  it("an expired temporary lock reads as open", () => {
    expect(pinLockStatus({ failedAttempts: 5, lockedUntil: minutes(-1), lockedAt: null }, T0)).toBe("open");
  });

  it("unlocked state is open with no tries", () => {
    expect(pinLockStatus(PIN_UNLOCKED, T0)).toBe("open");
    expect(PIN_UNLOCKED.failedAttempts).toBe(0);
  });
});

describe("PIN format and hashing", () => {
  it("accepts exactly 4 ASCII digits", () => {
    for (const pin of ["0000", "1234", "9999"]) expect(isWellFormedPin(pin), pin).toBe(true);
    for (const pin of ["", "123", "12345", "12 4", "abcd", "١٢٣٤", 1234, null]) {
      expect(isWellFormedPin(pin), String(pin)).toBe(false);
    }
  });

  it("hashes with salted scrypt: never the PIN itself, different every time", async () => {
    const [a, b] = await Promise.all([hashPin("1234"), hashPin("1234")]);
    expect(a).toMatch(/^scrypt\$16384\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/);
    expect(a).not.toContain("1234");
    expect(a).not.toBe(b);
  });

  it("verifies the right PIN only", async () => {
    const stored = await hashPin("0420");
    expect(await verifyPin("0420", stored)).toBe(true);
    expect(await verifyPin("0421", stored)).toBe(false);
    expect(await verifyPin("420", stored)).toBe(false);
  });

  it("fails safely with no hash or a malformed one", async () => {
    expect(await verifyPin("1234", null)).toBe(false);
    expect(await verifyPin("1234", "plain-1234")).toBe(false);
    expect(await verifyPin("1234", "scrypt$1$2$3")).toBe(false);
  });

  it("refuses to hash a malformed PIN", async () => {
    await expect(hashPin("12345")).rejects.toThrow();
  });
});
