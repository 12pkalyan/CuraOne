import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Inbox, 
  ShieldCheck, 
  User, 
  Calendar, 
  Sun, 
  Moon, 
  Laptop,
  Check,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type PatientViewTab = 'timeline' | 'consent' | 'audit';

interface PatientSidebarProps {
  activeTab: PatientViewTab;
  onTabChange: (tab: PatientViewTab) => void;
  pendingConsentCount?: number;
  auditAlertCount?: number;
}

export const PatientSidebar: React.FC<PatientSidebarProps> = ({
  activeTab,
  onTabChange,
  pendingConsentCount = 0,
  auditAlertCount = 0,
}) => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <aside className="w-full md:w-64 shrink-0 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border/80 bg-sidebar p-4 gap-6 h-full overflow-y-auto">
      <div className="space-y-6">
        {/* Patient Sovereign Identity Card */}
        <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-2.5 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
              <User className="size-5" />
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              Data Sovereign 🔒
            </Badge>
          </div>

          <div>
            <h3 className="font-bold text-sm text-foreground leading-tight">
              {user?.name || 'Patient Citizen'}
            </h3>
            <p className="text-xs text-muted-foreground truncate" title={user?.email}>
              {user?.email}
            </p>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="size-3" />
              <span>Full Access</span>
            </div>
            <span className="font-mono text-[10px] bg-muted/60 px-1.5 py-0.5 rounded">
              ID: {user?.id.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase px-2 mb-1.5">
            Sovereign Portal
          </p>

          <button
            type="button"
            onClick={() => onTabChange('timeline')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-foreground hover:bg-muted/80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="size-4" />
              <span>My Medical Records</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('consent')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'consent'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-foreground hover:bg-muted/80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Inbox className="size-4" />
              <span>Consent Requests</span>
            </div>
            {pendingConsentCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'consent'
                  ? 'bg-primary-foreground text-primary'
                  : 'bg-amber-500 text-white'
              }`}>
                {pendingConsentCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('audit')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-foreground hover:bg-muted/80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="size-4" />
              <span>Security & Audit Log</span>
            </div>
            {auditAlertCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'audit'
                  ? 'bg-primary-foreground text-primary'
                  : 'bg-destructive text-destructive-foreground animate-pulse'
              }`}>
                {auditAlertCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Accessibility & Theme Dropdown */}
      <div className="pt-4 border-t border-border/80">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border border-border/70 bg-card/60 hover:bg-muted/80 transition-colors text-foreground cursor-pointer">
            <div className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="size-3.5" />
              ) : theme === 'light' ? (
                <Sun className="size-3.5" />
              ) : (
                <Laptop className="size-3.5" />
              )}
              <span className="capitalize">{theme || 'Theme'} Mode</span>
            </div>
            <ChevronDown className="size-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setTheme('light')} className="flex items-center justify-between text-xs cursor-pointer">
              <div className="flex items-center gap-2">
                <Sun className="size-3.5" />
                <span>Light</span>
              </div>
              {theme === 'light' && <Check className="size-3.5 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')} className="flex items-center justify-between text-xs cursor-pointer">
              <div className="flex items-center gap-2">
                <Moon className="size-3.5" />
                <span>Dark</span>
              </div>
              {theme === 'dark' && <Check className="size-3.5 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')} className="flex items-center justify-between text-xs cursor-pointer">
              <div className="flex items-center gap-2">
                <Laptop className="size-3.5" />
                <span>System</span>
              </div>
              {theme === 'system' && <Check className="size-3.5 text-primary" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};
