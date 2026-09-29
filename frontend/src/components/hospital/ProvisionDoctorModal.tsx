import React, { useState } from 'react';
import { api } from '@/lib/api';
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
import { Stethoscope, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProvisionDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SPECIALTIES = [
  'General Practice',
  'Cardiology',
  'Emergency Medicine',
  'Pediatrics',
  'Internal Medicine',
  'Neurology',
  'Oncology',
  'Orthopedic Surgery',
  'Psychiatry',
];

export const ProvisionDoctorModal: React.FC<ProvisionDoctorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [specialty, setSpecialty] = useState('General Practice');
  const [gender, setGender] = useState('F');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Doctor name and valid email are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim().startsWith('Dr.') ? name.trim() : `Dr. ${name.trim()}`,
        email: email.trim().toLowerCase(),
        password: password.trim(),
        specialty,
        gender,
      };

      await api.post('/hospitals/doctors', payload);

      toast.success('Doctor provisioned successfully', {
        description: `${payload.name} credentialed to this hospital`,
      });

      // Reset form
      setName('');
      setEmail('');
      setPassword('password123');
      setSpecialty('General Practice');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to provision doctor', {
        description: err.response?.data?.message || err.response?.data?.issues?.[0]?.message || 'Server error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full sm:max-w-xl p-6 sm:p-7">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Stethoscope className="size-5 text-primary" />
              <DialogTitle className="text-lg font-bold text-foreground">
                Provision Attending Physician
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Create and credential an attending doctor account assigned to this hospital jurisdiction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Physician Full Name *</Label>
              <Input
                placeholder="e.g. Dr. Marcus Vance"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Institutional Email *</Label>
                <Input
                  type="email"
                  placeholder="e.g. marcus.vance@curaone.health"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Initial Password *</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Clinical Specialty</Label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1"
                >
                  {SPECIALTIES.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Gender</Label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1"
                >
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="cursor-pointer gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Provisioning...</span>
                </>
              ) : (
                <span>Provision Doctor</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
