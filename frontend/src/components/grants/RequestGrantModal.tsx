import React, { useState, useEffect } from 'react';
import { api, getApiErrorMessage } from '@/lib/api';
import type { CreateGrantPayload } from '@/types/grant';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Building2, User, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface RequestGrantModalProps {
  patientId: string;
  patientName: string;
  targetHospitalId: string;
  targetHospitalName: string;
  isOpen: boolean;
  initialBreakGlass?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RequestGrantModal: React.FC<RequestGrantModalProps> = ({
  patientId,
  patientName,
  targetHospitalId,
  targetHospitalName,
  isOpen,
  initialBreakGlass = false,
  onClose,
  onSuccess,
}) => {
  const [purpose, setPurpose] = useState('Comprehensive longitudinal clinical review and medication reconciliation.');
  const [durationDays, setDurationDays] = useState('30');
  const [isBreakGlass, setIsBreakGlass] = useState(Boolean(initialBreakGlass));
  const [attestationConfirmed, setAttestationConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsBreakGlass(Boolean(initialBreakGlass));
      setAttestationConfirmed(false);
    }
  }, [isOpen, initialBreakGlass]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim()) {
      toast.error('Clinical justification purpose is required');
      return;
    }

    if (isBreakGlass && !attestationConfirmed) {
      toast.error('You must affirm the legal emergency attestation before activating Break-Glass');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateGrantPayload = {
        patientId,
        targetHospitalId,
        purpose: purpose.trim(),
        durationDays: isBreakGlass ? 1 : parseInt(durationDays, 10),
        isBreakGlass,
        breakGlassAttestation: isBreakGlass
          ? `Attested by attending physician: Acute emergency care required for incapacitated patient. Purpose: ${purpose.trim()}`
          : undefined,
      };

      await api.post('/grants', payload);

      if (isBreakGlass) {
        toast.warning('Emergency Break-Glass Activated', {
          description: `Immediate 24-hour access granted. Retrospective audit alerts dispatched to patient and custodian hospital.`,
        });
      } else {
        toast.success('Access request submitted', {
          description: `Dual-Key request dispatched to ${patientName} and ${targetHospitalName}`,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to submit access grant request', {
        description: getApiErrorMessage(err, 'Server error occurred'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full sm:max-w-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header */}
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isBreakGlass ? (
                  <div className="size-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
                    <AlertTriangle className="size-5 text-rose-600" />
                  </div>
                ) : (
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <ShieldCheck className="size-5 text-primary" />
                  </div>
                )}
                <DialogTitle className="text-lg font-bold text-foreground">
                  {isBreakGlass ? 'Emergency Clinical Override' : 'Request Cross-Hospital Access'}
                </DialogTitle>
              </div>

              {isBreakGlass ? (
                <Badge variant="destructive" className="text-[10px] font-bold tracking-wider animate-pulse uppercase gap-1">
                  <AlertTriangle className="size-2.5" />
                  Emergency Mode
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Dual-Key Authorization
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {isBreakGlass
                ? 'Legal acute emergency bypass of patient sovereign consent under clinical necessity doctrine.'
                : 'Request Dual-Key clearance (Patient Consent + Custodial Hospital Clearance) to decrypt external medical records.'}
            </DialogDescription>
          </DialogHeader>

          {/* Prominent Mode Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-lg border border-border/70">
            <button
              type="button"
              onClick={() => {
                setIsBreakGlass(false);
                setAttestationConfirmed(false);
              }}
              className={`p-2.5 rounded-md text-left transition-all cursor-pointer flex flex-col justify-between ${
                !isBreakGlass
                  ? 'bg-background shadow-xs text-foreground font-semibold border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <ShieldCheck className={`size-3.5 ${!isBreakGlass ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>Standard Consent</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Normal Dual-Key consent
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsBreakGlass(true);
              }}
              className={`p-2.5 rounded-md text-left transition-all cursor-pointer flex flex-col justify-between ${
                isBreakGlass
                  ? 'bg-rose-600 text-white shadow-xs font-bold border border-rose-700'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <AlertTriangle className="size-3.5" />
                <span>🚨 Emergency Break-Glass</span>
              </div>
              <p className={`text-[10px] mt-0.5 ${isBreakGlass ? 'text-rose-100' : 'text-rose-600/80 dark:text-rose-400/80'}`}>
                Instant 24h acute override
              </p>
            </button>
          </div>

          {/* Context Info Box */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="size-3.5 text-foreground" />
                <span>Patient Subject:</span>
              </div>
              <span className="font-semibold text-foreground">{patientName}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="size-3.5 text-foreground" />
                <span>Target Custodian:</span>
              </div>
              <span className="font-semibold text-foreground truncate max-w-[220px]" title={targetHospitalName}>
                {targetHospitalName}
              </span>
            </div>
          </div>

          {/* Emergency Alert Box when Break-Glass is Active */}
          {isBreakGlass ? (
            <div className="rounded-xl border-2 border-rose-500/60 bg-rose-500/10 p-3.5 space-y-2.5 text-xs text-foreground">
              <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
                <AlertTriangle className="size-4 shrink-0" />
                <span className="text-xs uppercase tracking-wide">Critical 24-Hour Emergency Access Protocol</span>
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Break-Glass immediately decrypts and unlocks external custodial medical records without waiting for patient consent. Access is <strong className="text-foreground">clamped to 24 hours</strong>. A permanent legal audit alert will be dispatched to both institutions.
              </p>

              <div className="pt-2 border-t border-rose-500/30">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={attestationConfirmed}
                    onChange={(e) => setAttestationConfirmed(e.target.checked)}
                    className="mt-0.5 size-4 rounded border-rose-500 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    required
                  />
                  <span className="text-xs font-medium text-rose-700 dark:text-rose-300 leading-snug">
                    I attest under penalty of disciplinary review and license suspension that this patient is incapacitated and immediate access is vital to life-saving care.
                  </span>
                </label>
              </div>
            </div>
          ) : (
            /* Duration for Standard Flow */
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Authorization Duration</Label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1"
              >
                <option value="7">7 Days (Acute evaluation)</option>
                <option value="14">14 Days (Short follow-up)</option>
                <option value="30">30 Days (Standard care cycle)</option>
                <option value="90">90 Days (Chronic condition management)</option>
              </select>
            </div>
          )}

          {/* Purpose / Justification */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isBreakGlass ? 'Emergency Clinical Justification *' : 'Clinical Purpose & Justification *'}
            </Label>
            <Textarea
              placeholder={isBreakGlass ? "e.g. Unresponsive trauma patient in acute respiratory distress requiring immediate history..." : "State the clinical need for reviewing external records..."}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
              className="text-xs resize-none"
              required
            />
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
              variant={isBreakGlass ? 'destructive' : 'default'}
              disabled={isSubmitting || (isBreakGlass && !attestationConfirmed)}
              className={`cursor-pointer gap-2 font-semibold ${isBreakGlass ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : isBreakGlass ? (
                <>
                  <AlertTriangle className="size-3.5" />
                  <span>Activate 24h Emergency Override</span>
                </>
              ) : (
                <span>Submit Dual-Key Request</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
