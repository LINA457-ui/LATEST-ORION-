import { useUser } from "@clerk/clerk-react";
import { useLocation, Link } from "wouter";
import { useEffect } from "react";
import {
  ArrowRight,
  ShieldCheck,
  LineChart,
  BrainCircuit,
  Sparkles,
  WalletCards,
  TrendingUp,
  LockKeyhole,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";

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
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Header />

      <main>
        <HeroSection />
        <MarketPreviewSection />
        <ImageStorySection />
        <FeaturesSection />
        <PlatformShowcaseSection />
        <SecuritySection />
        <FinalCTASection />
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#markets" className="text-sm text-muted-foreground hover:text-foreground">
            Markets
          </a>
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">
            Features
          </a>
          <a href="#security" className="text-sm text-muted-foreground hover:text-foreground">
            Security
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="hidden text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex"
          >
            Log in
          </Link>

          <Button asChild className="rounded-full">
            <Link href="/sign-up">Open account</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,#1f2937_0%,transparent_35%),radial-gradient(circle_at_bottom_right,#0f766e_0%,transparent_28%)] opacity-30" />

      <div className="container mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:py-28">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4 text-primary" />
            Smarter paper trading for modern investors
          </div>

          <div className="space-y-5">
            <h1 className="max-w-4xl font-serif text-5xl font-bold tracking-tight md:text-7xl">
              Invest with{" "}
              <span className="bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">
                conviction.
              </span>
            </h1>

            <p className="max-w-xl text-lg leading-8 text-muted-foreground md:text-xl">
              Orion gives you a premium investment dashboard, paper trading,
              portfolio intelligence, and AI-powered market guidance in one clean
              experience.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12 rounded-full px-8 text-base" asChild>
              <Link href="/sign-up">
                Open free account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-full px-8 text-base"
              asChild
            >
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>

          <div className="grid max-w-xl grid-cols-3 gap-4 pt-4">
            <Stat value="$100k" label="Demo capital" />
            <Stat value="0%" label="Commissions" />
            <Stat value="AI" label="Advisor ready" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/10 blur-3xl" />

          <div className="overflow-hidden rounded-[2rem] border bg-card shadow-2xl">
            <div className="border-b bg-muted/40 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-destructive" />
                <span className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="h-3 w-3 rounded-full bg-green-500" />
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-2xl border bg-background p-5">
                <p className="text-sm text-muted-foreground">Total Equity</p>
                <div className="mt-2 flex items-end justify-between">
                  <h3 className="text-4xl font-bold">$100,000.00</h3>
                  <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-600">
                    +2.41%
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MiniCard title="Buying Power" value="$74,250.00" />
                <MiniCard title="Portfolio Value" value="$25,750.00" />
              </div>

              <div className="h-44 rounded-2xl border bg-gradient-to-br from-primary/20 via-background to-background p-5">
                <div className="flex h-full items-end gap-2">
                  {[35, 52, 48, 74, 60, 82, 77, 95, 88, 100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-lg bg-primary/70"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border bg-background p-4 shadow-xl md:block">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AAPL</p>
                <p className="font-bold">+1.19% today</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MarketPreviewSection() {
  const markets = [
    { symbol: "AAPL", name: "Apple Inc.", price: "$198.42", change: "+1.19%" },
    { symbol: "MSFT", name: "Microsoft", price: "$431.22", change: "+0.98%" },
    { symbol: "NVDA", name: "NVIDIA", price: "$122.88", change: "+3.12%" },
    { symbol: "TSLA", name: "Tesla", price: "$244.91", change: "-0.87%" },
  ];

  return (
    <section id="markets" className="border-b py-16">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              Live feel
            </p>
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              Track the market like a pro.
            </h2>
          </div>

          <Button variant="outline" className="rounded-full" asChild>
            <Link href="/sign-up">Start trading demo</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {markets.map((item) => (
            <div
              key={item.symbol}
              className="rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">{item.symbol}</h3>
                  <p className="text-sm text-muted-foreground">{item.name}</p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${item.change.startsWith("-")
                    ? "bg-destructive/10 text-destructive"
                    : "bg-green-500/10 text-green-600"
                    }`}
                >
                  {item.change}
                </span>
              </div>

              <p className="mt-6 text-2xl font-bold">{item.price}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ImageStorySection() {
  return (
    <section className="py-24">
      <div className="container mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[2rem] border bg-muted shadow-xl">
          <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-muted via-background to-primary/20">
            <div className="text-center">
              <WalletCards className="mx-auto mb-4 h-12 w-12 text-primary" />
              <div className="w-full rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-4 flex items-center justify-center">
                <img
                  src="/towfiqu-barbhuiya-jpqyfK7GB4w-unsplash.jpg" // change this path
                  alt="Dashboard preview"
                  className="max-h-48 w-auto object-contain rounded-lg"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Replace this block with your screenshot or mockup
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            Built different
          </p>

          <h2 className="font-serif text-4xl font-bold tracking-tight md:text-5xl">
            A cleaner way to practice investing before risking real capital.
          </h2>

          <p className="text-lg leading-8 text-muted-foreground">
            Orion is designed for users who want clarity, not noise. You get a
            focused dashboard, symbol pages, watchlists, transactions, funding,
            and portfolio insights without feeling overwhelmed.
          </p>

          <div className="space-y-3">
            {[
              "Practice buy and sell orders in a safe environment.",
              "Track portfolio growth with clean visual insights.",
              "Understand stocks before taking real-world positions.",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      title: "Real-time Paper Trading",
      desc: "Practice strategies with market-style data before risking real capital. Clean execution, clean feedback.",
      icon: LineChart,
    },
    {
      title: "Orion AI Advisor",
      desc: "Get instant portfolio explanations, market summaries, and smarter investing guidance.",
      icon: BrainCircuit,
    },
    {
      title: "Institutional Security",
      desc: "Built with modern authentication and protected account access powered by Clerk.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section id="features" className="bg-muted/30 py-24">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            Features
          </p>
          <h2 className="font-serif text-4xl font-bold md:text-5xl">
            Everything you need to learn the market.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group rounded-[1.5rem] border bg-card p-8 shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="mb-6 inline-flex rounded-2xl bg-primary/10 p-4 transition group-hover:scale-110">
                  <Icon className="h-8 w-8 text-primary" />
                </div>

                <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                <p className="leading-7 text-muted-foreground">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PlatformShowcaseSection() {
  return (
    <section className="py-24">
      <div className="container mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2">
        <div className="space-y-6 lg:order-1">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            Portfolio intelligence
          </p>

          <h2 className="font-serif text-4xl font-bold tracking-tight md:text-5xl">
            One dashboard. Every move visible.
          </h2>

          <p className="text-lg leading-8 text-muted-foreground">
            Let users see their total equity, buying power, holdings, trade
            history, funding activity, watchlist, and performance in one place.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <MiniFeature title="Holdings" desc="View positions and value." />
            <MiniFeature title="Transactions" desc="Track every account move." />
            <MiniFeature title="Watchlist" desc="Save symbols to monitor." />
            <MiniFeature title="Funding" desc="Mock deposits and withdrawals." />
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border bg-muted shadow-xl lg:order-2">
          <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-primary/20 via-background to-muted">
            <div className="text-center">
              <LineChart className="mx-auto mb-4 h-12 w-12 text-primary" />
              <div className="w-full rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-4 flex items-center justify-center">
                <img
                  src="/markus-winkler-IrRbSND5EUc-unsplash.jpg" // change this path
                  alt="Dashboard preview"
                  className="max-h-48 w-auto object-contain rounded-lg"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Replace with another product screenshot/mockup
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section id="security" className="border-y bg-foreground py-24 text-background">
      <div className="container mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[2rem] border border-background/10 bg-background/10 p-8">
          <LockKeyhole className="mb-6 h-12 w-12 text-primary" />
          <h2 className="mb-4 font-serif text-4xl font-bold">
            Serious about trust.
          </h2>
          <p className="leading-8 text-background/70">
            Orion keeps the experience clean and secure, giving users a safe
            environment to learn, explore, and practice trading.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <DarkFeature title="Protected Access" desc="Secure sign in and account sessions." />
          <DarkFeature title="Demo Capital" desc="Practice with simulated funds." />
          <DarkFeature title="Clean Records" desc="Orders and transactions are easy to follow." />
        </div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="relative overflow-hidden py-24 text-center">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,#0f766e_0%,transparent_35%)] opacity-20" />

      <div className="container mx-auto max-w-4xl px-4">
        <h2 className="font-serif text-4xl font-bold tracking-tight md:text-6xl">
          Start building market confidence today.
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
          Open a free Orion account and begin practicing with a premium trading
          experience designed for clarity.
        </p>

        <div className="mt-8 flex justify-center">
          <Button size="lg" className="h-12 rounded-full px-8 text-base" asChild>
            <Link href="/sign-up">
              Open free account <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-muted/50 py-12">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="opacity-60 grayscale">
            <Logo />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Orion Investment. All rights reserved.
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/sign-in" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/sign-up" className="hover:text-foreground">
              Open account
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border bg-card/60 p-4 text-center shadow-sm">
      <p className="text-xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function MiniCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background p-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function MiniFeature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function DarkFeature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-background/10 bg-background/10 p-6">
      <h3 className="font-bold text-background">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-background/60">{desc}</p>
    </div>
  );
}