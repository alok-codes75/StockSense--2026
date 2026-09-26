import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getStore, saveStore } from '../models/store.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';
import { OTPService } from '../services/otpService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required.' });
        return;
      }

      const store = getStore();
      const user = store.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials provided.' });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ success: false, message: 'Account is deactivated. Contact an administrator.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid credentials provided.' });
        return;
      }

      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(200).json({
        success: true,
        message: 'Authentication successful.',
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          department: user.department
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Login error', error: err.message });
    }
  }

  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, fullName, role, department } = req.body;
      if (!email || !password || !fullName) {
        res.status(400).json({ success: false, message: 'Name, email and password are required.' });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        return;
      }

      const store = getStore();
      const existing = store.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
      if (existing) {
        res.status(409).json({ success: false, message: 'User with this email already exists.' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userRole: import('../models/types.js').UserRole =
        role === 'INVENTORY_MANAGER' ? 'INVENTORY_MANAGER' : 'WAREHOUSE_STAFF';

      const newUser = {
        _id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        email: email.toLowerCase().trim(),
        passwordHash,
        fullName: fullName.trim(),
        role: userRole,
        department: department || 'Operations',
        isActive: true,
        createdAt: new Date().toISOString()
      };

      store.users.push(newUser);
      saveStore();

      const token = jwt.sign(
        {
          userId: newUser._id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        token,
        user: {
          id: newUser._id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          department: newUser.department
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const store = getStore();
      const user = store.users.find(u => u._id === req.user!.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User profile not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
          createdAt: user.createdAt
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { fullName, department, currentPassword, newPassword } = req.body;
      const store = getStore();
      const user = store.users.find(u => u._id === req.user!.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      if (fullName) user.fullName = fullName.trim();
      if (department) user.department = department.trim();

      if (newPassword) {
        if (!currentPassword) {
          res.status(400).json({ success: false, message: 'Current password is required to set a new password.' });
          return;
        }
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
          res.status(400).json({ success: false, message: 'Current password does not match.' });
          return;
        }
        if (newPassword.length < 8) {
          res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
          return;
        }
        user.passwordHash = await bcrypt.hash(newPassword, 10);
      }

      user.updatedAt = new Date().toISOString();
      saveStore();

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          department: user.department
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async requestPasswordResetOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, message: 'Email address is required.' });
        return;
      }

      const store = getStore();
      const user = store.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

      // Prevent email enumeration while still executing OTP creation if user exists
      if (user) {
        const { otp } = await OTPService.createPasswordResetOTP(user.email);
        // In local development/sandbox or production logs, we provide verification guidance
        console.log(`[StockSense Security OTP Dispatch] One-Time Password for ${user.email}: ${otp}`);

        res.status(200).json({
          success: true,
          message: 'If the email exists in our system, a 6-digit verification code has been dispatched.',
          // Provided in response for seamless sandbox testing
          demoHintOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
        });
      } else {
        res.status(200).json({
          success: true,
          message: 'If the email exists in our system, a 6-digit verification code has been dispatched.'
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async resetPasswordWithOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
        return;
      }

      await OTPService.verifyOTP(email, otp);

      const store = getStore();
      const user = store.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      user.passwordHash = await bcrypt.hash(newPassword, 10);
      user.updatedAt = new Date().toISOString();
      saveStore();

      res.status(200).json({
        success: true,
        message: 'Password successfully updated. You may now log in with your new credentials.'
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}
