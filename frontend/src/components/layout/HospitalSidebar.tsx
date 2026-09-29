import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import { 
  Building2, 
  Users, 
  Send, 
  Inbox, 
  ShieldCheck, 
  Sun, 
  Moon, 
  Laptop, 
  Check, 
  ChevronDown
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

export type HospitalView = 'doctors' | 'outbound' | 'inbound' | 'facility';

interface HospitalSidebarProps {
  activeView: HospitalView;
  onSelectView: (view: HospitalView) => void;
  pendingOutboundCount?: number;
  activeInboundCount?: number;
  flaggedOutboundCount?: number;
}

export const HospitalSidebar: React.FC<HospitalSidebarProps> = ({
  activeView,
  onSelectView,
  pendingOutboundCount = 0,
  activeInboundCount = 0,
  flaggedOutboundCount = 0,
}) => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  if (!user) return null;

  const hospitalName = user.name || user.details?.hospitalName || 'Custodial Medical Center';
  const hospitalCity = user.details?.city || 'Framingham';
  const hospitalState = user.details?.state || 'MA';

  return (
    <aside className="w-72 shrink-0 border-r border-border/60 bg-background/50 flex flex-col justify-between p-4 h-full overflow-y-auto">
      <div className="space-y-6">
        {/* 1. Institutional Node Jurisdiction */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Building2 className="size-3.5 text-foreground" />
            <span>Institutional Node</span>
          </div>

          <div>
            <h2 className="text-sm font-bold text-foreground leading-tight">{hospitalName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{hospitalCity}, {hospitalState}</p>
          </div>

          <div className="pt-2 border-t border-border/50 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Node ID:</span>
              <span className="font-mono text-xs text-foreground truncate max-w-[120px]">{user.id.slice(0, 8)}...</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Role:</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">
                Hospital Admin
              </Badge>
            </div>
          </div>
        </div>

        {/* 2. Governance Navigation (Strict Separation of Concerns) */}
        <div className="space-y-4">
          {/* Section A: Clinical Staff Oversight */}
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Clinical Staff Oversight
            </p>

            <button
              type="button"
              onClick={() => onSelectView('doctors')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeView === 'doctors'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="size-4 text-foreground" />
                <span>Medical Staff (Doctors)</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectView('outbound')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeView === 'outbound'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Send className="size-4 text-foreground" />
                <span>Outbound Doctor Requests</span>
              </div>
              <div className="flex items-center gap-1.5">
                {flaggedOutboundCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold animate-pulse">
                    🚨 {flaggedOutboundCount} Flagged
                  </Badge>
                )}
                {pendingOutboundCount > 0 && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                    {pendingOutboundCount}
                  </Badge>
                )}
              </div>
            </button>
          </div>

          {/* Section B: Custodial Data Governance */}
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Custodial Data Governance
            </p>

            <button
              type="button"
              onClick={() => onSelectView('inbound')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeView === 'inbound'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className="size-4 text-foreground" />
                <span>Inbound Record Disclosures</span>
              </div>
              {activeInboundCount > 0 && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  {activeInboundCount}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectView('facility')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeView === 'facility'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-foreground" />
                <span>Facility Node Info</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Bottom: Accessibility & Theme Dropdown */}
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
