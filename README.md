# Smart Campus Management System (SCMS)

A comprehensive management system for educational institutions, providing role-based access for administrators, lecturers, and students.

## Admin Access

For administrative access, use the following credentials:

Email: `vertexcampusmain@gmail.com`  
Password: `Vertex@#22`

**Note**: These credentials should only be shared with authorized personnel. The default admin account is automatically created when the application initializes if no admin account exists.

## Features

### Admin Dashboard

- User management with role assignment
- System overview and analytics
- Resource allocation and scheduling

### Lecturer Dashboard

- Class management
- Student communications
- Resource reservation

### Student Dashboard

- Class schedules
- Learning materials
- Campus activities

## Security

The system implements role-based access control to ensure users can only access appropriate features based on their assigned role. Only administrators can promote users to higher privilege levels.

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Access the application at: http://localhost:3000

## Technology Stack

- React with TypeScript
- Firebase Authentication
- Firestore Database
- Bootstrap for UI components
