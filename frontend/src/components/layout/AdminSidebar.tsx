import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import { 
  Shield, 
  Building2, 
  FileText, 
  Sun, 
  Moon, 
  Laptop, 
  Check, 
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export type AdminViewTab = 'hospitals' | 'audit';

interface AdminSidebarProps {
  activeTab: AdminViewTab;
  onSelectTab: (tab: AdminViewTab) => void;
  hospitalsCount?: number;
  disputedCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  hospitalsCount = 0,
  disputedCount = 0,
}) => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  if (!user) return null;

  return (
    <aside className="w-72 shrink-0 border-r border-border/60 bg-background/50 flex flex-col justify-between p-4 h-full overflow-y-auto">
      <div className="space-y-6">
        {/* 1. Root Jurisdiction Card */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Shield className="size-3.5 text-foreground" />
            <span>Root Network Jurisdiction</span>
          </div>

          <div>
            <h2 className="text-sm font-bold text-foreground leading-tight">CuraOne Federation</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Central Registry & Audit Root</p>
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
              Root Admin
            </Badge>
          </div>
        </div>

        {/* 2. Admin Navigation Links */}
        <div className="space-y-1">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Network Administration
          </p>

          {/* Hospital Nodes */}
          <button
            type="button"
            onClick={() => onSelectTab('hospitals')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'hospitals'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="size-4 text-foreground" />
              <span>Hospital Nodes</span>
            </div>
            {hospitalsCount > 0 && (
              <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal text-muted-foreground">
                {hospitalsCount}
              </Badge>
            )}
          </button>

          {/* Cross-Hospital Audit Log */}
          <button
            type="button"
            onClick={() => onSelectTab('audit')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="size-4 text-foreground" />
              <span>Access & Audit Log</span>
            </div>
            {disputedCount > 0 ? (
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold gap-1">
                <AlertTriangle className="size-2.5" />
                <span>{disputedCount}</span>
              </Badge>
            ) : null}
          </button>
        </div>
      </div>

      {/* 3. Bottom: Theme & Accessibility */}
      <div className="pt-4 border-t border-border/60">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Moon className="size-3.5 text-foreground" />
                ) : theme === 'light' ? (
                  <Sun className="size-3.5 text-foreground" />
                ) : (
                  <Laptop className="size-3.5 text-foreground" />
                )}
                <span>Accessibility & Theme</span>
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg">
            <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
              Interface Mode
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={() => setTheme('light')}
              className="cursor-pointer gap-2 py-1.5 text-xs font-medium"
            >
              <Sun className="size-4 text-foreground" />
              <span>Light Mode</span>
              {theme === 'light' && <Check className="ml-auto size-3.5 text-foreground" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme('dark')}
              className="cursor-pointer gap-2 py-1.5 text-xs font-medium"
            >
              <Moon className="size-4 text-foreground" />
              <span>Dark Mode</span>
              {theme === 'dark' && <Check className="ml-auto size-3.5 text-foreground" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme('system')}
              className="cursor-pointer gap-2 py-1.5 text-xs font-medium"
            >
              <Laptop className="size-4 text-foreground" />
              <span>System Default</span>
              {theme === 'system' && <Check className="ml-auto size-3.5 text-foreground" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};
