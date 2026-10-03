import { z } from 'zod';

export const CreateTestingObjectiveSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  targetArea: z.string().min(2, 'Target area is required'),
  assignedTo: z.string().min(1).optional(),
});

export type CreateTestingObjectiveDto = z.infer<typeof CreateTestingObjectiveSchema>;

export const UpdateTestingObjectiveSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(5).optional(),
  targetArea: z.string().min(2).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  assignedTo: z.string().min(1).optional(),
});

export type UpdateTestingObjectiveDto = z.infer<typeof UpdateTestingObjectiveSchema>;

export const AssignObjectiveSchema = z.object({
  assignedTo: z.string().min(1, 'Tester ID is required'),
});

export type AssignObjectiveDto = z.infer<typeof AssignObjectiveSchema>;

export const StartTestSessionSchema = z.object({
  objectiveId: z.string().min(1, 'Objective ID is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
  appVersion: z.string().min(1, 'App version is required'),
  androidVersion: z.string().min(1, 'Android version is required'),
});

export type StartTestSessionDto = z.infer<typeof StartTestSessionSchema>;

export const UpdateTestSessionSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'ABANDONED']).optional(),
  endedAt: z.string().optional(),
});

export type UpdateTestSessionDto = z.infer<typeof UpdateTestSessionSchema>;

export const CreateTestSubmissionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  scenarioName: z.string().min(3, 'Scenario name is required'),
  description: z.string().min(5, 'Description is required'),
  expectedResult: z.string().min(3, 'Expected result is required'),
  actualResult: z.string().min(3, 'Actual result is required'),
  outcome: z.enum(['PASS', 'FAIL', 'BLOCKED', 'NOT_TESTED']),
  testerNotes: z.string().optional(),
});

export type CreateTestSubmissionDto = z.infer<typeof CreateTestSubmissionSchema>;

export const UpdateTestSubmissionSchema = z.object({
  scenarioName: z.string().min(3).optional(),
  description: z.string().min(5).optional(),
  expectedResult: z.string().min(3).optional(),
  actualResult: z.string().min(3).optional(),
  outcome: z.enum(['PASS', 'FAIL', 'BLOCKED', 'NOT_TESTED']).optional(),
  testerNotes: z.string().optional(),
});

export type UpdateTestSubmissionDto = z.infer<typeof UpdateTestSubmissionSchema>;

export const ReviewTestSubmissionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_RETEST', 'FEEDBACK']),
  feedback: z.string().min(3, 'Feedback must be at least 3 characters'),
});

export type ReviewTestSubmissionDto = z.infer<typeof ReviewTestSubmissionSchema>;
