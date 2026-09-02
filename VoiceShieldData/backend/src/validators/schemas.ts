import { z } from 'zod';

export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  admin_otp: z.string().optional(),
});

export const SigninSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  admin_otp: z.string().optional(),
});

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(10, 'Valid refresh token is required'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  new_password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const ScamReportSchema = z.object({
  category: z.enum([
    'IRS_TAX',
    'BANK_IMPERSONATION',
    'FAMILY_EMERGENCY',
    'CEO_FRAUD',
    'TECH_SUPPORT',
    'TELEMARKETING',
    'OTHER',
  ]),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  phone_number: z.string().optional().nullable(),
  detection_request_id: z.string().optional().nullable(),
  threat_severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  accuracy_meters: z.number().positive().optional().nullable(),
  country: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  evidence_files: z.array(z.any()).optional().nullable(),
  consent_given: z.boolean().optional().nullable(),
  network_metadata: z.any().optional().nullable(),
  escalation_status: z.enum(['Draft', 'Ready for Submission', 'Submitted to Authority', 'Case Reference Received', 'Sent', 'Acknowledged', 'Under Review', 'Action Taken']).default('Draft').optional().nullable(),
  law_enforcement_ref: z.string().optional().nullable(),
});

export const LocationEventSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy_meters: z.number().positive().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
});
