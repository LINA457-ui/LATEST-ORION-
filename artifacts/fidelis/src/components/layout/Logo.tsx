import { Link } from "wouter";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 group ${className}`}>
      <div className="flex items-center justify-center w-8 h-8 rounded bg-primary text-primary-foreground font-serif font-bold text-lg leading-none shadow-sm group-hover:bg-primary/90 transition-colors">
        F
      </div>
      <span className="font-serif font-bold text-xl tracking-tight text-foreground hidden sm:block">
        Fidelis Investments
      </span>
    </Link>
  );
}
