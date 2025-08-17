import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  Wallet, 
  TrendingUp, 
  Shield, 
  DollarSign,
  ArrowRight,
  Star
} from 'lucide-react';

const DashboardTutorial = () => {
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);

  const markAsCompleted = (tutorialId: string) => {
    if (!completedTutorials.includes(tutorialId)) {
      setCompletedTutorials([...completedTutorials, tutorialId]);
    }
  };

  const beginner_tutorials = [
    {
      id: 'crypto-basics',
      title: 'Cryptocurrency Basics',
      description: 'Learn the fundamentals of cryptocurrency and blockchain technology',
      duration: '15 min',
      level: 'Beginner',
      video: 'https://example.com/crypto-basics',
      icon: BookOpen,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      id: 'account-setup',
      title: 'Setting Up Your Account',
      description: 'Complete guide to setting up and securing your CryptoVault account',
      duration: '10 min',
      level: 'Beginner',
      video: 'https://example.com/account-setup',
      icon: Shield,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      id: 'first-deposit',
      title: 'Making Your First Deposit',
      description: 'Step-by-step guide to depositing funds into your account',
      duration: '12 min',
      level: 'Beginner',
      video: 'https://example.com/first-deposit',
      icon: Wallet,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    }
  ];

  const intermediate_tutorials = [
    {
      id: 'trading-signals',
      title: 'Understanding Trading Signals',
      description: 'Learn how to use our AI-powered trading signals effectively',
      duration: '20 min',
      level: 'Intermediate',
      video: 'https://example.com/trading-signals',
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      id: 'portfolio-management',
      title: 'Portfolio Management Strategies',
      description: 'Advanced techniques for managing your crypto portfolio',
      duration: '25 min',
      level: 'Intermediate',
      video: 'https://example.com/portfolio-management',
      icon: DollarSign,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10'
    },
    {
      id: 'risk-management',
      title: 'Risk Management Best Practices',
      description: 'Learn how to minimize risks and protect your investments',
      duration: '18 min',
      level: 'Intermediate',
      video: 'https://example.com/risk-management',
      icon: Shield,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    }
  ];

  const faqs = [
    {
      question: 'How do I make my first deposit?',
      answer: 'Navigate to the Deposit page, enter your desired amount, select your cryptocurrency, and follow the provided wallet address instructions.'
    },
    {
      question: 'What are trading signals?',
      answer: 'Trading signals are AI-powered recommendations that help you make informed investment decisions based on market analysis and trends.'
    },
    {
      question: 'How long do withdrawals take?',
      answer: 'Withdrawals are typically processed within 24-48 hours after admin approval, depending on network congestion.'
    },
    {
      question: 'Is my money safe on CryptoVault?',
      answer: 'Yes, we use industry-standard security measures including SSL encryption, cold storage for funds, and multi-factor authentication.'
    },
    {
      question: 'What are the different signal levels?',
      answer: 'We offer 7 signal levels (Bronze to Diamond) with varying profit potentials and speeds. Higher levels provide faster and potentially more profitable signals.'
    }
  ];

  const TutorialCard = ({ tutorial, category }: { tutorial: any, category: string }) => {
    const Icon = tutorial.icon;
    const isCompleted = completedTutorials.includes(tutorial.id);

    return (
      <Card className={`${tutorial.bgColor} border-border/50 hover:border-border transition-colors`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${tutorial.bgColor}`}>
                <Icon className={`h-5 w-5 ${tutorial.color}`} />
              </div>
              <div>
                <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {tutorial.level}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {tutorial.duration}
                  </span>
                </div>
              </div>
            </div>
            {isCompleted ? (
              <CheckCircle className="h-6 w-6 text-crypto-green" />
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAsCompleted(tutorial.id)}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Start
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{tutorial.description}</p>
          <div className="flex justify-between items-center">
            <Button
              variant={isCompleted ? "secondary" : "default"}
              className="gap-2"
              disabled={isCompleted}
              onClick={() => markAsCompleted(tutorial.id)}
            >
              {isCompleted ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Completed
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Watch Tutorial
                </>
              )}
            </Button>
            {!isCompleted && (
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const completionPercentage = Math.round((completedTutorials.length / (beginner_tutorials.length + intermediate_tutorials.length)) * 100);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tutorial Center</h1>
            <p className="text-muted-foreground">Learn how to maximize your crypto investment potential</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold bg-crypto-gradient bg-clip-text text-transparent">
              {completionPercentage}%
            </div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </div>

        {/* Progress Overview */}
        <Card className="bg-gradient-to-r from-crypto-blue/10 to-crypto-purple/10 border-crypto-blue/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Your Learning Progress</h3>
                <p className="text-muted-foreground">
                  {completedTutorials.length} of {beginner_tutorials.length + intermediate_tutorials.length} tutorials completed
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-crypto-orange" />
                <span className="font-medium">Learning Streak</span>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="h-3 rounded-full bg-crypto-gradient"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tutorial Tabs */}
        <Tabs defaultValue="beginner" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="beginner">Beginner</TabsTrigger>
            <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
          </TabsList>
          
          <TabsContent value="beginner" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
              {beginner_tutorials.map((tutorial) => (
                <TutorialCard key={tutorial.id} tutorial={tutorial} category="beginner" />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="intermediate" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
              {intermediate_tutorials.map((tutorial) => (
                <TutorialCard key={tutorial.id} tutorial={tutorial} category="intermediate" />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="faq" className="space-y-4">
            <div className="grid gap-4">
              {faqs.map((faq, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" className="h-16 flex-col gap-2">
                <Wallet className="h-5 w-5" />
                <span className="text-sm">Deposit Guide</span>
              </Button>
              <Button variant="outline" className="h-16 flex-col gap-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm">Trading Signals</span>
              </Button>
              <Button variant="outline" className="h-16 flex-col gap-2">
                <Shield className="h-5 w-5" />
                <span className="text-sm">Security Tips</span>
              </Button>
              <Button variant="outline" className="h-16 flex-col gap-2">
                <DollarSign className="h-5 w-5" />
                <span className="text-sm">Profit Strategies</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardTutorial;