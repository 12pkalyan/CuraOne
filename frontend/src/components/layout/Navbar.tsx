import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Activity, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="shrink-0 sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Activity className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-primary">CuraOne</span>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                EHR-RAG
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Cross-Hospital Longitudinal Access
            </p>
          </div>
        </div>

        {/* Direct Sign Out Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="gap-2 cursor-pointer text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
        >
          <LogOut className="size-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </header>
  );
};
