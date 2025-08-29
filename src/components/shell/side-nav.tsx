import Link from "next/link";
import { cn } from "@/lib/ui/cn";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/portfolio/import", label: "Import" },
  { href: "/transactions", label: "Transactions" },
  { href: "/research", label: "Research" },
  { href: "/watchlists", label: "Watchlists" },
  { href: "/alerts", label: "Alerts" },
  { href: "/settings", label: "Settings" },
];

export function SideNav() {
  return (
    <nav className="h-full p-4 space-y-1">
      <div className="px-2 py-3 text-lg font-semibold">StockSense</div>
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={cn("block px-3 py-2 rounded-md hover:bg-muted")}>{i.label}</Link>
      ))}
    </nav>
  );
}
