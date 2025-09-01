# OsTravel Management Portal

A secure visa management system with user-based data isolation.

## 🔐 Authentication System

This application now uses **Firebase Authentication** to ensure that each employee can only see and manage their own records.

### Key Security Features

- ✅ **User-based data isolation** - Employees can only see their own bookings
- ✅ **Secure login** - Firebase email/password authentication
- ✅ **Data protection** - All CRUD operations verify user ownership
- ✅ **Session management** - Automatic logout and session handling

### How It Works

1. **Login**: Users authenticate with email/password through Firebase
2. **Data Isolation**: All database queries filter by `userId` field
3. **Access Control**: Users can only view, edit, and delete their own records
4. **Audit Trail**: All actions are logged with user information

### Database Structure

Each record in the system now includes:
```javascript
{
  // ... other fields ...
  userId: "firebase_user_uid",        // Links record to specific user
  userEmail: "user@example.com",     // User's email for display
  createdAt: "timestamp",            // When record was created
  // ... other fields ...
}
```

### Setting Up Authentication

1. **Firebase Configuration**: Ensure your `firebase.js` has authentication enabled
2. **Create Users**: Add users through Firebase Console or implement user registration
3. **Security Rules**: Set up Firestore security rules to enforce user isolation

### User Management

- **Admin Users**: Can be created through Firebase Console
- **Employee Access**: Each employee gets their own login credentials
- **Data Privacy**: Complete isolation between different user accounts

### Security Benefits

- 🔒 **No data leakage** between employees
- 🔒 **Individual accountability** for all actions
- 🔒 **Secure session management**
- 🔒 **Audit trail** for all operations

## 🚀 Getting Started

1. Install dependencies: `npm install`
2. Configure Firebase in `src/firebase.js`
3. Set up authentication in Firebase Console
4. Create user accounts for employees
5. Run the application: `npm run dev`

## 📱 Features

- **Secure Login System**
- **User-specific Data Views**
- **Visa Application Management**
- **Booking System**
- **Reports and Analytics**
- **Deleted Records Management**

## 🛡️ Security Notes

- All database operations verify user ownership
- Passport number validation prevents duplicates within user accounts
- Soft delete system maintains data integrity
- User sessions are properly managed and secured

---

**Note**: This system ensures complete data privacy between employees while maintaining full functionality for individual users.
