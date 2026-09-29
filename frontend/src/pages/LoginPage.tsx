import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/api';
import { Card, CardHeader, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Activity, 
  ShieldCheck, 
  Building2, 
  Stethoscope, 
  User as UserIcon, 
  Shield, 
  Loader2, 
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import type { Role } from '@/types/auth';

const QUICK_CREDENTIALS: Array<{
  role: Role;
  label: string;
  email: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  {
    role: 'DOCTOR',
    label: 'Doctor',
    email: 'tomas.sauer.3421@curaone.health',
    description: 'Dr. Tomas Sauer (Framingham Union)',
    icon: Stethoscope,
    color: 'border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
  },
  {
    role: 'HOSPITAL',
    label: 'Hospital Admin',
    email: 'admin.ef58@hospital.curaone.health',
    description: 'MetroWest Medical Center Admin',
    icon: Building2,
    color: 'border-blue-500/30 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-blue-700 dark:text-blue-300',
  },
  {
    role: 'PATIENT',
    label: 'Patient',
    email: 'raye.wunsch.e4f1@patient.curaone.health',
    description: 'Raye Wunsch (Multi-hospital cohort)',
    icon: UserIcon,
    color: 'border-amber-500/30 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-amber-700 dark:text-amber-300',
  },
  {
    role: 'SYSTEM_ADMIN',
    label: 'System Admin',
    email: 'admin@curaone.health',
    description: 'CuraOne Platform Root Admin',
    icon: Shield,
    color: 'border-purple-500/30 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-purple-700 dark:text-purple-300',
  },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, registerPatient } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<Role | null>(null);

  // Patient registration state
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regCity, setRegCity] = useState('');
  const [regState, setRegState] = useState('MA');

  const redirectPath = (location.state as any)?.from?.pathname || '/dashboard';

  const handleQuickFill = (role: Role, email: string) => {
    setLoginEmail(email);
    setLoginPassword('password123');
    setSelectedDemoRole(role);
    toast.info(`Filled credentials for ${role}`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login({ email: loginEmail, password: loginPassword });
      toast.success(`Welcome back, ${user.name}!`);
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Authentication failed. Check your credentials.');
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFirstName || !regLastName || !regEmail || !regPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await registerPatient({
        firstName: regFirstName,
        lastName: regLastName,
        email: regEmail,
        password: regPassword,
        city: regCity || undefined,
        state: regState || undefined,
      });
      toast.success(`Account created! Welcome, ${user.name}`);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Registration failed. Check your information.');
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-muted/30 to-background px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Activity className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            CuraOne Platform
          </h1>
          <p className="text-sm text-muted-foreground">
            Cross-Hospital Longitudinal Medical Records & Authorized Clinical RAG
          </p>
        </div>

        {/* Quick Demo Credentials Bar */}
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="size-3.5 text-foreground" />
              Demo One-Click Login
            </span>
            <span className="text-[11px] text-muted-foreground">universal password: password123</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QUICK_CREDENTIALS.map((cred) => {
              const Icon = cred.icon;
              const isSelected = selectedDemoRole === cred.role;
              return (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => handleQuickFill(cred.role, cred.email)}
                  className={`flex flex-col items-start rounded-lg border p-2 text-left transition-all cursor-pointer ${cred.color} ${
                    isSelected ? 'ring-2 ring-primary bg-accent/50' : 'bg-background/60'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Icon className="size-3.5" />
                    <span className="text-xs font-bold">{cred.label}</span>
                  </div>
                  <span className="mt-1 text-[10px] text-muted-foreground truncate w-full">
                    {cred.email.split('@')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Auth Tabs Card */}
        <Card className="border-border/60 shadow-lg">
          <CardHeader className="pb-4">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register as Patient</TabsTrigger>
              </TabsList>

              {/* LOGIN TAB */}
              <TabsContent value="login" className="mt-4 space-y-4">
                <CardDescription>
                  Enter your credentials to access your authorized clinical records or institution portal.
                </CardDescription>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email">Email Address</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@hospital.curaone.health"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      {selectedDemoRole && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                          Filled: {selectedDemoRole}
                        </Badge>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
                        title={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full gap-2 cursor-pointer" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* REGISTER TAB */}
              <TabsContent value="register" className="mt-4 space-y-4">
                <CardDescription>
                  Self-register as a new patient to manage your consent grants and review your longitudinal health timeline.
                </CardDescription>

                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-first">First Name</Label>
                      <Input
                        id="reg-first"
                        placeholder="e.g. Eleanor"
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-last">Last Name</Label>
                      <Input
                        id="reg-last"
                        placeholder="e.g. Vance"
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email">Email Address</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="eleanor.vance@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password">Password (min 6 chars)</Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showRegPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        minLength={6}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
                        title={showRegPassword ? "Hide password" : "Show password"}
                      >
                        {showRegPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-city">City</Label>
                      <Input
                        id="reg-city"
                        placeholder="e.g. Boston"
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-state">State</Label>
                      <Input
                        id="reg-state"
                        placeholder="e.g. MA"
                        value={regState}
                        onChange={(e) => setRegState(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full mt-2 gap-2 cursor-pointer" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Complete Registration
                        <ShieldCheck className="size-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        {/* Research Footer */}
        <p className="text-center text-xs text-muted-foreground">
          CuraOne Research Prototype • Final Year Project • Multi-Hospital Custodianship & Gated RAG
        </p>
      </div>
    </div>
  );
};
