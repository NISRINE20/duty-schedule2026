# Firestore Security Rules for Duty Schedule System

## Overview
These security rules protect the Firestore database while allowing the Duty Schedule System application to function properly. The rules implement role-based access control with the following principles:

- **Authentication Required**: All database access requires Firebase Authentication
- **Role-Based Access**: Admin users have full access, regular users have limited access to their own data
- **Data Validation**: Ensures data integrity and prevents malicious data entry
- **Secure User Registration**: Allows user signup but restricts admin account creation

## Collections Protected

### `users` Collection
Stores user profiles with authentication information.

**Access Rules:**
- Users can read/update their own profile
- Admins can read/update all profiles
- New user registration allowed (with admin restrictions)
- Only one admin account permitted

### `dutyEvents` Collection
Stores duty schedule events, time logs, and leave requests.

**Access Rules:**
- All authenticated users can read events (frontend filters visibility)
- Authenticated users can create events
- Users can update their own time logs and leave requests
- Admins can update/delete all events

## Deployment Instructions

### Option 1: Firebase CLI (Recommended)
1. Ensure Firebase CLI is installed: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Navigate to project root: `cd dutysched`
4. Deploy rules: `firebase deploy --only firestore:rules --project duty-schedule-system-1c48b`

### Option 2: Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `duty-schedule-system-1c48b`
3. Navigate to Firestore Database → Rules
4. Copy the contents of `firestore.rules` and paste into the console
5. Click "Publish"

## Security Features

### Authentication Checks
- All operations require valid Firebase Authentication
- User existence verified in `users` collection

### Role Validation
- Admin role verified against stored user data
- Single admin restriction enforced

### Data Validation
- Required fields validated on create operations
- Data type checking for critical fields
- Ownership verification for user-specific operations

### Access Control
- Read access granted based on authentication and role
- Write access restricted to authorized operations
- Delete operations limited to admins only

## Testing the Rules

After deployment, test the following scenarios:

1. **User Registration**: New users should be able to create accounts
2. **Admin Creation**: Only one admin account should be allowed
3. **Event Creation**: Authenticated users should create duty events
4. **Time Logging**: Users should update their own time logs
5. **Leave Requests**: Users should request leaves for their events
6. **Admin Management**: Admins should manage all data
7. **Unauthorized Access**: Unauthenticated requests should be denied

## Maintenance

- Review rules periodically for new features
- Update rules when adding new collections or changing data models
- Test rules thoroughly before deploying to production
- Monitor Firebase security analytics for unusual access patterns