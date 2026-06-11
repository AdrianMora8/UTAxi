import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';

const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function generateOTP(): string {
  return randomInt(100000, 1000000).toString();
}
