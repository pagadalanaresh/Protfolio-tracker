# Admin Portal Guide

## Overview

The Admin Portal provides comprehensive database management capabilities for the Indian Portfolio Tracker application. It features secure authentication, user management, data oversight, and system monitoring.

## 🔑 Default Admin Credentials

**Username:** `naresh`  
**Password:** `pagadala`

> ⚠️ **Security Note**: These are default credentials created automatically when the database is first initialized. Please change them after first login for enhanced security.

## 🚀 Accessing the Admin Portal

1. **URL**: `http://localhost:3002/admin.html`
2. **Requirements**: Database connection must be established
3. **First Time Setup**: If no admin exists, the system will automatically create the default admin account

## 📋 Features

### 1. Dashboard
- **Total Users**: Count of registered users
- **Portfolio Items**: Total number of portfolio entries across all users
- **Closed Positions**: Total number of closed positions
- **Active Sessions**: Current active user sessions

### 2. User Management
- **View All Users**: Complete list of registered users with details
- **User Information**: Username, email, phone, registration date, last update
- **User Selection**: Click on any user card to select them for data management

### 3. Data Management
- **Portfolio Data**: View and manage user's active portfolio holdings
- **Closed Positions**: View and manage user's closed trading positions
- **Data Operations**: Delete individual portfolio items or closed positions
- **User-Specific Views**: All data is properly isolated per user

### 4. System Logs
- **Request Monitoring**: View system activity and API requests
- **Error Tracking**: Monitor system errors and warnings
- **Performance Metrics**: Track response times and system health

## 🔧 Technical Implementation

### Database Schema
```sql
-- Admin table
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin sessions table
CREATE TABLE admin_sessions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

#### Authentication
- `GET /api/admin/setup-required` - Check if admin setup is needed
- `POST /api/admin/setup` - Create first admin (only if none exists)
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/auth/check` - Check admin authentication status

#### Data Management (Requires Admin Authentication)
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:userId/portfolio` - Get user's portfolio data
- `GET /api/admin/users/:userId/closed-positions` - Get user's closed positions
- `DELETE /api/admin/portfolio/:itemId` - Delete portfolio item
- `DELETE /api/admin/closed-positions/:itemId` - Delete closed position
- `DELETE /api/admin/users/:userId` - Delete user and all associated data

## 🛡️ Security Features

### Authentication
- **Secure Password Hashing**: SHA-256 with admin-specific salt
- **Session Management**: HTTP-only cookies with expiration
- **Session Validation**: Server-side session verification
- **Auto-Logout**: 24-hour session timeout

### Authorization
- **Admin-Only Access**: All admin endpoints require valid admin session
- **Database Dependency**: Admin portal requires database connection
- **Request Logging**: All admin actions are logged with request/response details

### Data Protection
- **User Data Isolation**: Admins can view all user data but operations maintain proper isolation
- **Secure Deletion**: Cascade deletion ensures data integrity
- **Transaction Safety**: Database transactions for multi-step operations

## 🔄 Workflow

### First Time Setup
1. Start the server with database connection
2. Navigate to admin portal
3. Enter desired admin credentials (minimum 8 characters for password)
4. System creates admin account automatically
5. Login with the created credentials

### Regular Usage
1. Login with admin credentials
2. **Dashboard**: View system overview and statistics
3. **User Management**: Browse and select users
4. **Data Management**: View and manage selected user's data
5. **System Logs**: Monitor system activity
6. **Logout**: Secure session termination

### Data Management Operations
1. **Select User**: Click on user card in User Management section
2. **Switch to Data Management**: Navigate to Data Management tab
3. **View Data**: Toggle between Portfolio Data and Closed Positions
4. **Manage Data**: Delete individual items as needed
5. **User Deletion**: Complete user removal with all associated data

## 🚨 Important Notes

### Security Considerations
- Change default credentials after first login
- Admin sessions expire after 24 hours
- All admin actions are logged
- Database connection required for all operations

### Data Management
- User deletion is permanent and removes ALL associated data
- Portfolio/position deletion is immediate and cannot be undone
- All operations maintain referential integrity

### System Requirements
- PostgreSQL database connection
- Node.js server environment
- Modern web browser for admin interface

## 🔍 Troubleshooting

### Common Issues
1. **"Database connection required"**: Ensure DATABASE_URL is set
2. **"Admin authentication required"**: Login session may have expired
3. **"No users found"**: No users have registered yet
4. **API 503 errors**: Database connection is not available

### Logs and Monitoring
- Check server console for detailed request/response logs
- Monitor system logs section in admin portal
- Verify database connection status via `/api/db-status`

## 📝 Development Notes

### Code Structure
- **Frontend**: `admin.html` - Complete admin interface
- **Backend**: `server.js` - Admin API endpoints and authentication
- **Database**: `database.js` - Admin operations and schema

### Key Functions
- `createDefaultAdmin()` - Creates default admin on startup
- `authenticateAdmin()` - Middleware for admin route protection
- `adminOperations` - Database operations for admin management

This admin portal provides complete control over the portfolio tracker database while maintaining security and data integrity.
