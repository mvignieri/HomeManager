# 🏠 DailyTaskMaster

> A modern, collaborative task management system for shared households with smart home integration

**DailyTaskMaster** is a Progressive Web App (PWA) designed for managing household tasks, coordinating with family members or roommates, and integrating with smart home devices. Built with a mobile-first approach, it features real-time notifications, drag-and-drop task management, and seamless multi-device synchronization.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mvignieri/DailyTaskMaster)

---

## ✨ Features

### 🎯 Task Management
- **Trello-style Kanban board** with drag-and-drop functionality
- Multiple task states: Created → Assigned → In Progress → Completed
- Priority levels (Low, Medium, High)
- Task assignment with automatic notifications
- Due dates and effort tracking
- Rich task descriptions

### 🏡 House Management
- **Multi-house support** - manage multiple households
- **Role-based permissions** (Owner, Admin, Member)
- **Email invitations** for new members
- Member management with customizable permissions

### 🔔 Notifications
- **Push notifications** via Firebase Cloud Messaging
- Cross-device synchronization
- In-app notification center
- Email notifications for invitations
- Real-time updates for task assignments

### 📱 Progressive Web App
- **Installable** on mobile and desktop
- **Offline-capable** with Service Worker
- **Responsive design** - mobile-first approach
- Native app-like experience
- Bottom navigation on mobile, sidebar on desktop

### 🔐 Authentication
- **Google Sign-In** via Firebase Authentication
- Secure session management
- User profiles with avatars

### 📊 Analytics (Coming Soon)
- Task completion rates
- User performance metrics
- Activity tracking
- Visual charts and insights

### 🏠 Smart Home Integration (Coming Soon)
- Device management
- Status monitoring
- Quick controls
- Automation support

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TanStack Query** - Data fetching and caching
- **Wouter** - Lightweight routing
- **@dnd-kit** - Drag and drop
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Recharts** - Data visualization
- **Framer Motion** - Animations

### Backend
- **Express.js** - Web framework
- **Node.js** - Runtime
- **PostgreSQL** - Database
- **Drizzle ORM** - Database toolkit
- **Firebase Admin SDK** - Push notifications
- **Nodemailer** - Email service

### Services & Infrastructure
- **Firebase** - Authentication & Cloud Messaging
- **Vercel** - Hosting and deployment
- **PostgreSQL** - Database (Vercel Postgres, Supabase, or Neon)
- **SendGrid/Mailgun** - Email delivery
- **Service Workers** - Offline support & push notifications

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or cloud)
- Firebase project
- Email service (SendGrid, Mailgun, or Mailhog for development)

### Installation

```bash
# Clone the repository
git clone https://github.com/mvignieri/DailyTaskMaster.git
cd DailyTaskMaster

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env

# Configure your .env file with:
# - Database connection string
# - Firebase credentials
# - Email service credentials
# (See Configuration section below)

# Initialize database
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/daily-task-master

# Firebase Client (Frontend)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_VAPID_KEY=your-vapid-key

# Firebase Admin (Backend)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Email Service (Development - Mailhog)
# Production - configure SendGrid, Mailgun, etc.
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-api-key
EMAIL_FROM=noreply@yourdomain.com
```

See [.env.example](./.env.example) for detailed configuration.

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Google Authentication
3. Enable Cloud Messaging
4. Generate Web Push certificates (VAPID key)
5. Download Service Account key for Admin SDK
6. Update `client/public/firebase-messaging-sw.js` with your Firebase config

### Database Setup

```bash
# Using Drizzle ORM
npm run db:push

# Or manually execute database-schema.sql
psql $DATABASE_URL < database-schema.sql
```

---

## 📦 Deployment

### Deploy to Vercel (Recommended)

**Quick Deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mvignieri/DailyTaskMaster)

**Manual Deployment:**

1. **Read the Quick Start Guide**: [DEPLOY_QUICKSTART.md](./DEPLOY_QUICKSTART.md) (10-20 minutes)

2. **Configure Services**:
   - Set up Vercel Postgres (or Supabase/Neon)
   - Configure Firebase (Authentication + Cloud Messaging)
   - Set up SendGrid or Mailgun for emails

3. **Deploy**:
   ```bash
   # Via Vercel CLI
   npm install -g vercel
   vercel --prod
   ```

4. **Initialize Database**:
   - Execute `database-schema.sql` in your production database

5. **Verify**:
   - Follow [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

**Complete Documentation:**
- 📄 [Deployment Overview](./DEPLOY_README.md)
- ⚡ [Quick Start Guide](./DEPLOY_QUICKSTART.md)
- 📚 [Complete Deployment Guide](./DEPLOYMENT_GUIDE.md)
- ✅ [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)

---

## 🏗️ Project Structure

```
DailyTaskMaster/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── context/         # React Context providers
│   │   ├── lib/             # Utilities and configurations
│   │   └── main.tsx         # Application entry point
│   └── public/              # Static assets
│       ├── manifest.json    # PWA manifest
│       ├── sw.js           # Service Worker
│       └── firebase-messaging-sw.js  # FCM Service Worker
│
├── server/                   # Backend Express application
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── pg-storage.ts       # Database operations
│   ├── email.ts            # Email service
│   └── firebase-admin.ts   # Push notifications
│
├── shared/                  # Shared code between client/server
│   └── schema.ts           # Database schema and types
│
├── api/                     # Vercel serverless functions
│   └── index.ts            # API handler for Vercel
│
├── database-schema.sql      # PostgreSQL schema
├── vercel.json             # Vercel configuration
└── [DEPLOY_*.md]           # Deployment documentation
```

---

## 🎮 Usage

### Creating a House

1. Sign in with Google
2. Click "Create New House" or use the modal that appears
3. Enter a house name
4. You're automatically added as the owner

### Inviting Members

1. Go to Settings → Members
2. Click "Invite Member"
3. Enter email address and select role
4. Member receives email invitation
5. They click the link and accept the invitation

### Managing Tasks

1. Click "+" to create a new task
2. Fill in title, description, priority, and due date
3. Assign to a house member (optional)
4. Drag and drop tasks between columns to change status
5. Assigned members receive push notifications

### Push Notifications

1. Grant notification permissions when prompted
2. Install the PWA for best experience
3. Receive notifications when:
   - A task is assigned to you
   - You're invited to a house
   - Task updates occur

---

## 🧪 Development

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Type checking
npm run check

# Database migrations
npm run db:push
```

### Development Services

**Mailhog (Email Testing)**
```bash
# Start Mailhog via Docker
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# View emails at http://localhost:8025
```

**PostgreSQL (Local Database)**
```bash
# Start PostgreSQL via Docker
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_DB=daily-task-master \
  -p 5432:5432 \
  postgres:16

# Connection string
DATABASE_URL=postgresql://postgres:mysecretpassword@localhost:5432/daily-task-master
```

---

## 🐛 Troubleshooting

### Common Issues

**Firebase Auth not working**
- Verify authorized domains in Firebase Console
- Check Firebase configuration in `.env`

**Push notifications not arriving**
- Ensure VAPID key is configured
- Verify service worker is registered
- Check browser notification permissions

**Database connection failed**
- Verify connection string includes `?sslmode=require` for cloud databases
- Check database is running and accessible

**Build errors**
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (18+ required)
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for more troubleshooting tips.

---

## 🗺️ Roadmap

### Phase 1: Core Features ✅
- [x] Task management with Kanban board
- [x] House and member management
- [x] Email invitations
- [x] Push notifications
- [x] PWA support
- [x] Mobile-first responsive design

### Phase 2: Enhancements 🚧
- [ ] Smart home device integration
- [ ] Analytics and insights
- [ ] Recurring tasks
- [ ] Task templates
- [ ] File attachments
- [ ] Comments and discussions

### Phase 3: Advanced Features 📋
- [ ] Calendar view
- [ ] Task dependencies
- [ ] Time tracking
- [ ] Automation rules
- [ ] Mobile native apps (iOS/Android)
- [ ] Voice assistant integration

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Mario Vignieri**
- GitHub: [@mvignieri](https://github.com/mvignieri)
- Repository: [DailyTaskMaster](https://github.com/mvignieri/DailyTaskMaster)

---

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Firebase](https://firebase.google.com/) for authentication and messaging
- [Vercel](https://vercel.com/) for hosting and deployment
- [Drizzle ORM](https://orm.drizzle.team/) for the excellent database toolkit

---

## 📞 Support

For issues, questions, or suggestions:
- 🐛 [Open an issue](https://github.com/mvignieri/DailyTaskMaster/issues)
- 📧 Contact: [Create an issue for support]

---

## 🌟 Star History

If you find this project useful, please consider giving it a star ⭐

---

**Built with ❤️ for better household management**
