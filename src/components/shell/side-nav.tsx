"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui/cn";
import { 
  LayoutDashboard, 
  Briefcase, 
  Upload, 
  TrendingUp, 
  Eye, 
  Bell, 
  Settings,
  BarChart3
} from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio/import", label: "Import", icon: Upload },
  { href: "/research", label: "Research", icon: TrendingUp },
  { href: "/watchlists", label: "Watchlists", icon: Eye },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="h-full bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800">
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">StockSense</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Professional Analytics</p>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300"
                )} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        
        <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">Account</p>
            <div className="flex items-center space-x-3 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900">
              <div className="w-8 h-8 bg-gradient-to-br from-neutral-400 to-neutral-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-white">AJ</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">Akash Jain</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">Professional Plan</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
