import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { getStore, saveStore, resetDatabase } from '../models/store.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export class UserController {
  static async listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = getStore();
      const users = store.users.map(u => ({
        id: u._id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        department: u.department,
        isActive: u.isActive,
        createdAt: u.createdAt
      }));
      res.status(200).json({ success: true, data: users });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password, fullName, role, department } = req.body;
      if (!email || !password || !fullName || !role) {
        res.status(400).json({ success: false, message: 'Email, password, full name, and role are required.' });
        return;
      }

      const store = getStore();
      const normalizedEmail = email.toLowerCase().trim();
      if (store.users.some(u => u.email === normalizedEmail)) {
        res.status(409).json({ success: false, message: 'User with this email already exists.' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userRole: import('../models/types.js').UserRole =
        role === 'INVENTORY_MANAGER' ? 'INVENTORY_MANAGER' : 'WAREHOUSE_STAFF';

      const newUser = {
        _id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        email: normalizedEmail,
        passwordHash,
        fullName: fullName.trim(),
        role: userRole,
        department: department || 'Warehouse Operations',
        isActive: true,
        createdAt: new Date().toISOString()
      };

      store.users.push(newUser);
      saveStore();

      res.status(201).json({
        success: true,
        message: 'User account created.',
        data: {
          id: newUser._id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          department: newUser.department,
          isActive: newUser.isActive
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async toggleUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const store = getStore();
      const user = store.users.find(u => u._id === id);

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      if (user._id === req.user!.userId) {
        res.status(400).json({ success: false, message: 'Cannot deactivate your own logged-in account.' });
        return;
      }

      user.isActive = !user.isActive;
      saveStore();

      res.status(200).json({
        success: true,
        message: `User status changed to ${user.isActive ? 'Active' : 'Inactive'}.`,
        data: { id: user._id, isActive: user.isActive }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async resetData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      resetDatabase();
      res.status(200).json({
        success: true,
        message: 'Database has been reset to baseline master seed data with fresh sample products and ledger entries.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
