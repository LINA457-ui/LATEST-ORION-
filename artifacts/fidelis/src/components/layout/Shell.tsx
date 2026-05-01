import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useTheme } from "@/components/layout/ThemeProvider";
import { Logo } from "@/components/layout/Logo";
import {
  Search,
  Menu,
  LayoutDashboard,
  Briefcase,
  LineChart,
  ArrowLeftRight,
  Star,
  History,
  BrainCircuit,
  Wallet,
  User as UserIcon,
  Moon,
  Sun,
  Shield,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useGetMyAccount } from "@workspace/api-client-react";
import { adminPinSession } from "@/lib/adminApi";
import { PinGate } from "@/components/admin/PinGate";
import {
  AppBreadcrumb,
  BreadcrumbProvider,
} from "@/components/layout/AppBreadcrumb";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/markets", label: "Markets", icon: LineChart },
  { href: "/trade", label: "Trade", icon: ArrowLeftRight },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/transactions", label: "Transactions", icon: History },
  { href: "/advisor", label: "Advisor", icon: BrainCircuit },
  { href: "/funding", label: "Funding", icon: Wallet },
];

function getInitials(user: any, accountName?: string) {
  const first = user?.firstName?.[0] ?? "";
  const last = user?.lastName?.[0] ?? "";

  if (first || last) return `${first}${last}`.toUpperCase();

  const name = accountName || user?.fullName || "";
  if (name.trim()) {
    return name
      .trim()
      .split(" ")
      .slice(0, 2)
      .map((part: string) => part[0])
      .join("")
      .toUpperCase();
  }

  return (
    user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ||
    user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ||
    "U"
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  const { theme, setTheme } = useTheme();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const { data: adminCheck } = useAdminCheck();
  const { data: myAccount } = useGetMyAccount();

  const isAdmin = !!adminCheck?.isAdmin;

  const account = myAccount as
    | {
        displayName?: string | null;
        email?: string | null;
        avatarUrl?: string | null;
      }
    | undefined;

  const displayName =
    account?.displayName ||
    user?.fullName ||
    user?.username ||
    user?.firstName ||
    "User";

  const email =
    account?.email ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";

  const avatarSrc = account?.avatarUrl || user?.imageUrl || "";
  const initials = getInitials(user, displayName);

  function handleAdminClick(e: React.MouseEvent) {
    e.preventDefault();
    setIsMobileOpen(false);

    if (adminPinSession.get()) {
      navigate("/admin");
    } else {
      setPinOpen(true);
    }
  }

  async function handleLogout() {
    adminPinSession.clear();
    await signOut();
    navigate("/");
  }

  return (
    <BreadcrumbProvider>
      <div className="min-h-screen bg-background flex w-full">
        <PinGate
          open={pinOpen}
          onOpenChange={setPinOpen}
          onSuccess={() => navigate("/admin")}
        />

        <aside className="hidden md:flex flex-col w-64 border-r bg-card/50 backdrop-blur-sm sticky top-0 h-screen shrink-0">
          <div className="h-16 flex items-center px-6 border-b">
            <Logo />
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = location.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t space-y-1">
            {isAdmin && (
              <a
                href="/admin"
                onClick={handleAdminClick}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  location.startsWith("/admin")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </a>
            )}

            <Link
              href="/profile"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location === "/profile"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <UserIcon className="w-4 h-4" />
              Profile
            </Link>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-4 flex-1">
              <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden shrink-0"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>

                <SheetContent side="left" className="w-64 p-0 flex flex-col">
                  <div className="h-16 flex items-center px-6 border-b">
                    <Logo />
                  </div>

                  <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map((item) => {
                      const isActive = location.startsWith(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      );
                    })}

                    <div className="my-2 border-t pt-2" />

                    {isAdmin && (
                      <a
                        href="/admin"
                        onClick={handleAdminClick}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                          location.startsWith("/admin")
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Shield className="w-4 h-4" />
                        Admin
                      </a>
                    )}

                    <Link
                      href="/profile"
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        location === "/profile"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <UserIcon className="w-4 h-4" />
                      Profile
                    </Link>
                  </nav>
                </SheetContent>
              </Sheet>

              <div className="relative max-w-md w-full hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search symbols..."
                  className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = e.currentTarget.value.trim().toUpperCase();

                      if (val) {
                        window.location.href = `/markets/${val}`;
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>

              <Link
                href="/profile"
                className="hidden sm:flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-muted transition"
                aria-label="Profile"
              >
                <div className="hidden md:flex flex-col text-right leading-tight">
                  <span className="text-sm font-semibold">
                    {isLoaded ? displayName : "Loading..."}
                  </span>
                  {email && (
                    <span className="text-xs text-muted-foreground max-w-[180px] truncate">
                      {email}
                    </span>
                  )}
                </div>

                <Avatar className="w-9 h-9 border hover:ring-2 hover:ring-primary/40 transition">
                  {avatarSrc && (
                    <AvatarImage src={avatarSrc} alt={displayName} />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                title="Logout"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden p-4 sm:p-6 md:p-8">
            <AppBreadcrumb />
            {children}
          </main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}