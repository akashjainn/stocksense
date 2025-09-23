"use client";
import React from 'react';
import { Plus, Upload, Download, Settings } from 'lucide-react';

export const PortfolioActions: React.FC = () => {
  const [showMenu, setShowMenu] = React.useState(false);

  const actions = [
    { id: 'add-transaction', label: 'Add Transaction', icon: Plus },
    { id: 'import-csv', label: 'Import CSV', icon: Upload },
    { id: 'export-data', label: 'Export Data', icon: Download },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Quick Actions
        </button>
      </div>
      
      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg z-20">
          <div className="p-2">
            {actions.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                  onClick={() => {
                    setShowMenu(false);
                    // Handle action
                    console.log(`Action: ${action.id}`);
                  }}
                >
                  <Icon className="h-4 w-4 text-neutral-500" />
                  <span className="text-neutral-700 dark:text-neutral-200">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};