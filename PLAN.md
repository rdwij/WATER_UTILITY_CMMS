# Role-Based Access Control Implementation Plan

## Context
The application has implemented a basic Role-Based Access Control (RBAC) system with three roles: admin, manager, and user. The implementation includes:
1. A role column added to the users table (enum: 'admin', 'manager', 'user' with default 'user')
2. User model updated to include 'role' in fillable and casts arrays
3. CheckRole middleware created that validates if authenticated user has one of the specified roles
4. Middleware registered in bootstrap/app.php

However, the CheckRole middleware is not currently being applied to any routes. This plan outlines how to apply role-based access control to protect application routes based on user roles.

## Approach
Apply the CheckRole middleware to appropriate route groups based on role requirements:
- Admin-only routes: protected by 'role:admin'
- Manager-accessible routes: protected by 'role:admin,manager' 
- User-accessible routes: protected by 'role:admin,manager,user' or just 'auth' since all users have at least 'user' role

## Files to Modify
1. `routes/settings.php` - Apply role-based middleware to settings routes
2. `routes/web.php` - Apply role-based middleware to main application routes
3. Other route files as needed when additional features are added

## Implementation Details

### Settings Routes (`routes/settings.php`)
- Profile routes: Accessible by all authenticated users (admin, manager, user)
- Preferences routes: Accessible by all authenticated users 
- Security routes: Accessible by all authenticated users
- Appearance routes: Accessible by all authenticated users

### Web Routes (`routes/web.php`)
- Dashboard: Accessible by all authenticated users
- Other routes: Apply appropriate role restrictions based on functionality

## Verification
1. Test that users can only access routes appropriate for their role
2. Verify that users without appropriate permissions are redirected with error message
3. Confirm that admin users can access all routes
4. Confirm that manager users can access manager and user routes but not admin-only routes
5. Confirm that regular users can only access user-level routes

## Implementation Notes
- The CheckRole middleware uses variadic parameters, allowing multiple roles to be specified: `role:admin,manager`
- Middleware should be applied alongside existing middleware like 'auth' and 'verified'
- Redirect on failure goes back to previous page with 'error' flash message