import { z } from 'zod';

export const CreateDeviceSchema = z.object({
  deviceName: z.string().min(2, 'Device name must be at least 2 characters'),
  modelNumber: z.string().min(1, 'Model number is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  androidVersion: z.string().min(1, 'Android version is required'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
});

export type CreateDeviceDto = z.infer<typeof CreateDeviceSchema>;

export const UpdateDeviceSchema = z.object({
  deviceName: z.string().min(2).optional(),
  modelNumber: z.string().min(1).optional(),
  manufacturer: z.string().min(1).optional(),
  androidVersion: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type UpdateDeviceDto = z.infer<typeof UpdateDeviceSchema>;

export const DeactivateDeviceSchema = z.object({
  reason: z.string().optional(),
});

export type DeactivateDeviceDto = z.infer<typeof DeactivateDeviceSchema>;
