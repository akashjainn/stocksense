"use client";
import { InputHTMLAttributes, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { Search, Bell, ChevronDown, Sun, Moon, HelpCircle } from "lucide-react";

function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
      <input
        {...props}
        className={cn(
          "w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all",
          props.className
        )}
        placeholder="Search stocks, symbols, or transactions..."
      />
    </div>
  );
}

export function TopNav() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationCount] = useState(3);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="h-14 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
      <div className="h-full flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <SearchInput />
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Help */}
          <button className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-2" />

          {/* User Menu */}
          <div className="flex items-center space-x-3 pl-2">
            <div className="flex items-center space-x-3 px-3 py-1.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors group">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">AJ</span>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Akash Jain</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">akash@stocksense.com</p>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
