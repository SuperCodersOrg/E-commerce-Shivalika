# E-Commerce Web Application

A full-stack Node.js and Express e-commerce application with MongoDB, EJS templating, user authentication, and cursor-based pagination.

## Features

- **User Authentication**:
  - Secure registration with password hashing (bcrypt)
  - Email verification workflow with offline/development fallback support
  - JWT session management via HTTP-only cookies
  - Password reset with secure time-limited tokens
- **Product Catalog**:
  - Product listing with cursor-based pagination ("Load More")
  - Automatic seed/import of DummyJSON products into MongoDB
  - Category tags and formatted price indicators
  - Image error fallback handling
- **Product Details**:
  - Detailed product view with thumbnail image gallery
  - Specification lists and brand info
- **Clean Architecture**:
  - MVC structure (Models, Views, Controllers, Routes, Services, Middleware)
  - Centralized error handling and 404 pages

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Templating**: EJS
- **Authentication**: JWT, bcrypt, cookie-parser
- **Email**: Nodemailer (with IPv4 optimization)

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB running locally or MongoDB Atlas connection string

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SuperCodersOrg/Ecommerce-Shivalika.git
   cd Ecommerce-Shivalika
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your values:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/ecommerce
   JWT_SECRET=your_jwt_secret
   BASE_URL=http://localhost:3000
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_gmail_app_password
   ```

4. **Start the server**:
   ```bash
   npm start
   ```
   For development with hot-reload:
   ```bash
   npm run dev
   ```

5. **Visit the app**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.
