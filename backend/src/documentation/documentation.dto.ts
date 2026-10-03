import { z } from 'zod';

export const CreateDocumentationSchema = z.object({
  what_i_did: z.string().min(5, 'what_i_did must be at least 5 characters'),
  why_i_did_it: z.string().min(5, 'why_i_did_it must be at least 5 characters'),
  changes_made: z.string().min(5, 'changes_made must be at least 5 characters'),
  files_affected: z.array(z.string()).default([]),
  problems_encountered: z.string().optional(),
  solution: z.string().optional(),
  testing_performed: z.string().min(5, 'testing_performed must be at least 5 characters'),
  result: z.string().min(3, 'result must be at least 3 characters'),
  next_steps: z.string().optional(),
  references: z.array(z.string()).optional(),
});

export type CreateDocumentationDto = z.infer<typeof CreateDocumentationSchema>;

export const UpdateDocumentationSchema = z.object({
  what_i_did: z.string().min(5).optional(),
  why_i_did_it: z.string().min(5).optional(),
  changes_made: z.string().min(5).optional(),
  files_affected: z.array(z.string()).optional(),
  problems_encountered: z.string().optional(),
  solution: z.string().optional(),
  testing_performed: z.string().min(5).optional(),
  result: z.string().min(3).optional(),
  next_steps: z.string().optional(),
  references: z.array(z.string()).optional(),
});

export type UpdateDocumentationDto = z.infer<typeof UpdateDocumentationSchema>;

export const ReviewDocumentationSchema = z.object({
  action: z.enum(['APPROVE', 'REQUEST_CHANGES', 'FEEDBACK']),
  feedback: z.string().min(3, 'Feedback must be at least 3 characters'),
});

export type ReviewDocumentationDto = z.infer<typeof ReviewDocumentationSchema>;
