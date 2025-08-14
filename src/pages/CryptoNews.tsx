import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, User } from 'lucide-react';

const CryptoNews = () => {
  const newsArticles = [
    {
      id: 1,
      title: "Bitcoin Reaches New All-Time High as Institutional Adoption Soars",
      excerpt: "Major corporations continue to add Bitcoin to their balance sheets, driving unprecedented institutional adoption and pushing prices to new records.",
      category: "Bitcoin",
      trend: "up",
      author: "Sarah Kim",
      date: "2024-01-15",
      readTime: "5 min read",
      image: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=250&fit=crop"
    },
    {
      id: 2,
      title: "Ethereum 2.0 Staking Rewards Hit Historic Levels",
      excerpt: "ETH staking yields reach 8.5% as network participation increases and new DeFi protocols launch on the upgraded infrastructure.",
      category: "Ethereum",
      trend: "up",
      author: "Mike Chen",
      date: "2024-01-14",
      readTime: "7 min read",
      image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=250&fit=crop"
    },
    {
      id: 3,
      title: "New Regulatory Framework Boosts Crypto Market Confidence",
      excerpt: "Clear guidelines from major financial regulators provide much-needed clarity for institutional investors entering the crypto space.",
      category: "Regulation",
      trend: "up",
      author: "Emma Rodriguez",
      date: "2024-01-13",
      readTime: "6 min read",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop"
    },
    {
      id: 4,
      title: "DeFi Protocols Show Strong Recovery After Market Turbulence",
      excerpt: "Decentralized finance platforms demonstrate resilience with total value locked recovering to $120 billion across major protocols.",
      category: "DeFi",
      trend: "up",
      author: "Alex Park",
      date: "2024-01-12",
      readTime: "8 min read",
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=250&fit=crop"
    },
    {
      id: 5,
      title: "Central Bank Digital Currencies Gain Momentum Globally",
      excerpt: "Multiple countries announce CBDC pilot programs as digital currency adoption accelerates worldwide.",
      category: "CBDC",
      trend: "up",
      author: "Lisa Wang",
      date: "2024-01-11",
      readTime: "4 min read",
      image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=250&fit=crop"
    },
    {
      id: 6,
      title: "NFT Market Shows Signs of Recovery with New Use Cases",
      excerpt: "Utility-focused NFTs drive market recovery as brands explore new applications beyond digital art.",
      category: "NFTs",
      trend: "up",
      author: "David Johnson",
      date: "2024-01-10",
      readTime: "5 min read",
      image: "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=400&h=250&fit=crop"
    }
  ];

  const featuredArticle = newsArticles[0];
  const regularArticles = newsArticles.slice(1);

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Bitcoin: "bg-crypto-gold/20 text-crypto-gold border-crypto-gold/30",
      Ethereum: "bg-crypto-blue/20 text-crypto-blue border-crypto-blue/30",
      Regulation: "bg-crypto-purple/20 text-crypto-purple border-crypto-purple/30",
      DeFi: "bg-crypto-green/20 text-crypto-green border-crypto-green/30",
      CBDC: "bg-crypto-orange/20 text-crypto-orange border-crypto-orange/30",
      NFTs: "bg-crypto-pink/20 text-crypto-pink border-crypto-pink/30"
    };
    return colors[category] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-hero-gradient">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-crypto-gradient bg-clip-text text-transparent">
                Crypto News & Insights
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Stay ahead of the market with the latest cryptocurrency news, analysis, and expert insights.
              Get real-time updates on market trends, regulatory changes, and breakthrough innovations.
            </p>
          </div>
        </section>

        {/* Market Overview */}
        <section className="py-16 bg-muted/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">Market Overview</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="bg-background border border-crypto-green/30">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-crypto-green" />
                    <span className="text-2xl font-bold text-crypto-green">+12.5%</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Bitcoin (24h)</div>
                  <div className="text-lg font-semibold">$67,234</div>
                </CardContent>
              </Card>
              
              <Card className="bg-background border border-crypto-blue/30">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-crypto-blue" />
                    <span className="text-2xl font-bold text-crypto-blue">+8.3%</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Ethereum (24h)</div>
                  <div className="text-lg font-semibold">$3,845</div>
                </CardContent>
              </Card>
              
              <Card className="bg-background border border-crypto-purple/30">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-crypto-purple" />
                    <span className="text-2xl font-bold text-crypto-purple">+15.7%</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Total Market Cap</div>
                  <div className="text-lg font-semibold">$2.8T</div>
                </CardContent>
              </Card>
              
              <Card className="bg-background border border-crypto-gold/30">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-crypto-gold" />
                    <span className="text-2xl font-bold text-crypto-gold">+22.1%</span>
                  </div>
                  <div className="text-sm text-muted-foreground">DeFi TVL</div>
                  <div className="text-lg font-semibold">$120B</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Featured Article */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">Featured Story</h2>
            <Card className="bg-background/50 backdrop-blur-sm border border-border/50 overflow-hidden group hover:border-crypto-blue/50 transition-all duration-300">
              <div className="lg:flex">
                <div className="lg:w-1/2">
                  <img
                    src={featuredArticle.image}
                    alt={featuredArticle.title}
                    className="w-full h-64 lg:h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="lg:w-1/2 p-8">
                  <Badge className={getCategoryColor(featuredArticle.category)}>
                    {featuredArticle.category}
                  </Badge>
                  <h3 className="text-3xl font-bold text-foreground mt-4 mb-4 group-hover:text-crypto-blue transition-colors">
                    {featuredArticle.title}
                  </h3>
                  <p className="text-muted-foreground text-lg mb-6">
                    {featuredArticle.excerpt}
                  </p>
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{featuredArticle.author}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{featuredArticle.date}</span>
                    </div>
                    <span>{featuredArticle.readTime}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Regular Articles */}
        <section className="py-20 bg-muted/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">Latest News</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularArticles.map((article) => (
                <Card key={article.id} className="bg-background/50 backdrop-blur-sm border border-border/50 overflow-hidden group hover:border-crypto-blue/50 transition-all duration-300 cursor-pointer">
                  <div className="relative">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <Badge className={`absolute top-4 left-4 ${getCategoryColor(article.category)}`}>
                      {article.category}
                    </Badge>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-crypto-blue transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{article.author}</span>
                      </div>
                      <span>{article.readTime}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter Signup */}
        <section className="py-20 bg-crypto-gradient">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl lg:text-5xl font-bold text-background mb-6">
              Stay Informed
            </h2>
            <p className="text-xl text-background/80 mb-8">
              Get the latest crypto news and market insights delivered to your inbox daily.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg border border-background/20 bg-background/10 text-background placeholder-background/60 focus:outline-none focus:ring-2 focus:ring-background/50"
              />
              <button className="bg-background text-crypto-blue px-6 py-3 rounded-lg font-semibold hover:bg-background/90 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CryptoNews;