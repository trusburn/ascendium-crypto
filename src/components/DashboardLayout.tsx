import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useFrozenStatus } from '@/hooks/useFrozenStatus';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight,
  Signal, 
  BookOpen, 
  User, 
  Settings, 
  LogOut,
  Menu,
  History,
  X
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

// Floating crypto elements for dashboard
const FloatingDashboardElements = () => {
  const elements = [
    { symbol: '₿', x: 5, y: 20, size: 20, delay: 0 },
    { symbol: 'Ξ', x: 92, y: 40, size: 18, delay: 2 },
    { symbol: '◈', x: 8, y: 70, size: 16, delay: 4 },
    { symbol: '◆', x: 95, y: 80, size: 14, delay: 1 },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {elements.map((el, i) => (
        <motion.div
          key={i}
          className="absolute text-crypto-blue/10"
          style={{ left: `${el.x}%`, top: `${el.y}%`, fontSize: el.size }}
          animate={{
            y: [0, -20, 0, 20, 0],
            rotate: [0, 5, 0, -5, 0],
          }}
          transition={{
            duration: 15 + i * 2,
            repeat: Infinity,
            delay: el.delay,
          }}
        >
          {el.symbol}
        </motion.div>
      ))}
    </div>
  );
};

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { signOut } = useAuth();
  const { isFrozen } = useFrozenStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', href: '/dashboard/transactions', icon: TrendingUp },
    { name: 'Deposit', href: '/dashboard/deposit', icon: ArrowUpRight },
    { name: 'Withdrawal', href: '/dashboard/withdrawal', icon: ArrowDownLeft },
    { name: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
    { name: 'Swap', href: '/dashboard/swap', icon: ArrowLeftRight },
    { name: 'Signals', href: '/dashboard/signals', icon: Signal },
    { name: 'Trade History', href: '/dashboard/trade-history', icon: History },
    { name: 'Tutorial', href: '/dashboard/tutorial', icon: BookOpen },
    { name: 'Profile', href: '/dashboard/profile', icon: User },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Floating background elements */}
      <FloatingDashboardElements />
      
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-crypto-blue/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-80 h-80 bg-crypto-purple/5 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        className={`
          fixed top-0 left-0 z-50 h-full w-64 
          bg-muted/80 backdrop-blur-xl border-r border-border/50
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        `}
        initial={false}
      >
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <motion.a 
            href="/"
            className="text-xl font-bold bg-crypto-gradient bg-clip-text text-transparent"
            whileHover={{ scale: 1.05 }}
          >
            ₿ CryptoVault
          </motion.a>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`w-full justify-start transition-all duration-300 ${
                    isActive 
                      ? 'bg-crypto-gradient text-background shadow-lg shadow-crypto-blue/20' 
                      : 'hover:bg-muted-foreground/10 hover:translate-x-1'
                  }`}
                  onClick={() => {
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.name}
                </Button>
              </motion.div>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              className="w-full justify-start border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign Out
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="lg:ml-64 relative z-10">
        {/* Top Header */}
        <motion.header 
          className="bg-background/50 backdrop-blur-xl border-b border-border/50 p-4 sticky top-0 z-20"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="text-xl font-semibold bg-crypto-gradient bg-clip-text text-transparent">
              Dashboard
            </div>
            <div className="w-10 lg:w-0"></div>
          </div>
        </motion.header>

        {/* Frozen Account Banner */}
        <AnimatePresence>
          {isFrozen && (
            <motion.div 
              className="bg-destructive text-destructive-foreground p-4 flex items-center justify-center gap-2"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">
                Your account has been frozen. You cannot make deposits, withdrawals, or trades. Please contact support.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Content */}
        <motion.main 
          className="p-3 sm:p-4 lg:p-6 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
};
