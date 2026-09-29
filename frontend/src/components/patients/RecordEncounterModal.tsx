import React, { useState } from 'react';
import { api } from '@/lib/api';
import type { CreateClinicalEventInput, CreateEncounterPayload } from '@/types/patient';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';

interface RecordEncounterModalProps {
  patientId: string;
  patientName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecordEncounterModal: React.FC<RecordEncounterModalProps> = ({
  patientId,
  patientName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [encounterClass, setEncounterClass] = useState('AMBULATORY');
  const [reasonDescription, setReasonDescription] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic conditions
  const [conditions, setConditions] = useState<{ description: string; code: string }[]>([]);
  const [condInput, setCondInput] = useState('');
  const [condCode, setCondCode] = useState('');

  // Dynamic medications
  const [medications, setMedications] = useState<{ description: string; instructions: string }[]>([]);
  const [medInput, setMedInput] = useState('');
  const [medInstructions, setMedInstructions] = useState('');

  const handleAddCondition = () => {
    if (!condInput.trim()) return;
    setConditions([...conditions, { description: condInput.trim(), code: condCode.trim() }]);
    setCondInput('');
    setCondCode('');
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleAddMedication = () => {
    if (!medInput.trim()) return;
    setMedications([...medications, { description: medInput.trim(), instructions: medInstructions.trim() }]);
    setMedInput('');
    setMedInstructions('');
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Clinical visit description is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const events: CreateClinicalEventInput[] = [];

      for (const c of conditions) {
        events.push({
          eventType: 'CONDITION',
          description: c.description,
          code: c.code || undefined,
        });
      }

      for (const m of medications) {
        events.push({
          eventType: 'MEDICATION',
          description: m.description,
          reasonDescription: m.instructions || undefined,
        });
      }

      const payload: CreateEncounterPayload = {
        startDate: new Date().toISOString(),
        encounterClass,
        description: description.trim(),
        reasonDescription: reasonDescription.trim() || undefined,
        events: events.length > 0 ? events : undefined,
      };

      await api.post(`/patients/${patientId}/encounters`, payload);

      toast.success('Clinical visit recorded successfully', {
        description: `Visit logged for ${patientName}`,
      });

      // Reset form
      setDescription('');
      setReasonDescription('');
      setConditions([]);
      setMedications([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to record encounter', {
        description: err.response?.data?.message || 'Server error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[88vh] overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Stethoscope className="size-5 text-primary" />
              <DialogTitle className="text-lg font-bold text-foreground">
                Record New Clinical Visit
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Document an authorized patient encounter, diagnoses, and prescriptions into the longitudinal EHR.
            </DialogDescription>
          </DialogHeader>

          {/* Patient Context Banner */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs flex items-center justify-between">
            <span className="text-muted-foreground">Patient:</span>
            <span className="font-semibold text-foreground">{patientName}</span>
          </div>

          {/* Visit Class & Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Encounter Class</Label>
              <select
                value={encounterClass}
                onChange={(e) => setEncounterClass(e.target.value)}
                className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1"
              >
                <option value="AMBULATORY">Ambulatory (Routine Clinic)</option>
                <option value="OUTPATIENT">Outpatient Encounter</option>
                <option value="EMERGENCY">Emergency Room</option>
                <option value="INPATIENT">Inpatient Admission</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Reason for Visit / Chief Complaint</Label>
              <Input
                placeholder="e.g. Hypertension Follow-up"
                value={reasonDescription}
                onChange={(e) => setReasonDescription(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Clinical Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Clinical Notes & Assessment *</Label>
            <Textarea
              placeholder="Enter comprehensive provider notes, examination findings, and clinical plan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-xs resize-none"
              required
            />
          </div>

          {/* Diagnoses Section */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <Label className="text-xs font-medium text-foreground">Add Diagnoses / Conditions</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Condition description (e.g. Essential Hypertension)"
                value={condInput}
                onChange={(e) => setCondInput(e.target.value)}
                className="h-8 text-xs flex-1"
              />
              <Input
                placeholder="ICD code (e.g. I10)"
                value={condCode}
                onChange={(e) => setCondCode(e.target.value)}
                className="h-8 text-xs w-28"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCondition}
                disabled={!condInput.trim()}
                className="h-8 px-2.5 cursor-pointer text-xs"
              >
                <Plus className="size-3.5" />
                Add
              </Button>
            </div>

            {conditions.length > 0 && (
              <div className="space-y-1 mt-2">
                {conditions.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded border border-border/50 bg-card/60 text-xs"
                  >
                    <span>
                      <strong className="text-foreground">{c.description}</strong>
                      {c.code && <span className="ml-2 font-mono text-[10px] text-muted-foreground">({c.code})</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(i)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Medications Section */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <Label className="text-xs font-medium text-foreground">Add Prescribed Medications</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Medication name (e.g. Lisinopril 10 MG)"
                value={medInput}
                onChange={(e) => setMedInput(e.target.value)}
                className="h-8 text-xs flex-1"
              />
              <Input
                placeholder="Dosage instructions (e.g. 1 tab daily)"
                value={medInstructions}
                onChange={(e) => setMedInstructions(e.target.value)}
                className="h-8 text-xs w-40"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMedication}
                disabled={!medInput.trim()}
                className="h-8 px-2.5 cursor-pointer text-xs"
              >
                <Plus className="size-3.5" />
                Add
              </Button>
            </div>

            {medications.length > 0 && (
              <div className="space-y-1 mt-2">
                {medications.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded border border-border/50 bg-card/60 text-xs"
                  >
                    <span>
                      <strong className="text-foreground">{m.description}</strong>
                      {m.instructions && <span className="ml-2 text-muted-foreground">— {m.instructions}</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedication(i)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                  <span>Recording...</span>
                </>
              ) : (
                <span>Save Visit to EHR</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
