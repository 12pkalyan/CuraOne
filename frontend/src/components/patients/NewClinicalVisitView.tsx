import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { SearchPatientsResponse, TimelineResponse, CreateClinicalEventInput, CreateEncounterPayload } from '@/types/patient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Stethoscope, 
  User, 
  Search, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  FileText,
  Activity,
  Pill
} from 'lucide-react';
import { toast } from 'sonner';

interface NewClinicalVisitViewProps {
  preselectedPatientId?: string | null;
  onSelectPatient: (patientId: string) => void;
  onViewTimeline: (patientId: string) => void;
}

function calculateAge(birthdateStr: string): number {
  const birth = new Date(birthdateStr);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export const NewClinicalVisitView: React.FC<NewClinicalVisitViewProps> = ({
  preselectedPatientId,
  onSelectPatient,
  onViewTimeline,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activePatientId, setActivePatientId] = useState<string | null>(preselectedPatientId || null);
  const [patientSearch, setPatientSearch] = useState('');

  // Form State
  const [encounterClass, setEncounterClass] = useState('AMBULATORY');
  const [reasonDescription, setReasonDescription] = useState('');
  const [description, setDescription] = useState('');
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 16));

  // Diagnoses
  const [conditions, setConditions] = useState<{ description: string; code: string }[]>([]);
  const [condInput, setCondInput] = useState('');
  const [condCode, setCondCode] = useState('');

  // Medications
  const [medications, setMedications] = useState<{ description: string; instructions: string }[]>([]);
  const [medInput, setMedInput] = useState('');
  const [medInstructions, setMedInstructions] = useState('');

  // Update activePatientId if prop changes
  useEffect(() => {
    if (preselectedPatientId) {
      setActivePatientId(preselectedPatientId);
    }
  }, [preselectedPatientId]);

  // Fetch patient search results when doctor searches for a patient
  const { data: searchResults, isLoading: isSearching } = useQuery<SearchPatientsResponse>({
    queryKey: ['patients-search-visit', patientSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (patientSearch.trim()) {
        params.append('search', patientSearch.trim());
      }
      params.append('limit', '8');
      const res = await api.get<SearchPatientsResponse>(`/patients?${params.toString()}`);
      return res.data;
    },
    enabled: !activePatientId || patientSearch.length > 0,
  });

  // Fetch selected patient's identity details
  const { data: patientTimelineData } = useQuery<TimelineResponse>({
    queryKey: ['patient-detail-visit', activePatientId],
    queryFn: async () => {
      const res = await api.get<TimelineResponse>(`/patients/${activePatientId}/timeline`);
      return res.data;
    },
    enabled: !!activePatientId,
  });

  const selectedPatient = patientTimelineData?.patient;

  // Add Condition Handler
  const handleAddCondition = () => {
    if (!condInput.trim()) return;
    setConditions([...conditions, { description: condInput.trim(), code: condCode.trim() }]);
    setCondInput('');
    setCondCode('');
  };

  const handleRemoveCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  // Add Medication Handler
  const handleAddMedication = () => {
    if (!medInput.trim()) return;
    setMedications([...medications, { description: medInput.trim(), instructions: medInstructions.trim() }]);
    setMedInput('');
    setMedInstructions('');
  };

  const handleRemoveMedication = (idx: number) => {
    setMedications(medications.filter((_, i) => i !== idx));
  };

  // Submit Encounter Mutation
  const encounterMutation = useMutation({
    mutationFn: async (payload: CreateEncounterPayload) => {
      if (!activePatientId) throw new Error('No patient selected');
      const res = await api.post(`/patients/${activePatientId}/encounters`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Clinical Visit Recorded Successfully', {
        description: `Encounter saved and signed into custodial EHR.`,
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['patientTimeline', activePatientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      // Reset form fields
      setDescription('');
      setReasonDescription('');
      setConditions([]);
      setMedications([]);
    },
    onError: (err: any) => {
      toast.error('Failed to record clinical visit', {
        description: err.response?.data?.message || 'Server error occurred',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!activePatientId) {
      toast.error('Please select a patient before recording a visit');
      return;
    }

    if (!description.trim()) {
      toast.error('Please provide clinical notes and assessment');
      return;
    }

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
      startDate: new Date(visitDate).toISOString(),
      encounterClass,
      description: description.trim(),
      reasonDescription: reasonDescription.trim() || undefined,
      events: events.length > 0 ? events : undefined,
    };

    encounterMutation.mutate(payload);
  };

  const doctorHospitalName = user?.details?.hospitalName || 'Custodial Facility';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Stethoscope className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">New Clinical Visit</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Document an authorized clinical encounter, diagnostic findings, and prescriptions directly into the custodial EHR.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs bg-muted/40 border-border/80 text-foreground">
            <Building2 className="size-3.5 text-primary" />
            <span>Facility: <strong>{doctorHospitalName}</strong></span>
          </Badge>
        </div>
      </div>

      {/* 2. Patient Context Selector */}
      {!activePatientId ? (
        <Card className="border-border/80 bg-card/60 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="size-4 text-primary" />
              <span>Select Patient for Clinical Encounter</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Search by name or select a patient from the hospital cohort to open their clinical encounter chart.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search patient by first or last name..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="pl-10 h-11 text-sm bg-background border-border/80"
              />
            </div>

            {isSearching ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                <span>Searching patient registry...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(searchResults?.patients || []).map((p) => {
                  const age = p.birthdate ? calculateAge(p.birthdate) : null;
                  const genderLabel = p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : p.gender;

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setActivePatientId(p.id);
                        onSelectPatient(p.id);
                      }}
                      className="group p-3 rounded-lg border border-border/60 bg-background hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {p.firstName} {p.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {genderLabel}{age !== null ? `, ${age} yrs` : ''} • {p.city || 'MA'}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground group-hover:text-primary">
                        <span>Select</span>
                        <ArrowRight className="size-3 ml-1" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Selected Patient Identity Card */
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {selectedPatient ? `${selectedPatient.firstName[0]}${selectedPatient.lastName[0]}` : <User className="size-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Selected Patient'}
                </h3>
                {selectedPatient?.birthdate && (
                  <Badge variant="outline" className="text-xs bg-background/80 text-muted-foreground border-border/60">
                    {selectedPatient.gender === 'M' ? 'Male' : 'Female'}, {calculateAge(selectedPatient.birthdate)}y
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Active Clinical Chart
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                MRN: <span className="font-mono text-foreground font-medium">{activePatientId}</span> • {selectedPatient?.city || 'MA'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActivePatientId(null)}
              className="text-xs h-8 cursor-pointer"
            >
              Change Patient
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onViewTimeline(activePatientId)}
              className="text-xs h-8 cursor-pointer gap-1.5"
            >
              <FileText className="size-3.5" />
              <span>View Timeline</span>
            </Button>
          </div>
        </div>
      )}

      {/* 3. Clinical Encounter Entry Form */}
      {activePatientId && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-border/60 bg-card/60 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <span>Visit Classification & Encounter Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Encounter Class */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Encounter Class *</Label>
                  <select
                    value={encounterClass}
                    onChange={(e) => setEncounterClass(e.target.value)}
                    className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1"
                  >
                    <option value="AMBULATORY">Ambulatory (Routine Clinic)</option>
                    <option value="OUTPATIENT">Outpatient Consultation</option>
                    <option value="EMERGENCY">Emergency Room Admission</option>
                    <option value="INPATIENT">Inpatient Hospitalization</option>
                    <option value="WELLNESS">Preventative Wellness Visit</option>
                  </select>
                </div>

                {/* Visit Date & Time */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                {/* Chief Complaint / Reason */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Reason for Visit / Chief Complaint</Label>
                  <Input
                    placeholder="e.g. Chronic cough & hypertension review"
                    value={reasonDescription}
                    onChange={(e) => setReasonDescription(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Comprehensive Clinical Narrative / Progress Notes */}
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-medium text-foreground">
                  Clinical Assessment & Progress Notes (SOAP) *
                </Label>
                <Textarea
                  placeholder="Subjective: Patient presents with... Objective: Vitals stable, BP 130/85... Assessment: Controlled hypertension... Plan: Continue medication regimen..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="text-xs resize-none"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* 4. Diagnoses / Conditions */}
          <Card className="border-border/60 bg-card/60 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <span>Diagnoses & Clinical Conditions</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Link active diagnoses or chronic conditions to this encounter.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Condition description (e.g. Essential Hypertension)"
                  value={condInput}
                  onChange={(e) => setCondInput(e.target.value)}
                  className="h-9 text-xs flex-1"
                />
                <Input
                  placeholder="ICD-10 Code (e.g. I10)"
                  value={condCode}
                  onChange={(e) => setCondCode(e.target.value)}
                  className="h-9 text-xs sm:w-36"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCondition}
                  disabled={!condInput.trim()}
                  className="h-9 px-3 cursor-pointer text-xs gap-1 self-start sm:self-auto"
                >
                  <Plus className="size-3.5" />
                  <span>Add Condition</span>
                </Button>
              </div>

              {conditions.length > 0 ? (
                <div className="space-y-2">
                  {conditions.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-background text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="size-3.5 text-primary" />
                        <span className="font-semibold text-foreground">{c.description}</span>
                        {c.code && (
                          <Badge variant="outline" className="text-[10px] font-mono py-0 text-muted-foreground">
                            {c.code}
                          </Badge>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(i)}
                        className="text-muted-foreground hover:text-destructive cursor-pointer p-1"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No conditions added for this encounter yet.</p>
              )}
            </CardContent>
          </Card>

          {/* 5. Prescriptions & Medications */}
          <Card className="border-border/60 bg-card/60 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Pill className="size-4 text-primary" />
                <span>Prescriptions & Medications</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Log pharmacological orders or prescription renewals associated with this visit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Medication name (e.g. Lisinopril 10 MG Oral Tablet)"
                  value={medInput}
                  onChange={(e) => setMedInput(e.target.value)}
                  className="h-9 text-xs flex-1"
                />
                <Input
                  placeholder="Dosage instructions (e.g. Take 1 tablet daily in morning)"
                  value={medInstructions}
                  onChange={(e) => setMedInstructions(e.target.value)}
                  className="h-9 text-xs sm:w-56"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddMedication}
                  disabled={!medInput.trim()}
                  className="h-9 px-3 cursor-pointer text-xs gap-1 self-start sm:self-auto"
                >
                  <Plus className="size-3.5" />
                  <span>Add Medication</span>
                </Button>
              </div>

              {medications.length > 0 ? (
                <div className="space-y-2">
                  {medications.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-background text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Pill className="size-3.5 text-blue-500" />
                        <span className="font-semibold text-foreground">{m.description}</span>
                        {m.instructions && (
                          <span className="text-muted-foreground">— {m.instructions}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(i)}
                        className="text-muted-foreground hover:text-destructive cursor-pointer p-1"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No medications prescribed for this encounter yet.</p>
              )}
            </CardContent>
          </Card>

          {/* 6. Form Submission Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-3 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>Record will be cryptographically signed by attending physician under {doctorHospitalName}.</span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDescription('');
                  setReasonDescription('');
                  setConditions([]);
                  setMedications([]);
                }}
                disabled={encounterMutation.isPending}
                className="cursor-pointer text-xs"
              >
                Clear Form
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={encounterMutation.isPending}
                className="cursor-pointer gap-2 font-semibold"
              >
                {encounterMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Signing & Ingesting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    <span>Save & Ingest Encounter</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
