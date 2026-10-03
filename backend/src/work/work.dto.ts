import { z } from 'zod';

export const CreateWorkItemSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
  assignedTo: z.string().uuid('Invalid assignedTo UUID'),
});

export type CreateWorkItemDto = z.infer<typeof CreateWorkItemSchema>;

export const UpdateWorkItemSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(5).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

export type UpdateWorkItemDto = z.infer<typeof UpdateWorkItemSchema>;

export const AssignWorkSchema = z.object({
  assignedTo: z.string().uuid('Invalid assignedTo UUID'),
  notes: z.string().optional(),
});

export type AssignWorkDto = z.infer<typeof AssignWorkSchema>;

export const WorkTransitionNotesSchema = z.object({
  notes: z.string().optional(),
});

export type WorkTransitionNotesDto = z.infer<typeof WorkTransitionNotesSchema>;
