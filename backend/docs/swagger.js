const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Student Advising Portal API',
    version: '1.0.0',
    description:
      'RESTful API for the Student Advising Portal — manages student academic records, curricula, study plans, grade entry, forecasts, and notifications.',
  },
  servers: [{ url: '/api', description: 'API base' }],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          totalItems: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'adviser', 'student'] },
          studentId: { type: 'string' },
          isActive: { type: 'boolean' },
          isVerified: { type: 'boolean' },
        },
      },
      SAR: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          curriculumId: { type: 'integer' },
          studentName: { type: 'string' },
          studentNumber: { type: 'string' },
          email: { type: 'string', format: 'email' },
          yearLevel: { type: 'integer', minimum: 1, maximum: 5 },
        },
      },
      Curriculum: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          year: { type: 'integer' },
          isActive: { type: 'boolean' },
        },
      },
      Course: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          courseCode: { type: 'string' },
          courseName: { type: 'string' },
          units: { type: 'number' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          type: { type: 'string' },
          message: { type: 'string' },
          isRead: { type: 'boolean' },
        },
      },
    },
    parameters: {
      PageParam: { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
      LimitParam: { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      SarId: { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
    },
  },
  security: [{ cookieAuth: [] }],
  tags: [
    { name: 'Auth', description: 'Authentication and account management' },
    { name: 'Users', description: 'User management (admin)' },
    { name: 'SAR', description: 'Student Academic Records' },
    { name: 'Grades', description: 'Grade entry and import' },
    { name: 'Curriculum', description: 'Curriculum, courses, prerequisites' },
    { name: 'Terms', description: 'Academic term management' },
    { name: 'Forecast', description: 'Demand forecasting' },
    { name: 'Dashboard', description: 'Dashboard summaries' },
    { name: 'Export', description: 'PDF export' },
    { name: 'Notifications', description: 'User notifications' },
    { name: 'Validation', description: 'Study plan validation' },
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['firstName', 'lastName', 'email', 'password', 'role'],
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  role: { type: 'string', enum: ['student', 'adviser'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Account created' },
          400: { description: 'Validation error' },
          409: { description: 'Email exists' },
          429: { description: 'Rate limited' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials' },
          403: { description: 'Account locked/unverified' },
        },
      },
    },
    '/auth/verify-code': {
      post: {
        tags: ['Auth'],
        summary: 'Verify 2FA code after login',
        security: [],
        responses: { 200: { description: 'Verified' }, 400: { description: 'Invalid code' } },
      },
    },
    '/auth/resend-code': {
      post: {
        tags: ['Auth'],
        summary: 'Resend 2FA verification code',
        security: [],
        responses: { 200: { description: 'Code resent' } },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        security: [],
        responses: { 200: { description: 'Email sent' } },
      },
    },
    '/auth/reset-password/{token}': {
      put: {
        tags: ['Auth'],
        summary: 'Reset password using token',
        security: [],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Password reset' },
          400: { description: 'Invalid token' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh JWT access token',
        responses: {
          200: { description: 'New token issued' },
          401: { description: 'Invalid refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout and clear tokens',
        responses: { 200: { description: 'Logged out' } },
      },
    },
    '/auth/activate/{token}': {
      get: {
        tags: ['Auth'],
        summary: 'Activate account via email link',
        security: [],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Activated' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user',
        responses: { 200: { description: 'User data' } },
      },
    },
    '/auth/change-password': {
      put: {
        tags: ['Auth'],
        summary: 'Change password (authenticated)',
        responses: { 200: { description: 'Changed' }, 400: { description: 'Validation error' } },
      },
    },
    '/auth/transfer-ownership': {
      patch: {
        tags: ['Auth'],
        summary: 'Transfer admin ownership (admin only)',
        responses: { 200: { description: 'Transferred' }, 403: { description: 'Not admin' } },
      },
    },
    '/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in with Google OAuth',
        security: [],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/auth/initiate-email-change': {
      post: {
        tags: ['Auth'],
        summary: 'Initiate email change',
        responses: { 200: { description: 'Code sent' } },
      },
    },
    '/auth/verify-email-change': {
      post: {
        tags: ['Auth'],
        summary: 'Verify email change code',
        responses: { 200: { description: 'Email updated' } },
      },
    },
    '/auth/resend-email-change-code': {
      post: {
        tags: ['Auth'],
        summary: 'Resend email change code',
        responses: { 200: { description: 'Code resent' } },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List all users (admin)',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'User list' } },
      },
    },
    '/users/curriculum-options': {
      get: {
        tags: ['Users'],
        summary: 'List curriculum options for profile',
        responses: { 200: { description: 'Options' } },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'User data' } },
      },
      put: {
        tags: ['Users'],
        summary: 'Update user profile',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Deleted' } },
      },
    },
    '/users/onboard': {
      post: {
        tags: ['Users'],
        summary: 'Complete initial onboarding',
        responses: { 200: { description: 'Onboarded' } },
      },
    },
    '/users/{id}/toggle-status': {
      patch: {
        tags: ['Users'],
        summary: 'Toggle user active status',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Toggled' } },
      },
    },
    '/users/{id}/assign-adviser': {
      patch: {
        tags: ['Users'],
        summary: 'Assign adviser to student',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Assigned' } },
      },
    },
    '/sars': {
      get: {
        tags: ['SAR'],
        summary: 'List student academic records',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'SAR list' } },
      },
      post: {
        tags: ['SAR'],
        summary: 'Create a new SAR',
        responses: { 201: { description: 'Created' }, 400: { description: 'Validation error' } },
      },
    },
    '/sars/bulk-create': {
      post: {
        tags: ['SAR'],
        summary: 'Bulk create SARs from CSV data',
        responses: { 201: { description: 'Records created' } },
      },
    },
    '/sars/autofill': {
      get: {
        tags: ['SAR'],
        summary: 'Autofill SAR data from student profile',
        responses: { 200: { description: 'Autofill data' } },
      },
    },
    '/sars/{id}': {
      get: {
        tags: ['SAR'],
        summary: 'Get SAR with study plan',
        parameters: [{ $ref: '#/components/parameters/SarId' }],
        responses: { 200: { description: 'SAR data' } },
      },
      put: {
        tags: ['SAR'],
        summary: 'Update SAR',
        parameters: [{ $ref: '#/components/parameters/SarId' }],
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/sars/{id}/elective-track': {
      patch: {
        tags: ['SAR'],
        summary: 'Set elective track',
        parameters: [{ $ref: '#/components/parameters/SarId' }],
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/sars/{id}/study-plan/generate': {
      post: {
        tags: ['SAR'],
        summary: 'Generate study plan version',
        parameters: [{ $ref: '#/components/parameters/SarId' }],
        responses: { 201: { description: 'Generated' } },
      },
    },
    '/sars/{id}/study-plan/versions': {
      get: {
        tags: ['SAR'],
        summary: 'List study plan versions',
        parameters: [{ $ref: '#/components/parameters/SarId' }],
        responses: { 200: { description: 'Version list' } },
      },
    },
    '/sars/{id}/study-plan/active-version/grades': {
      put: {
        tags: ['Grades'],
        summary: 'Update grades in active study plan',
        parameters: [{ $ref: '#/components/parameters/SarId' }],
        responses: { 200: { description: 'Grades saved' } },
      },
    },
    '/sars/{id}/study-plan/active-version/grades/bulk-import': {
      post: {
        tags: ['Grades'],
        summary: 'Bulk import grades from CSV',
        parameters: [{ $ref: '#/components/parameters/SarId' }],
        responses: { 200: { description: 'Imported' }, 400: { description: 'Validation errors' } },
      },
    },
    '/sars/{id}/study-plan/regenerate': {
      post: {
        tags: ['Grades'],
        summary: 'Regenerate study plan after grade changes',
        parameters: [{ $ref: '#/components/parameters/SarId' }],
        responses: { 200: { description: 'Regenerated' } },
      },
    },
    '/curriculums': {
      get: {
        tags: ['Curriculum'],
        summary: 'List all curricula',
        responses: { 200: { description: 'List' } },
      },
      post: {
        tags: ['Curriculum'],
        summary: 'Create curriculum (admin)',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/curriculums-map': {
      get: {
        tags: ['Curriculum'],
        summary: 'Get curriculum map with courses',
        responses: { 200: { description: 'Map data' } },
      },
    },
    '/curriculums/{id}': {
      get: {
        tags: ['Curriculum'],
        summary: 'Get curriculum by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Data' } },
      },
      put: {
        tags: ['Curriculum'],
        summary: 'Update curriculum',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/curriculums/{id}/activate': {
      patch: {
        tags: ['Curriculum'],
        summary: 'Activate curriculum',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Activated' } },
      },
    },
    '/curriculums/{id}/courses': {
      get: {
        tags: ['Curriculum'],
        summary: 'List curriculum courses',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Courses' } },
      },
      post: {
        tags: ['Curriculum'],
        summary: 'Add course to curriculum',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 201: { description: 'Added' } },
      },
    },
    '/curriculums/{id}/courses/{ccId}': {
      delete: {
        tags: ['Curriculum'],
        summary: 'Remove course from curriculum',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'ccId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Removed' } },
      },
    },
    '/curriculums/{id}/prerequisites': {
      get: {
        tags: ['Curriculum'],
        summary: 'List prerequisites',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'List' } },
      },
      post: {
        tags: ['Curriculum'],
        summary: 'Add prerequisite',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 201: { description: 'Added' } },
      },
    },
    '/curriculums/{id}/corequisites': {
      get: {
        tags: ['Curriculum'],
        summary: 'List corequisites',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'List' } },
      },
      post: {
        tags: ['Curriculum'],
        summary: 'Add corequisite',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 201: { description: 'Added' } },
      },
    },
    '/equivalencies': {
      get: {
        tags: ['Curriculum'],
        summary: 'List equivalencies',
        responses: { 200: { description: 'List' } },
      },
      post: {
        tags: ['Curriculum'],
        summary: 'Create equivalency',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/equivalencies/{id}': {
      delete: {
        tags: ['Curriculum'],
        summary: 'Delete equivalency',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Deleted' } },
      },
    },
    '/curriculums/{id}/import/csv/apply': {
      post: {
        tags: ['Curriculum'],
        summary: 'Import curriculum from CSV',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Imported' } },
      },
    },
    '/curriculums/{id}/elective-tracks': {
      get: {
        tags: ['Curriculum'],
        summary: 'List elective tracks',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Tracks' } },
      },
      post: {
        tags: ['Curriculum'],
        summary: 'Create elective track',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 201: { description: 'Created' } },
      },
    },
    '/courses': {
      get: {
        tags: ['Curriculum'],
        summary: 'List all courses',
        responses: { 200: { description: 'Courses' } },
      },
    },
    '/courses/{id}': {
      put: {
        tags: ['Curriculum'],
        summary: 'Update course',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Curriculum'],
        summary: 'Delete course',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Deleted' } },
      },
    },
    '/terms': {
      get: {
        tags: ['Terms'],
        summary: 'List academic terms',
        responses: { 200: { description: 'Terms' } },
      },
      post: {
        tags: ['Terms'],
        summary: 'Create term (admin)',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/terms/current': {
      get: {
        tags: ['Terms'],
        summary: 'Get current active term',
        responses: { 200: { description: 'Term' } },
      },
    },
    '/terms/{id}/activate': {
      patch: {
        tags: ['Terms'],
        summary: 'Activate term',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Activated' } },
      },
    },
    '/terms/current/end': {
      patch: {
        tags: ['Terms'],
        summary: 'End current term',
        responses: { 200: { description: 'Ended' } },
      },
    },
    '/forecast/current': {
      get: {
        tags: ['Forecast'],
        summary: 'Current term forecast',
        responses: { 200: { description: 'Data' } },
      },
    },
    '/forecast/next': {
      get: {
        tags: ['Forecast'],
        summary: 'Next term forecast',
        responses: { 200: { description: 'Data' } },
      },
    },
    '/forecast/comparison': {
      get: {
        tags: ['Forecast'],
        summary: 'Forecast comparison',
        responses: { 200: { description: 'Data' } },
      },
    },
    '/forecast/history': {
      get: {
        tags: ['Forecast'],
        summary: 'Forecast history',
        responses: { 200: { description: 'Data' } },
      },
    },
    '/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Dashboard summary for current role',
        responses: { 200: { description: 'Summary' } },
      },
    },
    '/sars/{id}/export/pdf': {
      get: {
        tags: ['Export'],
        summary: 'Export study plan as PDF',
        parameters: [{ $ref: '#/components/parameters/SarId' }],
        responses: { 200: { description: 'PDF file', content: { 'application/pdf': {} } } },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get notifications',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
        ],
        responses: { 200: { description: 'List' } },
      },
    },
    '/notifications/unread-count': {
      get: {
        tags: ['Notifications'],
        summary: 'Unread count',
        responses: { 200: { description: 'Count' } },
      },
    },
    '/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all read',
        responses: { 200: { description: 'Done' } },
      },
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark one read',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Done' } },
      },
    },
    '/sars/{id}/study-plan/versions/{versionId}/validate': {
      patch: {
        tags: ['Validation'],
        summary: 'Validate study plan version',
        parameters: [
          { $ref: '#/components/parameters/SarId' },
          { name: 'versionId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Validated' } },
      },
    },
    '/sars/{id}/study-plan/versions/{versionId}/courses': {
      put: {
        tags: ['Validation'],
        summary: 'Update version courses',
        parameters: [
          { $ref: '#/components/parameters/SarId' },
          { name: 'versionId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        security: [],
        responses: { 200: { description: 'OK' } },
      },
    },
  },
};

function setupSwagger(app) {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Student Advising Portal — API Docs',
    }),
  );
}

module.exports = { setupSwagger, spec };
