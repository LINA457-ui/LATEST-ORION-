import { useUser } from "@clerk/clerk-react";
import { useLocation, Link } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";
import { useGetMarketIndices } from "@workspace/api-client-react";
import { formatCurrency, formatChange } from "@/lib/format";
import { ArrowRight, ShieldCheck, LineChart, BrainCircuit } from "lucide-react";

export default function MarketingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setLocation("/dashboard");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded || isSignedIn) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
              Log in
            </Link>
            <Button asChild>
              <Link href="/sign-up">Open free account</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <HeroSection />
        <TickerSection />
        <FeaturesSection />
      </main>

      <footer className="bg-muted/50 border-t py-12">
        <div className="container max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex justify-center mb-6 opacity-50 grayscale"><Logo /></div>
          <p className="mb-2">© {new Date().getFullYear()} Orion Investment. All rights reserved.</p>
         
        </div>
      </footer>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="py-24 px-4 container max-w-6xl mx-auto text-center space-y-8">
      <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
        Invest with <span className="text-primary">conviction.</span>
      </h1>
     
      <div className="flex items-center justify-center gap-4 pt-4">
        <Button size="lg" className="text-base h-12 px-8" asChild>
          <Link href="/sign-up">
            Open free account <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" className="text-base h-12 px-8" asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    </section>
  );
}

function TickerSection() {
  const { data: indices } = useGetMarketIndices();
  
  if (!indices?.length) return null;
  
  return (
    <div className="bg-card border-y py-3 overflow-hidden flex whitespace-nowrap">
      <div className="flex animate-marquee gap-8 px-4 items-center">
        {[...indices, ...indices].map((idx, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="font-bold">{idx.name}</span>
            <span>{formatCurrency(idx.value)}</span>
            <span className={idx.change >= 0 ? "text-success" : "text-destructive"}>
              {formatChange(idx.changePercent, true)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturesSection() {
  const features = [
    {
      title: "Real-time Paper Trading",
      desc: "Practice strategies with live market data before risking real capital. Zero commissions.",
      icon: <LineChart className="w-10 h-10 text-primary mb-4" />
    },
    {
      title: "Orion AI Advisor",
      desc: "Get instant insights, portfolio analysis, and market summaries from our built-in AI assistant.",
      icon: <BrainCircuit className="w-10 h-10 text-primary mb-4" />
    },
    {
      title: "Institutional Security",
      desc: "Enterprise-grade authentication and data protection to keep your information secure.",
      icon: <ShieldCheck className="w-10 h-10 text-primary mb-4" />
    }
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="container max-w-6xl mx-auto px-4">
        <h2 className="font-serif text-3xl font-bold text-center mb-16">Why choose Orion?</h2>
        <div className="grid md:grid-cols-3 gap-12">
          {features.map((f, i) => (
            <div key={i} className="bg-card p-8 rounded-xl border shadow-sm flex flex-col items-center text-center">
              {f.icon}
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
