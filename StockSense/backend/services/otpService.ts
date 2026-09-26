import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getStore, saveStore } from '../models/store.js';

export class OTPService {
  /**
   * Generates a secure 6-digit numeric OTP and stores its hash with a 15-minute expiry.
   */
  static async createPasswordResetOTP(email: string): Promise<{ otp: string; expiresAt: Date }> {
    const store = getStore();
    const normalizedEmail = email.toLowerCase().trim();

    // Invalidate existing active tokens for this email
    store.passwordResets = store.passwordResets.filter(
      p => !(p.email === normalizedEmail && !p.used && new Date(p.expiresAt) > new Date())
    );

    // Generate secure 6-digit number
    const otpNumber = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otpNumber, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    store.passwordResets.push({
      _id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: normalizedEmail,
      otpHash,
      attempts: 0,
      expiresAt: expiresAt.toISOString(),
      used: false,
      createdAt: new Date().toISOString()
    });

    saveStore();
    return { otp: otpNumber, expiresAt };
  }

  /**
   * Verifies the provided OTP against the stored challenge, enforcing attempt limits and expiration.
   */
  static async verifyOTP(email: string, otp: string): Promise<boolean> {
    const store = getStore();
    const normalizedEmail = email.toLowerCase().trim();
    const challenge = store.passwordResets
      .filter(p => p.email === normalizedEmail && !p.used)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!challenge) {
      throw new Error('No active password reset request found for this email.');
    }

    if (new Date(challenge.expiresAt) < new Date()) {
      throw new Error('Verification code has expired. Please request a new code.');
    }

    if (challenge.attempts >= 5) {
      challenge.used = true;
      saveStore();
      throw new Error('Maximum verification attempts exceeded. Reset challenge revoked.');
    }

    challenge.attempts += 1;
    const isMatch = await bcrypt.compare(otp, challenge.otpHash);

    if (!isMatch) {
      saveStore();
      throw new Error(`Invalid verification code. ${5 - challenge.attempts} attempts remaining.`);
    }

    // Mark as used
    challenge.used = true;
    saveStore();
    return true;
  }
}
