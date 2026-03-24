import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sprout, FlaskConical, Brain, GitCompareArrows,
  BookOpen, Calculator, ArrowRight, Leaf,
  CloudRain, Activity, CalendarSync, Shield, ChevronRight
} from "lucide-react";
import { motion, Variants } from "framer-motion";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { type: "tween", ease: "easeOut", duration: 0.5 }
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const features = [
  {
    icon: FlaskConical,
    title: "Thermodynamic Simulator",
    desc: "Physics-based engine predicting biomass, yield, and stress across diverse aeroponic environments.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Activity,
    title: "AI Plant Scanner (Vision)",
    desc: "Upload photos of sick plants for instant pathology diagnosis and organic treatment prescriptions from Gemini 2.0 Flash.",
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  {
    icon: Calculator,
    title: "Business ROI Planner",
    desc: "Input your capital & real estate to generate 5-year financial projections and exact payback horizons.",
    color: "text-profit",
    bg: "bg-profit/10",
  },
  {
    icon: CloudRain,
    title: "Live Weather Sync",
    desc: "Sync the engine to global Open-Meteo data to calculate real-world geographical HVAC cooling costs.",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    icon: Brain,
    title: "AI Crop Advisor",
    desc: "Get intelligent environment recommendations and localized insights from localized Gemini integrations.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: CalendarSync,
    title: "My Farm & Calendar",
    desc: "Launch a live cycle and export an AI-generated day-by-day care schedule directly to Google Calendar.",
    color: "text-info",
    bg: "bg-info/10",
  },
];

const stats = [
  { value: "10+", label: "Crop Models", icon: Leaf },
  { value: "5 Yrs", label: "ROI Projections", icon: Calculator },
  { value: "Live", label: "Global Weather", icon: CloudRain },
  { value: "Vision", label: "AI Pathology", icon: Activity },
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
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-3xl mx-auto text-center space-y-6"
          >
            <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium bg-background/50 backdrop-blur-md border-primary/20">
              <Sprout className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Advanced Capstone Simulator
            </Badge>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
              Predict Crop Growth{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Before You Invest</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Plan, simulate, and scale your indoor aeroponic farm with thermodynamic modeling, 
              AI plant pathology, live weather sync, and 5-year financial ROI projections.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button size="lg" className="px-8 text-base shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow" onClick={() => navigate("/auth")}>
                <FlaskConical className="mr-2 h-5 w-5" />
                Start Simulating — Free
              </Button>
              <Button size="lg" variant="outline" className="px-8 text-base bg-background/50 backdrop-blur-md" onClick={() => navigate("/auth")}>
                <BookOpen className="mr-2 h-5 w-5" />
                Explore Features
              </Button>
            </div>
          </motion.div>
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
      <section className="container py-20 lg:py-32">
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeIn} className="font-display text-3xl md:text-5xl font-bold mb-4">Everything You Need to Scale</motion.h2>
          <motion.p variants={fadeIn} className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A complete industrial-grade toolkit extending far beyond basic simulation.
          </motion.p>
        </motion.div>
        
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeIn}>
              <Card className="h-full shadow-card hover:shadow-elevated hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden bg-card/40 backdrop-blur-sm border-border">
                <div className="h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent group-hover:via-primary transition-all duration-500" />
                <CardContent className="p-8 space-y-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${f.bg} transform group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon className={`h-7 w-7 ${f.color}`} />
                  </div>
                  <h3 className="font-display text-xl font-semibold">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
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
      <section className="container py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-primary/5 rounded-3xl -z-10" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center space-y-8"
        >
          <h2 className="font-display text-4xl sm:text-5xl font-bold">Ready to Grow Smarter?</h2>
          <p className="text-xl text-muted-foreground">
            Join the agricultural pioneers using physics-based forecasting and AI pathology to protect their investments.
          </p>
          <Button size="lg" className="px-12 py-6 text-lg rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 transition-all hover:-translate-y-1" onClick={() => navigate("/auth")}>
            Launch Simulator <ChevronRight className="ml-2 h-6 w-6" />
          </Button>
        </motion.div>
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
