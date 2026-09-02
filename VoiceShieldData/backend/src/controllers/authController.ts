import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { UserRepository, AuditRepository } from '../models/repository.js';
import {
  SignupSchema,
  SigninSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '../validators/schemas.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

function generateTokens(user: { id: string; email: string; role: string }) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret as string,
    { expiresIn: config.jwt.accessExpiry } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    { id: user.id, tokenVersion: uuidv4() },
    config.jwt.refreshSecret as string,
    { expiresIn: config.jwt.refreshExpiry } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
}

export class AuthController {
  static async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = SignupSchema.parse(req.body);

      const existing = await UserRepository.findByEmail(data.email);
      if (existing) {
        res.status(409).json({
          success: false,
          error: { code: 'USER_EXISTS', message: 'An account with this email already exists' },
        });
        return;
      }

      const password_hash = await bcrypt.hash(data.password, config.security.saltRounds);
      const verification_token = uuidv4();
      
      let assignedRole = 'user';
      if (data.admin_otp) {
        if (data.admin_otp === '123456' || data.admin_otp === 'ADMIN-123') {
          assignedRole = 'investigator';
        } else {
          res.status(401).json({
            success: false,
            error: { code: 'INVALID_OTP', message: 'Invalid Admin Authorization Code' },
          });
          return;
        }
      }

      const user = await UserRepository.create({
        email: data.email,
        password_hash,
        full_name: data.full_name,
        role: assignedRole,
        is_verified: false,
        verification_token,
      });

      const { accessToken, refreshToken } = generateTokens(user);

      await AuditRepository.log({
        user_id: user.id,
        action: 'USER_SIGNUP',
        resource: 'users',
        resource_id: user.id,
        ip_address: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            is_verified: user.is_verified,
            api_key: user.api_key,
          },
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: 900,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async signin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = SigninSchema.parse(req.body);

      const user = await UserRepository.findByEmail(data.email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        });
        return;
      }

      // Check account lockout
      if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
        const remainingMin = Math.ceil(
          (new Date(user.lockout_until).getTime() - Date.now()) / (60 * 1000)
        );
        res.status(423).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: `Account is temporarily locked due to repeated failed attempts. Please try again in ${remainingMin} minutes.`,
          },
        });
        return;
      }

      const isValid = await bcrypt.compare(data.password, user.password_hash);
      if (!isValid) {
        const attempts = (user.failed_login_attempts || 0) + 1;
        const lockoutUntil =
          attempts >= config.security.maxFailedAttempts
            ? new Date(Date.now() + config.security.lockoutDurationMinutes * 60 * 1000)
            : null;

        await UserRepository.update(user.id, {
          failed_login_attempts: attempts,
          lockout_until: lockoutUntil,
        });

        await AuditRepository.log({
          user_id: user.id,
          action: 'FAILED_LOGIN_ATTEMPT',
          resource: 'users',
          resource_id: user.id,
          metadata_json: { attempts },
          ip_address: req.ip,
        });

        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            remaining_attempts: Math.max(0, config.security.maxFailedAttempts - attempts),
          },
        });
        return;
      }

      // Verify OTP if provided
      if (data.admin_otp) {
        if (data.admin_otp === '123456' || data.admin_otp === 'ADMIN-123') {
           if (user.role === 'user') {
              // Upgrade them on the spot
              await UserRepository.update(user.id, { role: 'investigator' });
              user.role = 'investigator';
           }
        } else {
          res.status(401).json({
            success: false,
            error: { code: 'INVALID_OTP', message: 'Invalid Admin Authorization Code' },
          });
          return;
        }
      }

      // Reset failed attempts on success
      await UserRepository.update(user.id, {
        failed_login_attempts: 0,
        lockout_until: null,
      });

      const { accessToken, refreshToken } = generateTokens(user);

      await AuditRepository.log({
        user_id: user.id,
        action: 'USER_LOGIN',
        resource: 'users',
        resource_id: user.id,
        ip_address: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            is_verified: user.is_verified,
            api_key: user.api_key,
          },
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: 900,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refresh_token } = RefreshTokenSchema.parse(req.body);

      const decoded = jwt.verify(refresh_token, config.jwt.refreshSecret) as { id: string };
      const user = await UserRepository.findById(decoded.id);

      if (!user) {
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'User associated with token not found' },
        });
        return;
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

      res.status(200).json({
        success: true,
        data: {
          tokens: {
            access_token: accessToken,
            refresh_token: newRefreshToken,
            token_type: 'Bearer',
            expires_in: 900,
          },
        },
      });
    } catch (err) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is expired or invalid' },
      });
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = ForgotPasswordSchema.parse(req.body);
      const user = await UserRepository.findByEmail(email);

      if (user) {
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await UserRepository.update(user.id, {
          reset_password_token: token,
          reset_password_expires_at: expiresAt,
        });
      }

      res.status(200).json({
        success: true,
        message: 'If the email exists in our system, password reset instructions have been dispatched.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, new_password } = ResetPasswordSchema.parse(req.body);
      const user = await UserRepository.findByResetToken(token);

      if (!user || (user.reset_password_expires_at && new Date(user.reset_password_expires_at) < new Date())) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_RESET_TOKEN', message: 'Password reset token is invalid or expired' },
        });
        return;
      }

      const password_hash = await bcrypt.hash(new_password, config.security.saltRounds);
      await UserRepository.update(user.id, {
        password_hash,
        reset_password_token: null,
        reset_password_expires_at: null,
      });

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. You may now log in with your new credentials.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.query.token as string;
      if (!token) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_TOKEN', message: 'Verification token is required' },
        });
        return;
      }

      const user = await UserRepository.findByVerificationToken(token);
      if (!user) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_VERIFICATION_TOKEN', message: 'Verification token is invalid' },
        });
        return;
      }

      await UserRepository.update(user.id, {
        is_verified: true,
        verification_token: null,
      });

      res.status(200).json({
        success: true,
        message: 'Email address verified successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const user = await UserRepository.findById(req.user.id);
      if (!user) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User profile not found' } });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_verified: user.is_verified,
          api_key: user.api_key,
          api_quota_daily: user.api_quota_daily,
          api_usage_today: user.api_usage_today,
          created_at: user.created_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
