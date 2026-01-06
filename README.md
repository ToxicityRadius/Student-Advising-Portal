# Student Advising System

A comprehensive student advising system with user authentication, role-based access control, secure faculty invitation system, and admin user management.

## 📚 Documentation

- **[README.md](README.md)** - Main documentation (you are here)
- **[GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md)** - Google OAuth configuration guide
- **[FACULTY_INVITATION_SYSTEM.md](FACULTY_INVITATION_SYSTEM.md)** - Complete faculty invitation system documentation
- **[FACULTY_INVITATION_QUICKSTART.md](FACULTY_INVITATION_QUICKSTART.md)** - Quick start guide for admins and faculty
- **[REQUIRED_EXTENSIONS.md](REQUIRED_EXTENSIONS.md)** - VS Code extensions and project dependencies

## Features

### 1. User Authentication (UC-1)
- ✅ Functional Login/Register Pages
- ✅ JWT-based Authentication API
- ✅ User Table with Hashed Passwords (bcrypt)
- ✅ Session Management
- ✅ Google OAuth 2.0 Integration (@tip.edu.ph domain restriction)
- ✅ Two-Factor Authentication (2FA) via Email
- ✅ Password Reset via Email
- ✅ Email Verification System
- ✅ Student ID mandatory popup for Google OAuth students

### 2. User Management Module (UC-1)
- ✅ Admin "Manage Users" Dashboard
- ✅ Account Activation Email System
- ✅ Role-based Access Control (Student, Adviser, Admin)
- ✅ User Status Management (Active/Inactive)
- ✅ Automatic Student role assignment on registration
- ✅ Faculty Invitation System (secure role assignment)

## Tech Stack

### Backend
- Node.js & Express
- PostgreSQL Database (Supabase)
- JWT for authentication
- bcrypt.js for password hashing
- Nodemailer for email services
- Google OAuth 2.0 (google-auth-library)

### Frontend
- React 18
- React Router v6
- Axios for API calls
- Context API for state management
- Google OAuth 2.0 (@react-oauth/google)
- jwt-decode for token parsing

## Project Structure

```
Student Advising/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   └── userController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── googleAuthRoutes.js
│   │   └── userRoutes.js
│   ├── utils/
│   │   ├── email.js
│   │   └── jwt.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.js
    │   │   └── PrivateRoute.js
    │   ├── context/
    │   │   └── AuthContext.js
    │   ├── pages/
    │   │   ├── ActivateAccount.js
    │   │   ├── Dashboard.js
    │   │   ├── Login.js
    │   │   ├── ManageUsers.js
    │   │   └── Register.js
    │   ├── utils/
    │   │   └── api.js
    │   ├── App.js
    │   ├── index.css
    │   └── index.js
    ├── .env.example
    └── package.json
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database (using Supabase - connection details in .env)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from `.env.example`:
   ```bash
   copy .env.example .env
   ```

4. Update the `.env` file with your configuration:
   - Set your JWT secret (generate a secure random string)
   - Configure email settings (Gmail recommended)
   - DATABASE_URL is pre-configured with Supabase PostgreSQL connection

5. Start the server:
   ```bash
   npm run dev
   ```
   Server will run on http://localhost:5000

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from `.env.example`:
   ```bash
   copy .env.example .env
   ```

4. Start the development server:
   ```bash
   npm start
   ```
   App will run on http://localhost:3000

## Email Configuration

For Gmail:
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in the `.env` file

## Google OAuth Configuration

For detailed Google OAuth setup instructions, see [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md).

**Quick Setup:**
1. Create a Google OAuth Client ID at [Google Cloud Console](https://console.cloud.google.com/)
2. Add `http://localhost:3000` to Authorized JavaScript origins
3. Add your Client ID to:
   - Backend: `.env` file (`GOOGLE_CLIENT_ID`)
   - Frontend: `src/App.js` in GoogleOAuthProvider
4. The system restricts access to `@tip.edu.ph` email addresses only

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (student)
- `POST /api/auth/register-faculty/:token` - Register faculty via invitation
- `GET /api/auth/validate-invitation/:token` - Validate faculty invitation token
- `POST /api/auth/login` - Login user (supports 2FA)
- `POST /api/auth/google` - Google OAuth sign-in
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/verify-code` - Verify 2FA code
- `POST /api/auth/resend-code` - Resend 2FA code
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/activate/:token` - Activate account
- `GET /api/auth/me` - Get current user

### User Management (Admin Only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PATCH /api/users/:id/toggle-status` - Toggle user status

### Faculty Invitations (Admin Only)
- `POST /api/admin/invite-faculty` - Send faculty invitation email
- `GET /api/admin/invitations` - Get all invitations
- `GET /api/admin/invitations/pending` - Get pending invitations
- `DELETE /api/admin/invitations/:id` - Delete invitation
- `POST /api/admin/invitations/:id/resend` - Resend invitation

## User Roles

### Student Registration
Students register normally through the registration page with their 7-digit Student Number. All student registrations default to the **Student** role.

### Faculty Registration (Secure Invitation System)
Faculty (Advisers and Program Chairs) cannot self-register. They must be invited by an admin:
1. **Admin sends invitation** via the "Invite Faculty" form in Manage Users page
2. **Faculty receives email** with unique invitation link (valid for 48 hours)
3. **Faculty clicks link** and completes registration with pre-assigned role
4. **Account is automatically activated** with appropriate permissions (no manual role changes needed)

This ensures only authorized personnel can access faculty features.

### 1. **Student** (Default Role)
Automatically assigned to all new registrations. Key features:
- **Grade Input**: Manually encode grades to build an updated academic profile
- **Checklist & Progress Tracking**: View completed, ongoing, and remaining subjects based on curriculum
- **Plan of Study Generation**: System recommends optimal list of subjects per semester based on prerequisites, availability, and academic load
- **Elective Guidance**: Ensures correct enrollment in specialization tracks (Data Science, Cybersecurity, Systems Administration, Robotics)

### 2. **Adviser** (Student Adviser)
Extended access for academic advisers. Key features:
- **Advisee Record Access**: Access complete checklists and grades of assigned students
- **Plan of Study Validation**: Review and adjust recommended study plans
- **Advising Reports**: Generate official advising notes/forms to guide student enrollment

### 3. **Admin** (Program Chair)
Full system access with administrative capabilities. Key features:
- **Petition Management**: Track actual student demand based on grade data and projected needs (replaces paper-based petitions)
- **Course Demand Forecasting**: Analytics on number of students requiring subjects in upcoming semesters
- **Curriculum Mapping**: Support equivalency between old and new curricula (e.g., 2018, 2023, 2025)
- **Course Offering Planner**: Suggests which subjects to open based on demand and student progression data
- **User Management**: Manage all users, roles, and account statuses
- **Faculty Invitation System**: Send secure invitations to faculty members with pre-assigned roles

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT token-based authentication
- HTTP-only cookies
- Role-based authorization
- Account activation via email
- Protected routes on frontend and backend
- Google OAuth 2.0 with domain restriction (@tip.edu.ph)
- Two-Factor Authentication (2FA) via email
- Password reset functionality with secure tokens
- Email verification system
- Faculty invitation system with expiring tokens (48 hours)
- Secure role assignment (faculty cannot self-assign roles)

## Default Admin Setup

To create the first admin user:
1. Register a new user through the registration page
2. Connect to the PostgreSQL database using a client (e.g., pgAdmin, DBeaver, or Supabase dashboard)
3. Update the user's role to 'admin' and set "isActive" to true
4. Use SQL: `UPDATE users SET role = 'admin', "isActive" = true WHERE email = 'your@email.com'`

Once you have an admin account, you can invite other faculty members securely through the "Invite Faculty" feature in the Manage Users dashboard.

## Development Notes

- Backend runs on port 5000
- Frontend runs on port 3000
- PostgreSQL database hosted on Supabase (connection configured in .env)
- Database tables are created automatically on first run
- Email service needs to be configured for account activation

## Future Enhancements

- Profile management
- Course management
- Grade encoding system
- Curriculum checklist and progress tracking
- Plan of Study generation
- Appointment scheduling
- Messaging system
- File uploads
- Petition management system
- Course demand forecasting
- Curriculum mapping (2018, 2023, 2025)

## License

ISC
