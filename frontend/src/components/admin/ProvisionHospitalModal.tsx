import React, { useState } from 'react';
import { api, getApiErrorMessage } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, PlusCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface ProvisionHospitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProvisionHospitalModal: React.FC<ProvisionHospitalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [city, setCity] = useState('');
  const [state, setState] = useState('MA');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !adminEmail.trim() || !password) {
      toast.error('Hospital name, admin email, and password are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/admin/hospitals', {
        name: name.trim(),
        adminEmail: adminEmail.trim(),
        password,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      toast.success('Hospital Node Provisioned', {
        description: `${name} enrolled into CuraOne federation with administrator credentials.`,
      });

      setName('');
      setAdminEmail('');
      setPassword('password123');
      setCity('');
      setPhone('');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Provisioning failed', {
        description: getApiErrorMessage(err, 'Failed to provision hospital node'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full sm:max-w-md p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="size-5" />
              <DialogTitle className="text-lg font-bold text-foreground">
                Provision New Hospital Node
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Register an institutional healthcare facility into the CuraOne federation and establish its root custodial admin account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Hospital / Facility Name *</Label>
            <Input
              placeholder="e.g. Tufts Medical Center"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Admin Email *</Label>
              <Input
                type="email"
                placeholder="admin@tufts.curaone.health"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Initial Password *</Label>
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 text-xs font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs font-medium text-foreground">City</Label>
              <Input
                placeholder="e.g. Boston"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">State</Label>
              <Input
                placeholder="MA"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="h-9 text-xs uppercase"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Contact Phone</Label>
            <Input
              placeholder="e.g. 617-636-5000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="rounded-md bg-muted/40 p-2.5 border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary shrink-0" />
            <span>The new hospital will be able to manage doctors, view cross-hospital clearances, and ingest custodial encounters.</span>
          </div>

          <DialogFooter className="pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="cursor-pointer text-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Enrolling...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="size-3.5" />
                  <span>Enroll Hospital Node</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
