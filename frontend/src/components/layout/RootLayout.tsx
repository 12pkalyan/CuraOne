import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';

export const RootLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      <Outlet />
      <Toaster richColors position="top-right" />
    </div>
  );
};
