# Crypto Investment Platform

A modern, responsive cryptocurrency investment platform built with React, TypeScript, Tailwind CSS, and Supabase.

## 🚀 Features

- **Modern UI/UX**: Sleek design with 3D Bitcoin animation and crypto-themed gradients
- **User Authentication**: Secure login/signup with Supabase Auth
- **Dashboard**: Real-time portfolio tracking with interactive charts
- **Trading Signals**: Multi-level signal packages for enhanced profits
- **Deposits & Withdrawals**: Crypto wallet integration with admin approval system
- **Admin Panel**: Complete platform management and user oversight
- **Mobile Responsive**: Optimized for all devices
- **Real-time Updates**: Live transaction and balance updates

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **3D Graphics**: Three.js for Bitcoin animation
- **Charts**: Recharts for data visualization
- **UI Components**: Radix UI + shadcn/ui
- **Routing**: React Router DOM

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── Bitcoin3D.tsx       # 3D Bitcoin animation
│   ├── DashboardLayout.tsx # Dashboard wrapper
│   ├── Navigation.tsx      # Main navigation
│   └── ProtectedRoute.tsx  # Auth protection
├── pages/
│   ├── Auth.tsx           # Login/Signup
│   ├── Dashboard.tsx      # Main dashboard
│   ├── AdminPanel.tsx     # Admin interface
│   └── ...                # Other pages
├── hooks/
│   └── useAuth.ts         # Authentication hook
├── lib/
│   └── utils.ts           # Utility functions
└── integrations/
    └── supabase/          # Supabase client & types
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account

### 1. Clone Repository
```bash
git clone <repository-url>
cd crypto-investment-platform
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://tobkmqcbbxulvezhdzzo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvYmttcWNiYnh1bHZlemhkenpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMDQzMzAsImV4cCI6MjA3MDc4MDMzMH0.l458DTFc2bsYU5d-ghezdyuphbTJP7i4GFNBP0CFJY4

# Optional: Custom domain for production
VITE_APP_URL=https://your-domain.com
```

### 3. Database Setup
The database schema is automatically created via Supabase migrations. The following tables will be created:

- `profiles` - User profile data
- `deposits` - Deposit requests and approvals
- `withdrawals` - Withdrawal requests and approvals
- `transactions` - Transaction history
- `signals` - Trading signal packages

### 4. Development Server
```bash
npm run dev
```

Visit `http://localhost:5173` to view the application.

## 🚀 Deployment

### Option 1: Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Option 2: Netlify
1. Build the project: `npm run build`
2. Upload `dist` folder to Netlify
3. Configure environment variables
4. Set up continuous deployment

### Option 3: Hostinger/cPanel
1. Build the project: `npm run build`
2. Upload `dist` folder contents to `public_html`
3. Configure domain and SSL

## 🔐 Security Features

- **Row Level Security (RLS)**: Implemented on all Supabase tables
- **Authentication**: Secure JWT-based auth with Supabase
- **API Protection**: All endpoints require valid authentication
- **Environment Variables**: Sensitive data stored securely

## 📊 Database Schema

### Profiles Table
```sql
profiles (
  id UUID PRIMARY KEY,
  username TEXT,
  net_balance NUMERIC DEFAULT 0.00,
  total_invested NUMERIC DEFAULT 0.00,
  interest_earned NUMERIC DEFAULT 0.00,
  commissions NUMERIC DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### Deposits Table
```sql
deposits (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  amount NUMERIC NOT NULL,
  crypto_type TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### Withdrawals Table
```sql
withdrawals (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  amount NUMERIC NOT NULL,
  crypto_type TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### Signals Table
```sql
signals (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0.00,
  profit_multiplier NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### Transactions Table
```sql
transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)
```

## 🎨 Design System

The platform uses a custom design system with crypto-themed colors:

- **Primary**: Blue gradient (#3B82F6)
- **Secondary**: Purple (#8B5CF6)
- **Accent**: Gold (#F59E0B)
- **Success**: Green (#10B981)
- **Background**: Dark theme (#1A1A2E)

## 📱 Mobile Responsiveness

The platform is fully responsive with:
- Adaptive layouts for all screen sizes
- Touch-friendly interface elements
- Optimized 3D animations for mobile
- Responsive navigation and charts

## 🔄 Real-time Features

- Live balance updates
- Real-time transaction notifications
- Admin approval status updates
- Dynamic chart data

## 👨‍💼 Admin Features

- User management (view, edit, delete)
- Deposit/withdrawal approval system
- Signal package management
- Platform analytics and statistics
- Content management for frontend

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact: support@cryptoinvestment.com
- Documentation: [Full Documentation](docs/)

## 🔗 Links

- **Live Demo**: [https://your-domain.com](https://your-domain.com)
- **Admin Panel**: [https://your-domain.com/admin](https://your-domain.com/admin)
- **API Documentation**: [Supabase Dashboard](https://supabase.com/dashboard)

---

Built with ❤️ for the crypto community