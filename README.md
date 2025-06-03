# MeetCute - Modern Dating Platform

MeetCute is a full-featured dating application designed to create meaningful connections between users. With a robust feature set spanning from user matching algorithms to premium subscription services, MeetCute delivers a complete dating experience.

## 🚀 Features

### User Features
- **Smart Matching System**: Algorithm-based matching considering user preferences and behavior
- **User Profiles**: Detailed profile creation with photos, personal information, interests, and preferences
- **Messaging System**: Real-time chat with matches, including read receipts and typing indicators
- **Discovery Feed**: Browse potential matches with filtering options
- **Premium Subscriptions**: Tiered subscription plans with escalating benefits
- **Virtual Gifts**: Send and receive virtual gifts to express interest
- **Notifications**: Real-time notifications for matches, messages, and profile views

### Admin Features
- **Dashboard**: Comprehensive statistics and metrics for monitoring platform performance
- **User Management**: View, edit, and manage user accounts
- **Moderation Tools**: Review reported content and take appropriate actions
- **Revenue Tracking**: Monitor subscription payments and financial performance
- **Subscription Management**: Create, edit, and manage subscription tiers and features
- **Admin Action Logs**: Track all administrative actions for accountability

## 🛠️ Technology Stack

### Frontend
- **React**: Component-based UI library
- **React Router**: Navigation and routing
- **Axios**: HTTP client for API requests
- **Tailwind CSS**: Utility-first CSS framework
- **React Icons**: Icon library
- **Socket.io Client**: Real-time communication
- **Stripe.js**: Payment processing integration

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web application framework
- **PostgreSQL**: Relational database
- **WebSockets**: Real-time communication
- **JWT**: Authentication via JSON Web Tokens
- **Bcrypt**: Password hashing
- **Stripe API**: Payment processing
- **Nodemailer**: Email notifications

## 🗂️ Project Structure

### Frontend Structure
```
frontend/
├── public/          # Static files
├── src/             # Source code
│   ├── components/  # Reusable React components
│   │   ├── Admin/   # Admin dashboard components
│   │   ├── Auth/    # Authentication components
│   │   ├── Chat/    # Messaging components
│   │   └── ...      # Other component categories
│   ├── pages/       # Page components
│   ├── utils/       # Utility functions and services
│   ├── hooks/       # Custom React hooks
│   ├── context/     # React context providers
│   ├── App.jsx      # Main application component
│   └── main.jsx     # Application entry point
├── package.json     # Project dependencies
└── vite.config.js   # Vite configuration
```

### Backend Structure
```
backend/
├── config/          # Configuration files
│   ├── db.js        # Database connection
│   └── env.js       # Environment variables
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── models/          # Database models
├── routes/          # API route definitions
├── uploads/         # User uploaded files
├── utils/           # Utility functions
├── websocket/       # WebSocket server setup
├── package.json     # Project dependencies
└── server.js        # Server entry point
```

## 📊 Database Schema

MeetCute uses a PostgreSQL database with the following core tables:

- **users**: User accounts and authentication
- **profiles**: User profile information
- **matches**: Connections between users
- **messages**: User-to-user communications
- **subscription_packages**: Available subscription tiers
- **subscription_features**: Features included in each package
- **user_subscriptions**: User subscription status
- **transactions**: Payment records
- **reported_content**: User reports for moderation
- **admin_logs**: Administrative action tracking

## 🚀 Installation and Setup

### Prerequisites
- Node.js (v14+)
- PostgreSQL (v12+)
- npm or yarn

### Backend Setup
1. Clone the repository
   ```
   git clone https://github.com/yourusername/meetcute.git
   cd meetcute/backend
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file with required environment variables:
   ```
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_USER=postgres
   DB_PASSWORD=yourpassword
   DB_NAME=meetcute
   JWT_SECRET=your-jwt-secret
   STRIPE_SECRET_KEY=your-stripe-secret-key
   FRONTEND_URL=http://localhost:5173
   ```

4. Initialize the database
   ```
   psql -U postgres -c "CREATE DATABASE meetcute"
   psql -U postgres -d meetcute -f database/schema.sql
   ```

5. Start the server
   ```
   npm run dev
   ```

### Frontend Setup
1. Navigate to frontend directory
   ```
   cd ../frontend
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file:
   ```
   VITE_API_URL=http://localhost:5000
   VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key
   VITE_SOCKET_URL=http://localhost:5000
   ```

4. Start the development server
   ```
   npm run dev
   ```

## 🔒 Authentication and Authorization

The application implements a JWT-based authentication system with the following user roles:
- **Regular**: Standard users with basic features
- **Premium**: Subscribed users with access to premium features
- **Admin**: Administrative users with access to the admin dashboard

## 💰 Subscription System

MeetCute offers a tiered subscription model:
- **Basic**: Entry-level features
- **Premium**: Enhanced features and visibility
- **Elite/VIP**: Full access to all platform features

Payment processing is integrated with Stripe for secure transactions.

## 🔍 Moderation System

The platform includes a robust moderation system that allows administrators to:
- Review reported content
- Take action against violating users
- Monitor platform activity through admin logs
- Maintain platform integrity

## 🔄 API Endpoints

The backend exposes the following primary API categories:
- `/api/auth`: Authentication and user registration
- `/api/user`: User profile management
- `/api/matches`: Match creation and management
- `/api/messages`: Messaging functionality
- `/api/admin`: Admin dashboard operations
- `/api/subscription`: Subscription management
- `/api/gifts`: Virtual gift functionality
- `/api/profile`: Profile management
- `/api/countries`: Country data for location settings

## 📱 Responsive Design

The frontend is fully responsive, providing optimal user experience across:
- Desktop computers
- Tablets
- Mobile phones

## 🔮 Future Enhancements

Planned features for future development:
- Video chat integration
- AI-based matching improvements
- Enhanced analytics dashboard
- Mobile applications (iOS/Android)
- Internationalization support

## ⚖️ License

This project is proprietary software and is not open for redistribution or modification without explicit permission.

## 👥 Development Team

MeetCute is developed and maintained by a dedicated team of developers committed to creating the best dating platform experience.

---

© 2025 MeetCute. All Rights Reserved.
