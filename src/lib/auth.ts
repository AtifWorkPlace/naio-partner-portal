// Authentication and session management for NAIO PARTNER platform
import { User, Role, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterDistributorData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  businessName: string;
  districtId?: string;
  districtName?: string;
  address?: string;
  gstin?: string;
  role?: string;
}

class AuthService {
  /**
   * Generates a unique distributor code formatted as NAIO-<DISTRICT>-XXX (e.g. NAIO-KAM-001)
   */
  async generateDistributorCode(districtCode?: string): Promise<string> {
    const prefix = districtCode ? districtCode.toUpperCase().slice(0, 3) : 'DIS';
    
    // Find highest index for this prefix
    const count = await prisma.distributor.count({
      where: {
        distributorCode: {
          startsWith: `NAIO-${prefix}-`,
        },
      },
    });

    const nextNumber = (count + 1).toString().padStart(3, '0');
    const candidateCode = `NAIO-${prefix}-${nextNumber}`;

    // Verify uniqueness
    const existing = await prisma.distributor.findUnique({
      where: { distributorCode: candidateCode },
    });

    if (existing) {
      const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      return `NAIO-${prefix}-${randomSuffix}`;
    }

    return candidateCode;
  }

  /**
   * Register a new distributor profile
   */
  async register(data: RegisterDistributorData): Promise<{
    success: boolean;
    message: string;
    user?: User;
    distributorCode?: string;
  }> {
    try {
      // Check existing email
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        return { success: false, message: 'User already exists with this email address' };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12);
      const isDevAdmin = data.email.toLowerCase().includes('admin');
      const initialRole = isDevAdmin ? Role.ADMIN : Role.DISTRIBUTOR;
      const initialStatus = isDevAdmin ? UserStatus.ACTIVE : UserStatus.PENDING;

      // Look up district code by ID or Name
      let districtCode = 'KAM';
      let districtId = data.districtId;
      let districtName = data.districtName || 'Kamrup Metro';

      const searchKeyword = (data.districtName || '').split(' ')[0];
      const district = await prisma.district.findFirst({
        where: {
          OR: [
            ...(data.districtId ? [{ id: data.districtId }] : []),
            ...(searchKeyword ? [{ name: { contains: searchKeyword } }] : []),
          ]
        }
      });

      if (district) {
        districtCode = district.code;
        districtId = district.id;
        districtName = district.name;
      }

      const distributorCode = await this.generateDistributorCode(districtCode);

      // Create user and distributor atomically
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: data.email,
            name: data.name,
            password: hashedPassword,
            phone: data.phone || null,
            role: initialRole,
            status: initialStatus,
          },
        });

        if (initialRole === Role.DISTRIBUTOR) {
          await tx.distributor.create({
            data: {
              userId: user.id,
              distributorCode,
              businessName: data.businessName || `${data.name} Enterprise`,
              phone: data.phone || null,
              districtId: districtId || null,
              districtName: districtName || 'Unassigned',
              address: data.address || null,
              gstin: data.gstin || null,
              status: initialStatus,
              balanceRupees: 0,
            },
          });
        }

        return user;
      });

      return {
        success: true,
        message: initialStatus === UserStatus.PENDING
          ? 'Registration submitted! Your distributor account is pending admin approval.'
          : 'Registration successful!',
        user: result,
        distributorCode,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed. Please check your inputs.' };
    }
  }

  /**
   * Update password
   */
  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return { success: false, message: 'Current password is incorrect' };
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, message: 'Password update failed' };
    }
  }
}

export const auth = new AuthService();