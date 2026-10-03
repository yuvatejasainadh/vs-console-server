export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'VoiceShield Console API',
    version: '1.0.0',
    description:
      'Authoritative internal engineering, testing operations, developer documentation, compatible device management, and privileged PostgreSQL RDS administration API for VoiceShield Console.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'VoiceShield API v1 Base',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT access token obtained from /auth/login',
      },
    },
    schemas: {
      StandardResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              pageSize: { type: 'integer', example: 25 },
              total: { type: 'integer', example: 100 },
              totalPages: { type: 'integer', example: 4 },
            },
          },
          requestId: { type: 'string', example: 'req_8f12a3bc-1b2c-4d5e-9f0a-1234567890ab' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'FORBIDDEN' },
              message: { type: 'string', example: 'You do not have permission to perform this action.' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
          requestId: { type: 'string', example: 'req_8f12a3bc-1b2c-4d5e-9f0a-1234567890ab' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          displayName: { type: 'string' },
          role: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TESTER'] },
          status: { type: 'string', enum: ['ACTIVE', 'DISABLED'] },
        },
      },
      WorkItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          status: {
            type: 'string',
            enum: [
              'ASSIGNED',
              'ACCEPTED',
              'IN_PROGRESS',
              'DOCUMENTATION_SUBMITTED',
              'CHANGES_REQUESTED',
              'APPROVED',
              'COMPLETED',
            ],
          },
          assigned_to: { type: 'string', format: 'uuid' },
          assigned_by: { type: 'string', format: 'uuid' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      DeveloperDocument: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          work_id: { type: 'string', format: 'uuid' },
          author_id: { type: 'string', format: 'uuid' },
          what_i_did: { type: 'string' },
          why_i_did_it: { type: 'string' },
          changes_made: { type: 'string' },
          files_affected: { type: 'array', items: { type: 'string' } },
          problems_encountered: { type: 'string' },
          solution: { type: 'string' },
          testing_performed: { type: 'string' },
          result: { type: 'string' },
          next_steps: { type: 'string' },
          references: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED'] },
          version: { type: 'integer', example: 1 },
        },
      },
      Device: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          device_name: { type: 'string' },
          model_number: { type: 'string' },
          manufacturer: { type: 'string' },
          android_version: { type: 'string' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      TestingObjective: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          target_area: { type: 'string' },
          assigned_to: { type: 'string', format: 'uuid' },
          created_by: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'] },
        },
      },
      TestSubmission: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          session_id: { type: 'string', format: 'uuid' },
          objective_id: { type: 'string', format: 'uuid' },
          tester_id: { type: 'string', format: 'uuid' },
          device_id: { type: 'string', format: 'uuid' },
          scenario_name: { type: 'string' },
          description: { type: 'string' },
          expected_result: { type: 'string' },
          actual_result: { type: 'string' },
          outcome: { type: 'string', enum: ['PASS', 'FAIL', 'BLOCKED', 'NOT_TESTED'] },
          tester_notes: { type: 'string' },
          status: {
            type: 'string',
            enum: [
              'ASSIGNED',
              'ACCEPTED',
              'IN_PROGRESS',
              'SUBMITTED',
              'UNDER_REVIEW',
              'APPROVED',
              'RETEST_REQUIRED',
              'CLOSED',
            ],
          },
        },
      },
    },
  },
  tags: [
    { name: 'Authentication', description: 'Authentication & Session Management' },
    { name: 'Users', description: 'User Management (Admin/Super Admin only)' },
    { name: 'Work Management', description: 'Engineering Work Items & Assignments' },
    { name: 'Developer Documentation', description: 'Technical Documentation & Admin Reviews' },
    { name: 'Testing', description: 'Testing Objectives, Quick Test Sessions, Submissions & Reviews' },
    { name: 'Devices', description: 'Compatible Android Device Inventory' },
    { name: 'Files', description: 'Evidence Files & Media Uploads/Downloads' },
    { name: 'Database RDS', description: 'Privileged PostgreSQL RDS Administration' },
    { name: 'Exports', description: 'Database Exports in SQL, CSV, and JSON' },
    { name: 'Audit', description: 'Append-Only Audit Trail Logs' },
    { name: 'Notifications', description: 'Internal User Notifications' },
    { name: 'Health', description: 'System Health & Readiness' },
  ],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'sainadh@voiceshield.internal' },
                  password: { type: 'string', example: 'SuperAdmin123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully' },
          401: { description: 'Invalid credentials' },
          403: { description: 'Account locked or disabled' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Rotate and exchange refresh token for new access/refresh tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Tokens rotated successfully' },
          401: { description: 'Token expired or revoked' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        summary: 'Revoke active refresh tokens and logout session',
        responses: { 200: { description: 'Logged out successfully' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        summary: 'Get current user profile and role',
        responses: { 200: { description: 'Profile returned' } },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        summary: 'Change password for authenticated user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Password changed successfully' } },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        summary: 'List users with filtering (SUPER_ADMIN and ADMIN)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer' } },
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Paginated user list' } },
      },
      post: {
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        summary: 'Create a new user account (SUPER_ADMIN and ADMIN)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'displayName', 'role'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  displayName: { type: 'string' },
                  role: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TESTER'] },
                  status: { type: 'string', enum: ['ACTIVE', 'DISABLED'] },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'User created' } },
      },
    },
    '/work': {
      get: {
        tags: ['Work Management'],
        security: [{ BearerAuth: [] }],
        summary: 'List engineering work items',
        responses: { 200: { description: 'List of work items' } },
      },
      post: {
        tags: ['Work Management'],
        security: [{ BearerAuth: [] }],
        summary: 'Create and assign a work item (Super Admin -> Self/Admin/Dev; Admin -> Self/Dev)',
        responses: { 201: { description: 'Work item created' } },
      },
    },
    '/work/{workId}/documentation': {
      post: {
        tags: ['Developer Documentation'],
        security: [{ BearerAuth: [] }],
        summary: 'Create documentation for an assigned work item',
        parameters: [{ name: 'workId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'Documentation created' } },
      },
      get: {
        tags: ['Developer Documentation'],
        security: [{ BearerAuth: [] }],
        summary: 'Get documentation for a work item',
        parameters: [{ name: 'workId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Documentation returned' } },
      },
    },
    '/documentation/{id}/submit': {
      post: {
        tags: ['Developer Documentation'],
        security: [{ BearerAuth: [] }],
        summary: 'Submit documentation for Admin review (creates immutable version snapshot)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Submitted for review' } },
      },
    },
    '/documentation/{id}/review': {
      post: {
        tags: ['Developer Documentation'],
        security: [{ BearerAuth: [] }],
        summary: 'Review developer documentation (SUPER_ADMIN and ADMIN only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Review recorded' } },
      },
    },
    '/devices': {
      get: {
        tags: ['Devices'],
        security: [{ BearerAuth: [] }],
        summary: 'List compatible devices',
        responses: { 200: { description: 'List of devices' } },
      },
      post: {
        tags: ['Devices'],
        security: [{ BearerAuth: [] }],
        summary: 'Create a compatible device (SUPER_ADMIN and ADMIN only)',
        responses: { 201: { description: 'Device created' } },
      },
    },
    '/testing/objectives': {
      get: {
        tags: ['Testing'],
        security: [{ BearerAuth: [] }],
        summary: 'List testing objectives',
        responses: { 200: { description: 'Objectives returned' } },
      },
      post: {
        tags: ['Testing'],
        security: [{ BearerAuth: [] }],
        summary: 'Create a testing objective (Super Admin, Admin, Developer)',
        responses: { 201: { description: 'Objective created' } },
      },
    },
    '/testing/sessions': {
      post: {
        tags: ['Testing'],
        security: [{ BearerAuth: [] }],
        summary: 'Start a Quick Test session',
        responses: { 201: { description: 'Session started' } },
      },
    },
    '/testing/submissions': {
      get: {
        tags: ['Testing'],
        security: [{ BearerAuth: [] }],
        summary: 'List test submissions (Testers view own, Admins view all)',
        responses: { 200: { description: 'Submissions returned' } },
      },
      post: {
        tags: ['Testing'],
        security: [{ BearerAuth: [] }],
        summary: 'Submit manual test results with outcome PASS/FAIL/BLOCKED/NOT_TESTED',
        responses: { 201: { description: 'Submission recorded' } },
      },
    },
    '/files/upload': {
      post: {
        tags: ['Files'],
        security: [{ BearerAuth: [] }],
        summary: 'Upload evidence file attached to test submission',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'submissionId'],
                properties: {
                  submissionId: { type: 'string' },
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'File uploaded and metadata recorded' } },
      },
    },
    '/database/status': {
      get: {
        tags: ['Database RDS'],
        security: [{ BearerAuth: [] }],
        summary: 'View PostgreSQL RDS status and engine metadata (SUPER_ADMIN and ADMIN)',
        responses: { 200: { description: 'RDS status returned' } },
      },
    },
    '/database/tables/{table}/rows': {
      get: {
        tags: ['Database RDS'],
        security: [{ BearerAuth: [] }],
        summary: 'Database Explorer safe parameterized table row listing (SUPER_ADMIN and ADMIN)',
        parameters: [{ name: 'table', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Table rows returned' } },
      },
    },
    '/database/restore': {
      post: {
        tags: ['Database RDS'],
        security: [{ BearerAuth: [] }],
        summary: 'Restore database snapshot requiring server-generated confirmation token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['backupId', 'confirmationToken'],
                properties: {
                  backupId: { type: 'string' },
                  confirmationToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Database restored' } },
      },
    },
    '/exports': {
      post: {
        tags: ['Exports'],
        security: [{ BearerAuth: [] }],
        summary: 'Generate database export in SQL, CSV, or JSON (SUPER_ADMIN and ADMIN)',
        responses: { 201: { description: 'Export created' } },
      },
    },
    '/audit': {
      get: {
        tags: ['Audit'],
        security: [{ BearerAuth: [] }],
        summary: 'Query append-only audit trail logs (SUPER_ADMIN and ADMIN)',
        responses: { 200: { description: 'Audit trail records' } },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        security: [{ BearerAuth: [] }],
        summary: 'List user notifications',
        responses: { 200: { description: 'Notifications returned' } },
      },
    },
  },
};
