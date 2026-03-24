import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sprout, FlaskConical, Brain, GitCompareArrows,
  BookOpen, BarChart3, ArrowRight, Leaf, Zap,
  Droplets, TrendingUp, Shield, ChevronRight
} from "lucide-react";

const features = [
  {
    icon: FlaskConical,
    title: "Growth Simulator",
    desc: "Run physics-based simulations predicting biomass, yield, and stress for 10+ crops with realistic logistic growth models.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Brain,
    title: "AI Crop Advisor",
    desc: "Get smart recommendations on optimal environment settings, cost strategies, and yield improvements — powered by local analysis or Gemini AI.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: BarChart3,
    title: "Economics Engine",
    desc: "Calculate revenue, costs, ROI, and payback periods. Track electricity, labour, nutrients, water, and infrastructure costs.",
    color: "text-profit",
    bg: "bg-profit/5",
  },
  {
    icon: GitCompareArrows,
    title: "Side-by-Side Compare",
    desc: "Compare two simulation runs with radar charts and detailed metric tables to find your best setup.",
    color: "text-info",
    bg: "bg-info/5",
  },
  {
    icon: BookOpen,
    title: "Crop Encyclopedia",
    desc: "Browse 10 crop varieties with optimal ranges, pricing, difficulty ratings, and agronomic data.",
    color: "text-destructive",
    bg: "bg-destructive/5",
  },
  {
    icon: Zap,
    title: "What-If Analysis",
    desc: "Instantly see how changing plant count affects profit with live interactive charts.",
    color: "text-primary",
    bg: "bg-primary/5",
  },
];

const stats = [
  { value: "10", label: "Crop Varieties", icon: Leaf },
  { value: "90%", label: "Less Water", icon: Droplets },
  { value: "5x", label: "Faster Growth", icon: TrendingUp },
  { value: "24/7", label: "Climate Control", icon: Shield },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Sprout className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">AeroFarm</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={() => navigate("/dashboard")}>
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>Log In</Button>
                <Button onClick={() => navigate("/auth")}>
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 animate-gradient-shift" />
        {/* Floating emojis */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {["🌿", "🍓", "🥬", "🌾", "🍅", "🥒", "🌱", "🌸"].map((e, i) => (
            <span
              key={i}
              className="absolute text-3xl opacity-[0.06] animate-float"
              style={{
                left: `${8 + (i * 13) % 84}%`,
                top: `${10 + (i * 19) % 70}%`,
                animationDelay: `${i * 1.5}s`,
                animationDuration: `${7 + i * 0.6}s`,
              }}
            >
              {e}
            </span>
          ))}
        </div>

        <div className="container relative py-20 lg:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium">
              <Sprout className="h-3.5 w-3.5 mr-1.5" />
              Indoor Aeroponic Farming Simulator
            </Badge>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Predict Crop Growth{" "}
              <span className="text-primary">Before You Invest</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Simulate yields, calculate profitability, and optimize your indoor aeroponic farm with
              AI-powered recommendations — all before spending a single rupee.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button size="lg" className="px-8 text-base" onClick={() => navigate("/auth")}>
                <FlaskConical className="mr-2 h-5 w-5" />
                Start Simulating — Free
              </Button>
              <Button size="lg" variant="outline" className="px-8 text-base" onClick={() => navigate("/auth")}>
                <BookOpen className="mr-2 h-5 w-5" />
                Browse 10 Crops
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y bg-card/50">
        <div className="container py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16 lg:py-24">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold mb-3">Everything You Need to Plan</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A complete toolkit for predicting and optimizing indoor aeroponic crop production.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="shadow-card hover:shadow-elevated hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 group-hover:via-primary transition-all" />
              <CardContent className="p-6 space-y-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${f.bg}`}>
                  <f.icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-card/50 border-y">
        <div className="container py-16 lg:py-24">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground">Three simple steps to predict your crop's performance</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Choose Your Crop", desc: "Select from 10 crop varieties — lettuce, strawberry, saffron, tomato, and more." },
              { step: "2", title: "Set Environment", desc: "Configure temperature, light, CO₂, pH, EC, and cost parameters with intuitive sliders." },
              { step: "3", title: "Get Predictions", desc: "See yield forecasts, profitability analysis, AI recommendations, and growth charts instantly." },
            ].map((item) => (
              <div key={item.step} className="text-center space-y-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-xl font-bold mx-auto">
                  {item.step}
                </div>
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 lg:py-24">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="font-display text-3xl font-bold">Ready to Grow Smarter?</h2>
          <p className="text-muted-foreground">
            Join farmers using data-driven simulation to maximize yields and minimize waste in indoor aeroponic systems.
          </p>
          <Button size="lg" className="px-10 text-base" onClick={() => navigate("/auth")}>
            Get Started for Free <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold text-foreground">AeroFarm Simulator</span>
          </div>
          <p>© {new Date().getFullYear()} AeroFarm. Built for smarter indoor farming.</p>
        </div>
      </footer>
    </div>
  );
}
