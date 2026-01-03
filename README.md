# Student Advising System

A comprehensive student advising system with user authentication, role-based access control, and admin user management.

## Features

### 1. User Authentication (UC-1)
- ✅ Functional Login/Register Pages
- ✅ JWT-based Authentication API
- ✅ User Table with Hashed Passwords (bcrypt)
- ✅ Session Management

### 2. User Management Module (UC-1)
- ✅ Admin "Manage Users" Dashboard
- ✅ Account Activation Email System
- ✅ Role-based Access Control (Student, Adviser, Admin)
- ✅ User Status Management (Active/Inactive)
- ✅ Automatic Student role assignment on registration

## Tech Stack

### Backend
- Node.js & Express
- PostgreSQL Database (Supabase)
- JWT for authentication
- bcrypt.js for password hashing
- Nodemailer for email services

### Frontend
- React 18
- React Router v6
- Axios for API calls
- Context API for state management

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

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/activate/:token` - Activate account
- `GET /api/auth/me` - Get current user

### User Management (Admin Only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PATCH /api/users/:id/toggle-status` - Toggle user status

## User Roles

All new users (via registration or Google OAuth) are automatically assigned the **Student** role.

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

**Note:** Only admins can change user roles through the admin panel or database.

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT token-based authentication
- HTTP-only cookies
- Role-based authorization
- Account activation via email
- Protected routes on frontend and backend

## Default Admin Setup

To create an admin user:
1. Register a new user through the registration page
2. Connect to the PostgreSQL database using a client (e.g., pgAdmin, DBeaver, or Supabase dashboard)
3. Update the user's role to 'admin' and set "isActive" to true
4. Alternatively, use SQL: `UPDATE users SET role = 'admin', "isActive" = true WHERE email = 'your@email.com'`

## Development Notes

- Backend runs on port 5000
- Frontend runs on port 3000
- PostgreSQL database hosted on Supabase (connection configured in .env)
- Database tables are created automatically on first run
- Email service needs to be configured for account activation

## Future Enhancements

- Password reset functionality
- Profile management
- Course management
- Appointment scheduling
- Messaging system
- File uploads

## License

ISC
