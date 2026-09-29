import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import { 
  Building2, 
  Users, 
  PlusCircle, 
  ShieldCheck, 
  Sparkles, 
  Sun, 
  Moon, 
  Laptop, 
  Check, 
  Stethoscope,
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

interface DoctorSidebarProps {
  activeView: 'patients' | 'grants' | 'copilot' | 'new-visit';
  onSelectView: (view: 'patients' | 'grants' | 'copilot' | 'new-visit') => void;
  isPatientSelected?: boolean;
  pendingGrantsCount?: number;
}

export const DoctorSidebar: React.FC<DoctorSidebarProps> = ({
  activeView,
  onSelectView,
  isPatientSelected = false,
  pendingGrantsCount = 0,
}) => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  if (!user) return null;

  const hospitalName = user.details?.hospitalName || 'Custodial Medical Center';
  const hospitalCity = user.details?.city || 'Leominster';
  const hospitalState = user.details?.state || 'MA';
  const specialty = user.details?.specialty || 'General Practice';

  return (
    <aside className="w-72 shrink-0 border-r border-border/60 bg-background/50 flex flex-col justify-between p-4 h-full overflow-y-auto">
      <div className="space-y-6">
        {/* 1. Facility Jurisdiction */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Building2 className="size-3.5 text-foreground" />
            <span>Facility Jurisdiction</span>
          </div>

          <div>
            <h2 className="text-sm font-bold text-foreground leading-tight">{hospitalName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{hospitalCity}, {hospitalState}</p>
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Stethoscope className="size-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{specialty}</p>
            </div>
          </div>
        </div>

        {/* 2. Clinical Navigation */}
        <div className="space-y-1">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Clinical Workspace
          </p>

          {/* Patients Directory */}
          <button
            type="button"
            onClick={() => onSelectView('patients')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeView === 'patients'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="size-4 text-foreground" />
              <span>Patients Directory</span>
            </div>
          </button>

          {/* New Clinical Visit (Always accessible dedicated clinical page) */}
          <button
            type="button"
            onClick={() => onSelectView('new-visit')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeView === 'new-visit'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <PlusCircle className="size-4 text-foreground" />
              <span>New Clinical Visit</span>
            </div>
            {isPatientSelected ? (
              <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                Patient Linked
              </Badge>
            ) : null}
          </button>

          {/* Access Grants */}
          <button
            type="button"
            onClick={() => onSelectView('grants')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeView === 'grants'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="size-4 text-foreground" />
              <span>Access Grants</span>
            </div>
            {pendingGrantsCount > 0 && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                {pendingGrantsCount}
              </Badge>
            )}
          </button>

          {/* AI Copilot (Slice 4) */}
          <button
            type="button"
            onClick={() => onSelectView('copilot')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeView === 'copilot'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="size-4 text-foreground" />
              <span>AI Copilot [RAG]</span>
            </div>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase">
              Soon
            </span>
          </button>
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
