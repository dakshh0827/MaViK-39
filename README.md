# MaViK-39: IoT-Based Laboratory Equipment Management System

<div align="center">

**Smart Equipment Monitoring & Management Platform for Industrial Training Institutes**

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-18.x-61dafb)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248)](https://www.mongodb.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Features](#-features) • [Tech Stack](#%EF%B8%8F-tech-stack) • [Setup Guide](#-setup-guide) • [Architecture](#%EF%B8%8F-architecture) • [API Documentation](#-api-documentation)

</div>

---

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [Features](#-features)
- [Tech Stack](#%EF%B8%8F-tech-stack)
- [Folder Structure](#-folder-structure)
- [Architecture](#%EF%B8%8F-architecture)
- [Setup Guide](#-setup-guide)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Usage Guide](#-usage-guide)
- [Future Enhancements](#-future-enhancements)

---

## 🎯 About the Project

**MaViK-39** is a comprehensive full-stack IoT platform designed specifically for Industrial Training Institutes (ITIs) to monitor, manage, and maintain laboratory equipment in real-time. The system seamlessly integrates hardware sensors (ESP32/Arduino) with a robust cloud backend infrastructure to track equipment health, predict failures using machine learning, and enforce biometric-based access control for enhanced student safety and accountability.

### 🔍 Problem Statement

Industrial Training Institutes face critical challenges in laboratory management:

- **⚠️ Unplanned Equipment Downtime**: Unexpected failures disrupt practical training sessions
- **🔐 Safety Concerns**: Unauthorized or untrained equipment usage leads to accidents
- **📝 Manual Monitoring Overhead**: Time-consuming manual inspection and logging processes
- **💰 Resource Wastage**: Inefficient maintenance scheduling and energy consumption
- **👤 Accountability Gap**: Lack of student usage tracking and responsibility enforcement
- **📊 Data Silos**: Disconnected systems preventing data-driven decision making

### 💡 Solution Overview

MaViK-39 addresses these challenges through an integrated approach:

- **Real-time IoT Monitoring**: Continuous sensor-based equipment health tracking with live dashboards
- **Predictive Analytics**: ML-powered failure prediction enabling proactive maintenance scheduling
- **Biometric Access Control**: Aadhaar-linked authentication ensuring secure and accountable equipment access
- **Role-Based Management**: Hierarchical access control for Policy Makers, Lab Managers, and Trainers
- **Automated Alerts**: Instant notifications for anomalies, maintenance needs, and safety violations
- **Comprehensive Analytics**: Department-specific metrics and institute-wide reporting capabilities

---

## ✨ Features

### 🔐 Authentication & Authorization

#### Multi-Role Access Control

- **Policy Maker**: Institute-level oversight and analytics
- **Lab Manager**: Department and lab management capabilities
- **Trainer**: Lab-specific equipment monitoring and student management

#### Secure Authentication

- OTP-based email verification
- JWT token management with automatic refresh
- Session management with secure httpOnly cookies

#### Biometric Student Authentication

- Aadhaar-based identity verification
- Fingerprint biometric authentication
- Equipment access logging and session tracking

---

### 📊 Real-time Monitoring & Analytics

#### Live Equipment Dashboard

- Real-time operational status (Operational, In Use, Idle, Maintenance, Faulty, Offline)
- Color-coded health scores (0-100 scale)
- Current sensor readings display

#### Sensor Data Tracking

- **Temperature Monitoring**: Overheating detection and alerts
- **Vibration Analysis**: Abnormal vibration detection
- **Energy Consumption**: Power usage tracking and optimization
- **Custom Parameters**: Department-specific metrics

---

#### Usage Analytics

- Equipment utilization rates
- Session duration tracking
- Class vs. individual usage breakdown
- Historical trend analysis

---

### 🤖 Predictive Maintenance System

#### ML-Based Failure Prediction

- Random Forest classifier model
- Features: Temperature, Vibration, Energy, Days Since Maintenance
- Probability-based risk assessment
- Flask-based ML service integration

#### Automated Maintenance Scheduling

- Intelligent scheduling based on predictions
- Maintenance history tracking
- Technician assignment workflow
- Cost estimation and tracking

#### Breakdown Management

- Automatic 15-day equipment health checks
- Breakdown reporting system
- Reorder request workflow for replacements
- Multi-stage approval process (Pending → Approved → Resolved)

---

### 🎯 Department-Specific Analytics

9 Engineering Trade Departments Supported:

1. **Fitter Manufacturing**
   - Arc stability, weld quality tracking
   - Bench drilling machine monitoring

2. **Electrical Engineering**
   - Voltage, current, power factor metrics
   - VFD and PLC training panel monitoring

3. **Welding & Fabrication**
   - Arc welding quality parameters
   - Gas welding kit tracking

4. **Tool & Die Making**
   - Precision level and surface finish metrics
   - EDM and jig boring equipment monitoring

5. **Additive Manufacturing**
   - 3D print quality and layer height tracking
   - Material usage optimization
   - Laser engraving parameters

6. **Solar Installer (PV)**
   - Solar efficiency and power output tracking
   - Battery health monitoring
   - Inverter performance metrics

7. **Material Testing & Quality**
   - Test accuracy and calibration status
   - Load capacity tracking
   - Environmental chamber monitoring

8. **Advanced Manufacturing (CNC)**
   - Spindle speed and feed rate optimization
   - Tool wear monitoring
   - Dimensional accuracy tracking

9. **Automotive Mechanic**
   - Engine performance metrics
   - Fuel efficiency tracking

---

### 🔔 Alert & Notification System

#### Real-time Alert Generation

- **Critical**: Immediate action required (temp > 100°C, vibration > 15 mm/s)
- **High**: Urgent attention needed (temp > 80°C, vibration > 10 mm/s)
- **Medium**: Monitor closely
- **Low**: Informational

#### Alert Types

- Fault Detection
- High Temperature
- Abnormal Vibration
- High Energy Consumption
- Maintenance Due
- Equipment Offline
- Low Health Score
- Breakdown Detection

#### Notification Delivery

- Real-time Socket.IO push notifications
- Email notifications (configurable)
- In-app notification center
- Role-based notification routing

---

### 📱 Single Line Diagram (SLD) Visualization

#### Interactive Lab Layout

- Drag-and-drop equipment positioning
- Customizable grid system (1-8 columns)
- Real-time status color coding

#### Visual Status Indicators

- 🟢 **Operational**: Green
- 🔵 **In Use**: Blue
- 🟡 **Idle**: Yellow
- 🟠 **Maintenance**: Orange
- 🔴 **Faulty**: Red
- ⚫ **Offline**: Gray

---

### 💬 AI Chatbot (n8n Integration)

#### Natural Language Processing

- Equipment status queries
- Maintenance schedule inquiries
- Alert history requests

#### Contextual Conversations

- Session-based memory
- Multi-turn dialogue support
- Context-aware responses

#### Equipment Briefing Generation

- AI-generated summaries
- Historical performance analysis
- Predictive insights

---

### 📈 Comprehensive Reporting

#### Report Types

- Daily Summary
- Weekly Summary
- Monthly Summary
- Equipment Health Reports
- Maintenance History
- Usage Analytics
- Alert History
- Energy Consumption
- Department Summary
- Lifecycle Reports

#### Export Options

- PDF generation
- CSV export
- Custom date range selection
- Scheduled report generation

---

### 🔒 Advanced Access Control System

#### Biometric Authentication Flow

1. Student scans Aadhaar number
2. Biometric verification (fingerprint)
3. Equipment unlocks upon successful authentication
4. Session timer starts (2-hour limit)

#### Cascading Lock Mechanism

- Dependent equipment auto-lock
- Example: Laser Engraver unlocks → CNC, Welding, 3D Printer unlock

#### Auto-Lock Features

- 2-hour session timeout (configurable)
- Runs every 5 minutes via cron job
- Manual revocation by trainers/managers

#### Access Logging

- Complete audit trail
- Session duration tracking
- Usage pattern analysis

---

### 📲 Mobile Application (Expo)

#### Student Features

- QR code scanner for equipment identification
- Personal usage dashboard
- Session history
- Push notifications

#### Trainer Features

- Mobile equipment monitoring
- Quick access revocation
- Alert management on-the-go

---

## 🛠️ Tech Stack

### Frontend (Web Application)
```
React 18.x                    - UI Framework
Vite                         - Build Tool & Dev Server
Zustand                      - State Management
Tailwind CSS                 - Styling Framework
Axios                        - HTTP Client
React Router v6              - Client-side Routing
Socket.IO Client             - Real-time Communication
Recharts                     - Data Visualization
Chart.js                     - Advanced Charting
React Icons                  - Icon Library
Lucide React                 - Additional Icons
UUID                         - Unique ID Generation
```

### Backend (Node.js API Server)
```
Node.js 18+                  - Runtime Environment
Express.js                   - Web Framework
Prisma                       - Database ORM
MongoDB                      - NoSQL Database
Socket.IO                    - WebSocket Server
JWT (jsonwebtoken)           - Authentication
bcryptjs                     - Password Hashing
Nodemailer                   - Email Service
Winston                      - Logging
Helmet                       - Security Headers
CORS                         - Cross-Origin Resource Sharing
express-validator            - Input Validation
express-rate-limit           - Rate Limiting
express-session              - Session Management
cookie-parser                - Cookie Parsing
Morgan                       - HTTP Request Logger
node-cron                    - Task Scheduling
dotenv                       - Environment Configuration
```

### Mobile Application
```
React Native                 - Mobile Framework
Expo SDK                     - Development Platform
React Navigation             - Navigation Library
React Native Paper           - UI Components
Expo Barcode Scanner         - QR Code Scanning
```

### IoT & Hardware Integration
```
ESP32 / Arduino              - Microcontroller
DHT22                        - Temperature & Humidity Sensor
MPU6050                      - Vibration/Accelerometer
ACS712                       - Current Sensor (Energy)
Firebase Realtime Database   - IoT Data Sync
Wi-Fi/MQTT                   - Communication Protocol
```

### Machine Learning Service
```
Python 3.10+                 - Programming Language
Flask 2.3.3                  - Micro Web Framework
scikit-learn 1.3.2           - ML Library
NumPy 1.26.4                 - Numerical Computing
Joblib 1.3.2                 - Model Serialization
Gunicorn 21.2.0              - WSGI HTTP Server
```

### AI Chatbot
```
n8n                          - Workflow Automation Platform
Webhook Integration          - Custom API Endpoints
```

### DevOps & Deployment
```
Git                          - Version Control
Render                       - Backend Hosting
Vercel                       - Frontend Hosting
Hugging Face Spaces          - ML Model Hosting
MongoDB Atlas                - Database Hosting
Firebase                     - IoT Data & Authentication
```

---

## 📁 Folder Structure
```
MaViK-39/
│
├── backend/                              # Node.js Express Backend
│   ├── config/                           # Configuration Files
│   │   ├── database.js                   # Prisma Database Client
│   │   ├── email.js                      # Nodemailer Configuration
│   │   ├── firebase.js                   # Firebase Admin SDK Setup
│   │   ├── passport.js                   # Passport OAuth Strategies
│   │   └── socketio.js                   # Socket.IO Configuration
│   │
│   ├── controllers/                      # Request Handlers
│   │   ├── auth.controller.js            # Authentication Logic
│   │   ├── user.controller.js            # User Management
│   │   ├── lab.controller.js             # Lab Operations
│   │   ├── institute.controller.js       # Institute Management
│   │   ├── equipment.controller.js       # Equipment CRUD + Metrics
│   │   ├── equipmentAuth.controller.js   # Biometric Access Control
│   │   ├── monitoring.controller.js      # Real-time Monitoring
│   │   ├── analytics.controller.js       # Analytics & Reports
│   │   ├── alert.controller.js           # Alert Management
│   │   ├── notification.controller.js    # Notification System
│   │   ├── maintenance.controller.js     # Maintenance Logs
│   │   ├── breakdown.controller.js       # Breakdown Management
│   │   ├── reorder.controller.js         # Reorder Requests
│   │   ├── chatbot.controller.js         # Chatbot Integration
│   │   ├── sldLayout.controller.js       # SLD Configuration
│   │   └── student.controller.js         # Student Management
│   │
│   ├── middlewares/                      # Express Middlewares
│   │   ├── auth.js                       # JWT Authentication
│   │   ├── rbac.js                       # Role-Based Access Control
│   │   ├── validation.js                 # Input Validation
│   │   ├── rateLimiter.js                # Rate Limiting
│   │   └── errorHandler.js               # Global Error Handler
│   │
│   ├── models/                           # Data Models (if using Mongoose)
│   │   └── [Generated by Prisma]
│   │
│   ├── routes/                           # API Routes
│   │   ├── index.js                      # Route Aggregator
│   │   ├── auth.routes.js                # /api/auth
│   │   ├── user.routes.js                # /api/users
│   │   ├── institute.routes.js           # /api/institutes
│   │   ├── lab.routes.js                 # /api/labs
│   │   ├── equipment.routes.js           # /api/equipment
│   │   ├── equipmentAuth.routes.js       # /api/equipment-auth
│   │   ├── monitoring.routes.js          # /api/monitoring
│   │   ├── analytics.routes.js           # /api/analytics
│   │   ├── alert.routes.js               # /api/alerts
│   │   ├── notification.routes.js        # /api/notifications
│   │   ├── maintenance.routes.js         # /api/maintenance
│   │   ├── breakdown.routes.js           # /api/breakdown
│   │   ├── reorder.routes.js             # /api/reorder
│   │   ├── report.routes.js              # /api/reports
│   │   ├── chatbot.routes.js             # /api/chatbot
│   │   ├── sld.routes.js                 # /api/sld-layouts
│   │   └── student.routes.js             # /api/students
│   │
│   ├── services/                         # Business Logic Services
│   │   ├── auth.service.js               # Authentication Service
│   │   ├── email.service.js              # Email Sending Service
│   │   ├── firebase.service.js           # Firebase Integration
│   │   ├── ml.service.js                 # ML Model Communication
│   │   └── report.service.js             # Report Generation
│   │
│   ├── jobs/                             # Scheduled Tasks
│   │   ├── breakdown.scheduler.js        # 15-day Breakdown Check
│   │   └── autoLock.scheduler.js         # 2-hour Session Timeout
│   │
│   ├── utils/                            # Utility Functions
│   │   ├── logger.js                     # Winston Logger
│   │   ├── constants.js                  # App Constants & Enums
│   │   ├── appError.js                   # Custom Error Class
│   │   └── helpers.js                    # Helper Functions
│   │
│   ├── prisma/                           # Prisma ORM
│   │   ├── schema.prisma                 # Database Schema
│   │   └── migrations/                   # Migration Files
│   │
│   ├── app.js                            # Express App Configuration
│   ├── server.js                         # Server Entry Point
│   ├── package.json                      # Dependencies
│   └── .env                              # Environment Variables
│
├── frontend/                             # React Web Application
│   ├── public/                           # Static Assets
│   │   ├── favicon.ico
│   │   └── index.html
│   │
│   ├── src/                              # Source Code
│   │   ├── assets/                       # Images, Fonts, etc.
│   │   │
│   │   ├── components/                   # React Components
│   │   │   ├── auth/                     # Authentication Components
│   │   │   │   ├── ProtectedRoute.jsx
│   │   │   │   └── RoleBasedRoute.jsx
│   │   │   │
│   │   │   ├── layout/                   # Layout Components
│   │   │   │   ├── DashboardLayout.jsx
│   │   │   │   ├── Navbar.jsx
│   │   │   │   └── Sidebar.jsx
│   │   │   │
│   │   │   ├── equipment/                # Equipment Components
│   │   │   │   ├── EquipmentCard.jsx
│   │   │   │   ├── EquipmentList.jsx
│   │   │   │   ├── EquipmentModal.jsx
│   │   │   │   └── SensorChart.jsx
│   │   │   │
│   │   │   ├── dashboard/                # Dashboard Components
│   │   │   │   ├── StatCard.jsx
│   │   │   │   ├── AlertsWidget.jsx
│   │   │   │   └── ChartWidget.jsx
│   │   │   │
│   │   │   ├── sld/                      # SLD Components
│   │   │   │   ├── SLDGrid.jsx
│   │   │   │   └── EquipmentNode.jsx
│   │   │   │
│   │   │   └── common/                   # Reusable Components
│   │   │       ├── Button.jsx
│   │   │       ├── Modal.jsx
│   │   │       ├── Table.jsx
│   │   │       └── Loader.jsx
│   │   │
│   │   ├── pages/                        # Page Components
│   │   │   ├── LandingPage.jsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── SignupPage.jsx
│   │   │   │   └── VerifyEmailPage.jsx
│   │   │   │
│   │   │   ├── dashboards/
│   │   │   │   ├── PolicyMakerDashboard.jsx
│   │   │   │   ├── LabManagerDashboard.jsx
│   │   │   │   ├── TrainerDashboard.jsx
│   │   │   │   ├── LabAnalyticsPage.jsx
│   │   │   │   └── ReorderRequestsPage.jsx
│   │   │   │
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── ChatbotPage.jsx
│   │   │   ├── SLDPage.jsx
│   │   │   ├── ReportGenerationPage.jsx
│   │   │   ├── HelpSupportPage.jsx
│   │   │   ├── UserGuidePage.jsx
│   │   │   └── VideoResourcePage.jsx
│   │   │
│   │   ├── stores/                       # Zustand State Stores
│   │   │   ├── authStore.js              # Authentication State
│   │   │   ├── equipmentStore.js         # Equipment State
│   │   │   ├── dashboardStore.js         # Dashboard State
│   │   │   ├── alertStore.js             # Alert State
│   │   │   ├── chatbotStore.js           # Chatbot State
│   │   │   └── sldLayoutStore.js         # SLD Layout State
│   │   │
│   │   ├── lib/                          # Library Configurations
│   │   │   └── axios.js                  # Axios Interceptors
│   │   │
│   │   ├── hooks/                        # Custom React Hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useSocket.js
│   │   │   └── useToast.js
│   │   │
│   │   ├── utils/                        # Utility Functions
│   │   │   ├── constants.js
│   │   │   ├── formatters.js
│   │   │   └── validators.js
│   │   │
│   │   ├── styles/                       # Global Styles
│   │   │   └── index.css
│   │   │
│   │   ├── App.jsx                       # Root Component
│   │   └── main.jsx                      # Entry Point
│   │
│   ├── .env                              # Environment Variables
│   ├── vite.config.js                    # Vite Configuration
│   ├── tailwind.config.js                # Tailwind Configuration
│   └── package.json                      # Dependencies
│
├── mobile/                               # React Native Mobile App
│   ├── src/
│   │   ├── components/                   # Mobile Components
│   │   ├── screens/                      # Screen Components
│   │   ├── navigation/                   # Navigation Configuration
│   │   └── services/                     # API Services
│   │
│   ├── assets/                           # Mobile Assets
│   ├── App.js                            # Root Component
│   ├── app.json                          # Expo Configuration
│   └── package.json                      # Dependencies
│
├── model/                                # Machine Learning Service
│   ├── app.py                            # Flask API Server
│   ├── save_model.py                     # Model Training Script
│   ├── predictive_maintenance_model.pkl  # Trained Model
│   ├── requirements.txt                  # Python Dependencies
│   └── runtime.txt                       # Python Version
│
├── hardware/                             # IoT Device Code
│   ├── esp32_sensor_node/                # ESP32 Firmware
│   │   ├── main.ino                      # Arduino Sketch
│   │   └── config.h                      # Hardware Configuration
│   │
│   └── firebase_integration/             # Firebase Sync Logic
│
├── docs/                                 # Documentation
│   ├── API.md                            # API Documentation
│   ├── DEPLOYMENT.md                     # Deployment Guide
│   └── ARCHITECTURE.md                   # System Architecture
│
├── .gitignore                            # Git Ignore Rules
├── LICENSE                               # License File
└── README.md                             # This File
```

---

## 🏗️ Architecture

### System Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Web App    │  │  Mobile App  │  │ IoT Kiosk    │             │
│  │   (React)    │  │ (React Native│  │ (Biometric)  │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                  │                      │
│         └──────────────────┴──────────────────┘                      │
│                            │                                         │
└────────────────────────────┼─────────────────────────────────────────┘
                             │ HTTPS/WSS
┌────────────────────────────┼─────────────────────────────────────────┐
│                            │  APPLICATION LAYER                      │
├────────────────────────────┼─────────────────────────────────────────┤
│  ┌─────────────────────────▼──────────────────────────┐             │
│  │         Express.js API Server (Node.js)            │             │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐          │             │
│  │  │   Auth   │ │   RBAC   │ │  Socket  │          │             │
│  │  │   JWT    │ │Middleware│ │   .IO    │          │             │
│  │  └──────────┘ └──────────┘ └──────────┘          │             │
│  └───────────────────────┬────────────────────────────┘             │
│                          │                                           │
│  ┌───────────────────────┼────────────────────────────┐             │
│  │  ML Service (Flask + Python)                       │             │
│  │  ┌──────────────────────────────────────┐         │             │
│  │  │  Random Forest Classifier Model      │         │             │
│  │  │  Predictive Maintenance Engine       │         │             │
│  │  └──────────────────────────────────────┘         │             │
│  └────────────────────────────────────────────────────┘             │
│                                                                      │
│  ┌──────────────────────────────────────────────────┐               │
│  │  n8n AI Chatbot Workflow Engine                 │               │
│  │  (Webhook Integration)                           │               │
│  └──────────────────────────────────────────────────┘               │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────────┐
│                          │  DATA LAYER                               │
├──────────────────────────┼───────────────────────────────────────────┤
│  ┌───────────────────────▼──────────────┐                           │
│  │  MongoDB Atlas (Prisma ORM)          │                           │
│  │  ┌────────────────────────────────┐  │                           │
│  │  │ Users, Equipment, Labs,        │  │                           │
│  │  │ Institutes, Alerts,            │  │                           │
│  │  │ Maintenance, Students          │  │                           │
│  │  └────────────────────────────────┘  │                           │
│  └───────────────────────────────────────┘                           │
│                                                                      │
│  ┌─────────────────────────────────────────┐                        │
│  │  Firebase Realtime Database             │                        │
│  │  (IoT Sensor Data Sync)                 │                        │
│  └─────────────────────────────────────────┘                        │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────────┐
│                          │  IOT LAYER                                │
├──────────────────────────┼───────────────────────────────────────────┤
│  ┌───────────────────────▼──────────────┐                           │
│  │  ESP32/Arduino Sensor Nodes          │                           │
│  │  ┌────────────┐ ┌────────────┐      │                           │
│  │  │   DHT22    │ │  MPU6050   │      │                           │
│  │  │(Temp/Humid)│ │ (Vibration)│      │                           │
│  │  └────────────┘ └────────────┘      │                           │
│  │  ┌────────────┐                      │                           │
│  │  │  ACS712    │                      │                           │
│  │  │  (Current) │                      │                           │
│  │  └────────────┘                      │                           │
│  └───────────────────────────────────────┘                           │
└───────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **IoT Device Flow:**
```
   ESP32 → Read Sensors → Firebase → Backend Polling → MongoDB → Frontend Update
```

2. **User Interaction Flow:**
```
   Frontend → API Request → RBAC Check → Controller → Service → Database → Response
```

3. **Real-time Alert Flow:**
```
   Sensor Data → Threshold Check → Alert Creation → Socket.IO Broadcast → 
   Frontend Notification
```

4. **Predictive Maintenance Flow:**
```
   Cron Job → Fetch Equipment Data → ML API Call → Prediction → 
   Schedule Maintenance → Notify Users
```

5. **Biometric Authentication Flow:**
```
   Student Aadhaar + Fingerprint → Backend Verification → Unlock Equipment → 
   Start Session → Auto-lock after 2 hours
```

---

## 🚀 Setup Guide

### Prerequisites

Ensure you have the following installed on your system:

- **Node.js** (v18.x or higher)
- **npm** or **yarn**
- **MongoDB** (Local or Atlas)
- **Python** (3.10+) for ML service
- **Git**
- **Expo CLI** (for mobile development)

---

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/mavik-39.git
cd mavik-39
```

---

### 2️⃣ Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Push database schema (if needed)
npx prisma db push

# Seed database (optional)
npm run seed

# Start development server
npm run dev
```

The backend server will start on `http://localhost:5000`

---

### 3️⃣ Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

---

### 4️⃣ Machine Learning Service Setup
```bash
cd model

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Train and save model (if not already present)
python save_model.py

# Start Flask server
python app.py
```

The ML service will run on `http://localhost:1240`

---

### 5️⃣ Mobile App Setup
```bash
cd mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start

# Scan QR code with Expo Go app on your mobile device
```

---

### 6️⃣ IoT Device Setup

1. Open **Arduino IDE**
2. Install **ESP32 board support**
3. Install required libraries:
   - DHT sensor library
   - MPU6050 library
   - Firebase ESP32 library
4. Open `hardware/esp32_sensor_node/main.ino`
5. Update Wi-Fi credentials and Firebase configuration
6. Upload to ESP32 device

---

## 🔐 Environment Variables

### Backend (.env)
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Session Configuration
SESSION_SECRET=your-session-secret-change-in-production

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM_EMAIL=noreply@mavik39.com

# Frontend URL
FRONTEND_URL=http://localhost:5173

# ML Service URL
ML_SERVICE_URL=http://localhost:1240

# Firebase Configuration
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=your-app-id

# n8n Chatbot Webhook
N8N_WEBHOOK_URL=https://your-n8n-instance.app.n8n.cloud/webhook/your-webhook-id
```

---

### Frontend (.env)
```env
# API Base URL
VITE_API_URL=http://localhost:5000/api

# For production (uncomment and update)
# VITE_API_URL=https://your-backend-domain.com/api

# Socket.IO URL (if different from API)
VITE_SOCKET_URL=http://localhost:5000
```

---

### ML Service (.env)
```env
# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=1

# Model Configuration
MODEL_PATH=./predictive_maintenance_model.pkl
```

---

## 📚 API Documentation

### Base URL
```
Development: http://localhost:5000/api
Production: https://mavik-39.onrender.com/api
```

---

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "TRAINER",
  "phone": "+919876543210",
  "department": "ELECTRICAL_ENGINEERING",
  "instituteId": "ITI-001",
  "labId": "LAB-001"
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "message": "OTP sent to email. Please verify."
}
```

---

#### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { /* user object */ }
  }
}
```

---

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "TRAINER"
    }
  }
}
```

---

#### Refresh Token
```http
POST /api/auth/refresh
Cookie: refreshToken=<token>
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-access-token"
  }
}
```

---

### Equipment Endpoints

#### Get All Equipment
```http
GET /api/equipment?page=1&limit=10&department=ELECTRICAL_ENGINEERING
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": [ /* equipment array */ ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

#### Get Equipment by ID
```http
GET /api/equipment/:id
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "equipmentId": "LAB-001",
    "name": "CNC Machine",
    "status": {
      "status": "OPERATIONAL",
      "healthScore": 85,
      "temperature": 45,
      "vibration": 2.5
    },
    "analyticsParams": {
      "efficiency": 92,
      "totalUptime": 150
    }
  }
}
```

---

#### Create Equipment
```http
POST /api/equipment
Authorization: Bearer <token>
Content-Type: application/json

{
  "equipmentId": "CNC-001",
  "name": "CNC Vertical Machining Center",
  "department": "ADVANCED_MANUFACTURING_CNC",
  "equipmentName": "CNC_VERTICAL_MACHINING_CENTER_3_4_AXIS",
  "manufacturer": "Haas Automation",
  "model": "VF-2SS",
  "serialNumber": "SN123456",
  "purchaseDate": "2023-01-15",
  "warrantyExpiry": "2026-01-15",
  "labId": "LAB-001",
  "specifications": {
    "axes": 3,
    "spindleSpeed": 12000,
    "toolCapacity": 20
  }
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "message": "Equipment created successfully",
  "data": { /* created equipment */ }
}
```

---

### Monitoring Endpoints

#### Get Dashboard Overview
```http
GET /api/monitoring/dashboard
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalEquipment": 120,
      "activeEquipment": 95,
      "unresolvedAlerts": 8,
      "maintenanceDue": 5,
      "avgHealthScore": 87
    },
    "recentAlerts": [ /* alert array */ ],
    "equipmentByStatus": [ /* status breakdown */ ]
  }
}
```

---

#### Get Lab Analytics
```http
GET /api/monitoring/lab-analytics/:labId
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "lab": { /* lab details */ },
    "statistics": {
      "totalEquipment": 15,
      "avgHealthScore": 88,
      "avgEfficiency": 85,
      "totalUptime": 1200,
      "operationalCount": 10,
      "inUseCount": 3
    },
    "departmentMetrics": { /* aggregated metrics */ },
    "equipment": [ /* equipment array with analytics */ ]
  }
}
```

---

### Alert Endpoints

#### Get Alerts
```http
GET /api/alerts?page=1&limit=20&severity=CRITICAL
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": [ /* alert array */ ],
  "pagination": { /* pagination info */ }
}
```

---

#### Resolve Alert
```http
PATCH /api/alerts/:id/resolve
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Replaced faulty sensor"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Alert resolved successfully"
}
```

---

### Maintenance Endpoints

#### Create Maintenance Log
```http
POST /api/maintenance
Authorization: Bearer <token>
Content-Type: application/json

{
  "equipmentId": "507f1f77bcf86cd799439011",
  "type": "PREVENTIVE",
  "scheduledDate": "2024-02-15T10:00:00Z",
  "description": "Routine maintenance check",
  "notes": "All systems normal"
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "message": "Maintenance log created successfully",
  "data": { /* maintenance log */ }
}
```

---

#### Mark Maintenance
```http
POST /api/maintenance/mark/:equipmentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "maintenanceType": "Preventive Maintenance",
  "notes": "Completed scheduled maintenance"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Maintenance marked successfully"
}
```

---

### Student Authentication Endpoints

#### Authenticate Student (Biometric)
```http
POST /api/equipment-auth/authenticate
Content-Type: application/json

{
  "aadhaarNumber": "123456789012",
  "biometricData": {
    "credentialId": "fingerprint-hash",
    "type": "FINGERPRINT"
  },
  "equipmentId": "507f1f77bcf86cd799439011"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Unlocked successfully",
  "data": {
    "studentName": "Rahul"
  }
}
```

---

#### Revoke Access
```http
POST /api/equipment-auth/revoke/:equipmentId
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Access revoked. Equipment locked."
}
```

---

### Chatbot Endpoints

#### Send Message
```http
POST /api/chatbot/message
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "What is the status of CNC Machine?"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "message": "What is the status of CNC Machine?",
    "response": "The CNC Machine is currently OPERATIONAL with a health score of 85%."
  }
}
```

---

#### Get Chat History
```http
GET /api/chatbot/history
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": [ /* message history */ ]
}
```

---

### ML Prediction Endpoint

#### Get Maintenance Prediction
```http
POST http://localhost:1240/predict
Content-Type: application/json

{
  "Machine_ID": 1,
  "Hourly_Usage": 0.35,
  "Temperature_C": 75,
  "Vibration_mms": 5.2,
  "Energy_Consumption_W": 450,
  "Days_Since_Weekly_Maintenance": 4,
  "Maintenance_Type": 2
}
```

**Response: 200 OK**
```json
{
  "prediction": 1,
  "probability_percentage": 0.78,
  "status": "success"
}
```

---

## 📖 Usage Guide

### For Policy Makers

1. **Login** with Policy Maker credentials
2. **View Institute-wide Dashboard**
   - Total equipment across all institutes
   - Unresolved alerts summary
   - Institute comparison metrics
3. **Access Institute Analytics**
   - Click on any institute card
   - View lab-wise breakdown
   - Generate comparative reports
4. **Manage Users**
   - Create Lab Managers and Trainers
   - Assign roles and permissions
5. **Generate Reports**
   - Navigate to Reports section
   - Select report type and date range
   - Export as PDF/CSV

---

### For Lab Managers

1. **Login** with Lab Manager credentials
2. **View Department Dashboard**
   - Equipment health overview
   - Alerts for your department
   - Maintenance schedule
3. **Manage Equipment**
   - Add new equipment
   - Update equipment details
   - View equipment analytics
4. **Handle Maintenance**
   - Mark equipment for maintenance
   - View maintenance history
   - Approve reorder requests
5. **Monitor Labs**
   - Click on lab cards
   - View SLD (Single Line Diagram)
   - Track student usage

---

### For Trainers

1. **Login** with Trainer credentials
2. **View Lab Dashboard**
   - Real-time equipment status
   - Recent alerts
   - Student session tracking
3. **Monitor Equipment**
   - Check health scores
   - View sensor data charts
   - Receive anomaly alerts
4. **Manage Student Access**
   - View active sessions
   - Manually revoke access if needed
   - Check access logs
5. **Use AI Chatbot**
   - Ask equipment status questions
   - Get maintenance recommendations
   - Request analytics briefings

---

### For Students (Mobile App)

1. **Scan QR Code** on equipment
2. **Authenticate** using Aadhaar + Biometric
3. **Use Equipment** (session starts)
4. **Automatic Lock** after 2 hours or manual end
5. **View Usage History** in profile

---

## 🤝 Contributing

We welcome contributions from the community! Please follow these guidelines:

### How to Contribute

1. **Fork the Repository**
```bash
   git fork https://github.com/yourusername/mavik-39.git
```

2. **Create a Feature Branch**
```bash
   git checkout -b feature/your-feature-name
```

3. **Make Changes**
   - Write clean, documented code
   - Follow existing code style
   - Add comments where necessary

4. **Commit Changes**
```bash
   git commit -m "feat: add new feature description"
```

5. **Push to Branch**
```bash
   git push origin feature/your-feature-name
```

6. **Create Pull Request**
   - Provide detailed description
   - Reference any related issues
   - Wait for code review

---

### Code Style Guidelines

- **JavaScript/React**: ESLint + Prettier
- **Python**: PEP 8
- **Naming Conventions**: camelCase for JS, snake_case for Python
- **Comments**: JSDoc for functions

---

## 🔮 Future Enhancements

### Phase 1: Enhanced Features (Q2 2024)

- [ ] **Multi-language Support**
  - Hindi, Tamil, Telugu, Bengali UI translations
  - Regional language chatbot support

- [ ] **Advanced Analytics**
  - Predictive energy consumption forecasting
  - Equipment lifecycle cost analysis
  - ROI calculator for equipment investments

- [ ] **Mobile App Expansion**
  - iOS app development
  - Offline mode with sync
  - AR-based equipment guides

- [ ] **Video Surveillance Integration**
  - Safety monitoring with AI
  - Automated incident detection
  - Recording of equipment usage sessions

---

### Phase 2: AI & Automation (Q3 2024)

- [ ] **Computer Vision Integration**
  - Automatic equipment condition assessment
  - PPE (Personal Protective Equipment) detection
  - Anomaly detection via camera feeds

- [ ] **Enhanced ML Models**
  - LSTM for time-series prediction
  - Anomaly detection using autoencoders
  - Multi-equipment failure correlation analysis

- [ ] **Voice Assistant**
  - Voice commands for hands-free operation
  - Audio alerts for safety warnings
  - Voice-based equipment status queries

- [ ] **Automated Report Generation**
  - AI-generated insights and recommendations
  - Scheduled email reports
  - Natural language report summaries

---

### Phase 3: Integration & Scalability (Q4 2024)

- [ ] **ERP Integration**
  - SAP integration for inventory management
  - Finance module integration
  - Procurement system connection

- [ ] **Third-party Sensor Support**
  - Support for industrial-grade sensors
  - Integration with existing IoT infrastructure
  - API for custom sensor integration

- [ ] **Blockchain for Audit Trail**
  - Immutable equipment usage logs
  - Maintenance record verification
  - Certification tracking

- [ ] **Microservices Architecture**
  - Service-based architecture for scalability
  - Independent service deployment
  - Load balancing and fault tolerance

---

### Phase 4: Advanced Capabilities (2025)

- [ ] **Digital Twin Technology**
  - Virtual equipment replicas
  - Simulation before physical operation
  - Scenario testing and optimization

- [ ] **Edge Computing**
  - Local processing on IoT devices
  - Reduced latency for critical alerts
  - Offline functionality with edge sync

- [ ] **Augmented Reality (AR) Maintenance**
  - AR-guided repair instructions
  - Remote expert assistance
  - Virtual overlay of equipment specs

- [ ] **Federated Learning**
  - Cross-institute ML model training
  - Privacy-preserving analytics
  - Collaborative improvement without data sharing

---

### Long-term Vision

- [ ] **National ITI Network**
  - Inter-institute resource sharing
  - Best practices exchange platform
  - Centralized skill development tracking

- [ ] **Industry Partnership Portal**
  - Equipment sponsorship platform
  - Internship coordination
  - Job placement integration

- [ ] **Skill Certification System**
  - Equipment proficiency tracking
  - Digital certificates for students
  - Industry-recognized credentials

---

### Links

- **Website**: [https://mavik-39.vercel.app](https://mavik-39.vercel.app)
- **GitHub**: [https://github.com/yourusername/mavik-39](https://github.com/dakshh0827/MaViK-39)

---

<div align="center">

**Made with ❤️ by Team MaViK-39**

*Empowering Industrial Training Institutes with Smart Technology*

</div>
