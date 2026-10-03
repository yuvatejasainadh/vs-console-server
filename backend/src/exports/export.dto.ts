import { z } from 'zod';

export const CreateExportSchema = z.object({
  format: z.enum(['SQL', 'CSV', 'JSON']),
  databaseName: z.string().optional().default('voiceshield_console'),
  schemaName: z.string().optional().default('public'),
  tables: z.array(z.string()).min(1, 'At least one table must be selected'),
});

export type CreateExportDto = z.infer<typeof CreateExportSchema>;
