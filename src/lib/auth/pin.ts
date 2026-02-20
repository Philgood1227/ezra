import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPin(pin: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  const incoming = scryptSync(pin, salt, 64);
  const expected = Buffer.from(hash, "hex");

  if (incoming.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(incoming, expected);
}
