"use client";
import { useState } from "react";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Database,
  Palette,
  Globe,
  Key,
  Download,
  Upload,
  RefreshCw,
  Check,
  ChevronRight
} from "lucide-react";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    portfolioUpdates: false,
    marketNews: true,
    weeklyReports: true
  });
  const [theme, setTheme] = useState('system');
  const [currency, setCurrency] = useState('USD');

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend = 'neutral',
    subtitle
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ComponentType<{ size?: number; className?: string }>; 
    trend?: 'up' | 'down' | 'neutral';
    subtitle?: string;
  }) => (
    <div className="group relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 transition-all duration-300 hover:shadow-medium hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-soft transition-transform duration-300 group-hover:scale-110 ${
          trend === 'down' ? 'from-red-500 to-red-600' : trend === 'up' ? 'from-emerald-500 to-emerald-600' : 'from-blue-500 to-blue-600'
        }`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>

      <div className="space-y-1 mt-4">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{title}</p>
        <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">{value}</p>
        {subtitle && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>
        )}
      </div>
    </div>
  );

  const sections = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'data', name: 'Data & Privacy', icon: Database },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'preferences', name: 'Preferences', icon: SettingsIcon }
  ];

  return (
    <div className="h-full bg-neutral-50 dark:bg-neutral-950 p-6">
      <div className="max-w-[1400px] mx-auto h-full">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              Settings
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Manage your account preferences and application settings
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <Download className="w-4 h-4" />
              Export Data
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
              <RefreshCw className="w-4 h-4" />
              Sync Settings
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                Settings Categories
              </h2>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <section.icon className="w-5 h-5" />
                      <span className="font-medium">{section.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {activeSection === 'profile' && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                    Profile Settings
                  </h2>
                </div>
                
                <div className="space-y-6">
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Full Name</label>
                      <input 
                        className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                        defaultValue="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</label>
                      <input 
                        type="email"
                        className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                        defaultValue="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Time Zone</label>
                      <select className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors">
                        <option>America/New_York</option>
                        <option>America/Los_Angeles</option>
                        <option>Europe/London</option>
                        <option>Asia/Tokyo</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Phone</label>
                      <input 
                        type="tel"
                        className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
                <div className="flex items-center gap-3 mb-6">
                  <Bell className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                    Notification Preferences
                  </h2>
                </div>
                
                <div className="space-y-4">
                  {Object.entries(notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <div>
                        <h3 className="font-medium text-neutral-900 dark:text-neutral-50 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {key === 'priceAlerts' && 'Get notified when your price alerts are triggered'}
                          {key === 'portfolioUpdates' && 'Receive updates about your portfolio performance'}
                          {key === 'marketNews' && 'Stay informed with market news and analysis'}
                          {key === 'weeklyReports' && 'Get weekly performance summaries via email'}
                        </p>
                      </div>
                      <button
                        onClick={() => setNotifications(prev => ({ ...prev, [key]: !value }))}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          value ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-600'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
                <div className="flex items-center gap-3 mb-6">
                  <Palette className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                    Appearance & Display
                  </h2>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-neutral-900 dark:text-neutral-50 mb-3">Theme</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {['light', 'dark', 'system'].map((themeOption) => (
                        <button
                          key={themeOption}
                          onClick={() => setTheme(themeOption)}
                          className={`p-4 rounded-lg border-2 transition-colors ${
                            theme === themeOption
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                          }`}
                        >
                          <div className="text-center">
                            <div className={`w-12 h-8 mx-auto mb-2 rounded ${
                              themeOption === 'light' ? 'bg-white border border-neutral-300' :
                              themeOption === 'dark' ? 'bg-neutral-900 border border-neutral-700' :
                              'bg-gradient-to-r from-white to-neutral-900'
                            }`} />
                            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50 capitalize">
                              {themeOption}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-neutral-900 dark:text-neutral-50 mb-3">Currency</h3>
                    <select 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                    Security Settings
                  </h2>
                </div>
                
                <div className="space-y-6">
                  <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-neutral-900 dark:text-neutral-50">Two-Factor Authentication</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Add an extra layer of security to your account</p>
                      </div>
                      <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                        Enable
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-neutral-900 dark:text-neutral-50">Change Password</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Update your account password</p>
                      </div>
                      <button className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 px-4 py-2 rounded-lg font-medium transition-colors">
                        Change
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-neutral-900 dark:text-neutral-50">API Keys</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Manage your API access keys</p>
                      </div>
                      <button className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 px-4 py-2 rounded-lg font-medium transition-colors">
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats for other sections */}
            {['data', 'preferences'].includes(activeSection) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  title="Data Usage" 
                  value="2.4 GB"
                  icon={Database} 
                  trend="neutral"
                  subtitle="this month"
                />
                <StatCard 
                  title="API Calls" 
                  value="15,420"
                  icon={Globe} 
                  trend="up"
                  subtitle="last 30 days"
                />
                <StatCard 
                  title="Backup Status" 
                  value="Synced"
                  icon={Check} 
                  trend="up"
                  subtitle="5 minutes ago"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
