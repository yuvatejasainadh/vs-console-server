import { z } from 'zod';
import { UserRole } from '../roles/roles.enum';

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  role: z.nativeEnum(UserRole),
  status: z.enum(['ACTIVE', 'DISABLED']).optional().default('ACTIVE'),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  displayName: z.string().min(2).optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  role: z.nativeEnum(UserRole).optional(),
  password: z.string().min(8).optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
