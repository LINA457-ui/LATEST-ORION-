import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

// Allows individual pages to override the trailing crumb label (e.g. show a
// user's display name in /admin/users/:userId instead of the opaque id).
interface BreadcrumbCtx {
  label: string | null;
  setLabel: (label: string | null) => void;
}
const BreadcrumbContext = createContext<BreadcrumbCtx>({
  label: null,
  setLabel: () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  return (
    <BreadcrumbContext.Provider value={{ label, setLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

// Page-level hook: sets the trailing crumb to `label` on mount and clears it
// on unmount. Pass `null` while the value is still loading to fall back to the
// auto-derived label.
export function usePageBreadcrumb(label: string | null | undefined) {
  const { setLabel } = useContext(BreadcrumbContext);
  const setStable = useCallback(setLabel, [setLabel]);
  useEffect(() => {
    if (label) setStable(label);
    return () => setStable(null);
  }, [label, setStable]);
}

// Friendly labels for the static URL segments we care about. Any segment not in
// this map is treated as a dynamic value (a userId, stock symbol, etc.) and
// displayed using a smart fallback.
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  portfolio: "Portfolio",
  markets: "Markets",
  trade: "Trade",
  watchlist: "Watchlist",
  transactions: "Transactions",
  advisor: "AI Advisor",
  funding: "Funding",
  success: "Success",
  profile: "Profile",
  admin: "Admin",
  users: "Users",
  orders: "Orders",
  pins: "PINs",
};

// Path segments where the FOLLOWING segment is a user-facing identifier we
// want to render verbatim (e.g. a stock symbol like "AAPL").
const PASSTHROUGH_PARENTS = new Set(["markets"]);

function labelForSegment(seg: string, parent: string | undefined): string {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg];
  // Stock symbols, etc. — keep as-is, uppercased.
  if (parent && PASSTHROUGH_PARENTS.has(parent)) return seg.toUpperCase();
  // Anything else that looks like an opaque id (Clerk userId, numeric id, uuid)
  // gets a generic "Details" label so the URL doesn't leak into the UI.
  if (/^(user_|usr_|[0-9]+$|[a-f0-9-]{8,})/i.test(seg)) return "Details";
  // Fall back to title-cased version of the segment.
  return seg.replace(/(?:^|[-_])(\w)/g, (_, c) => " " + c.toUpperCase()).trim();
}

export function AppBreadcrumb() {
  const [location] = useLocation();
  const { label: currentLabel } = useContext(BreadcrumbContext);
  const segments = location.split("/").filter(Boolean);

  // Don't render on the dashboard root — there's nowhere to go back to.
  if (segments.length === 0 || (segments.length === 1 && segments[0] === "dashboard")) {
    return null;
  }

  const crumbs = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const isLast = idx === segments.length - 1;
    const parent = idx > 0 ? segments[idx - 1] : undefined;
    const label =
      isLast && currentLabel ? currentLabel : labelForSegment(seg, parent);
    return { href, label, isLast };
  });

  return (
    <div className="flex items-center gap-2 mb-4 -mt-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
        onClick={() => window.history.back()}
        aria-label="Go back"
      >
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard" className="flex items-center gap-1">
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {crumbs.map((c) => (
            <BreadcrumbItemWithSep
              key={c.href}
              href={c.href}
              label={c.label}
              isLast={c.isLast}
            />
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

function BreadcrumbItemWithSep({
  href,
  label,
  isLast,
}: {
  href: string;
  label: string;
  isLast: boolean;
}) {
  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        {isLast ? (
          <BreadcrumbPage>{label}</BreadcrumbPage>
        ) : (
          <BreadcrumbLink asChild>
            <Link href={href}>{label}</Link>
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
    </>
  );
}
