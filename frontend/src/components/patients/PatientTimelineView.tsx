import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TimelineResponse, TimelineEncounter } from '@/types/patient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EncounterDetailModal } from '@/components/patients/EncounterDetailModal';
import { RecordEncounterModal } from '@/components/patients/RecordEncounterModal';
import { RequestGrantModal } from '@/components/grants/RequestGrantModal';
import { PaginationControl } from '@/components/ui/pagination-control';
import {
  ArrowLeft,
  Lock,
  ShieldCheck,
  PlusCircle,
  Building2,
  Stethoscope,
  Loader2,
  Activity,
  Pill,
  ChevronRight,
  FileText,
  AlertTriangle
} from 'lucide-react';

interface PatientTimelineViewProps {
  patientId: string;
  onBack: () => void;
  onNavigateToNewVisit?: () => void;
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

export const PatientTimelineView: React.FC<PatientTimelineViewProps> = ({ 
  patientId, 
  onBack,
  onNavigateToNewVisit 
}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [selectedEncounter, setSelectedEncounter] = useState<TimelineEncounter | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [grantRequestTarget, setGrantRequestTarget] = useState<{ id: string; name: string; isEmergency?: boolean } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<TimelineResponse>({
    queryKey: ['patientTimeline', patientId],
    queryFn: async () => {
      const res = await api.get<TimelineResponse>(`/patients/${patientId}/timeline`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-foreground" />
        <p className="text-sm font-medium">Loading longitudinal clinical records...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-destructive">Failed to load patient timeline</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const { patient, encounters, summary } = data;
  const age = patient.birthdate ? calculateAge(patient.birthdate) : null;
  const genderLabel = patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Top Navigation & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 cursor-pointer self-start text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Patients</span>
        </Button>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onNavigateToNewVisit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToNewVisit}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <FileText className="size-3.5" />
              <span>Full Visit Chart</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setIsRecordModalOpen(true)}
            className="gap-2 cursor-pointer font-medium"
          >
            <PlusCircle className="size-4" />
            <span>Record New Clinical Visit</span>
          </Button>
        </div>
      </div>

      {/* 2. Patient Identity Card */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-foreground">
                {patient.firstName} {patient.lastName}
              </h1>
              {age !== null && (
                <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
                  {genderLabel}, {age}y
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {patient.email} {patient.city ? `• ${patient.city}, ${patient.state || 'MA'}` : ''} • DOB: {patient.birthdate}
            </p>
          </div>

          {/* Access Summary Badges */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {summary.unlockedEncounters} Unlocked
            </span>
            {summary.lockedEncounters > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border">
                {summary.lockedEncounters} Protected (Locked)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Longitudinal Timeline List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Longitudinal Clinical History ({encounters.length} Encounters)
        </h2>

        {encounters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No clinical records logged for this patient yet.
          </div>
        ) : (
          <div className="space-y-3">
            {encounters.slice((page - 1) * pageSize, page * pageSize).map((enc) => {
              const formattedDate = new Date(enc.startDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              if (enc.isLocked) {
                // LOCKED ENCOUNTER CARD
                return (
                  <Card
                    key={enc.id}
                    className="border-dashed border-border/80 bg-muted/15 shadow-xs"
                  >
                    <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[11px] bg-muted/50 text-muted-foreground gap-1 border-border/70">
                            <Lock className="size-3 text-muted-foreground" />
                            Protected Record
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">{formattedDate}</span>
                          <span className="text-xs font-medium text-foreground">
                            {enc.encounterClass || 'Enc'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="size-3.5 text-foreground shrink-0" />
                          <span className="font-semibold text-foreground truncate">{enc.hospitalName}</span>
                          {enc.hospitalCity && <span>• {enc.hospitalCity}, {enc.hospitalState}</span>}
                        </div>

                        <p className="text-xs text-muted-foreground/80 italic">
                          Protected cross-hospital clinical records. Consent grant required to decrypt notes, diagnoses, and prescriptions.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setGrantRequestTarget({ id: enc.hospitalId, name: enc.hospitalName, isEmergency: false })}
                          className="gap-1.5 cursor-pointer text-xs font-medium hover:border-primary/50"
                        >
                          <ShieldCheck className="size-3.5 text-foreground" />
                          <span>Request Access</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setGrantRequestTarget({ id: enc.hospitalId, name: enc.hospitalName, isEmergency: true })}
                          className="gap-1.5 cursor-pointer text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-500/40 hover:bg-rose-500/10 hover:border-rose-500 shadow-xs"
                          title="Activate Emergency Break-Glass Override"
                        >
                          <AlertTriangle className="size-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Break-Glass</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // UNLOCKED ENCOUNTER CARD
              const conditions = enc.clinicalEvents.filter((e) => e.eventType === 'CONDITION');
              const medications = enc.clinicalEvents.filter((e) => e.eventType === 'MEDICATION');

              return (
                <Card
                  key={enc.id}
                  onClick={() => setSelectedEncounter(enc)}
                  className="border-border/60 hover:border-border hover:shadow-xs transition-all bg-card/60 cursor-pointer group"
                >
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1"
                        >
                          <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
                          {enc.accessReason === 'CUSTODIAL_OWNER' ? 'Unlocked (Local Custodian)' : 'Unlocked (Active Grant)'}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">{formattedDate}</span>
                        <span className="text-xs font-bold text-foreground">
                          {enc.encounterClass || 'Ambulatory Visit'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                        <span>Inspect Record</span>
                        <ChevronRight className="size-3.5" />
                      </div>
                    </div>

                    {/* Custodian & Provider */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 text-foreground font-medium">
                        <Building2 className="size-3.5 text-foreground" />
                        {enc.hospitalName}
                      </span>
                      {enc.doctorName && (
                        <span className="flex items-center gap-1">
                          <Stethoscope className="size-3.5 text-muted-foreground" />
                          {enc.doctorName}
                        </span>
                      )}
                      {enc.reasonDescription && (
                        <span className="italic text-foreground">
                          Chief: {enc.reasonDescription}
                        </span>
                      )}
                    </div>

                    {/* Clinical Note Excerpt */}
                    {enc.description && (
                      <p className="text-xs text-foreground/90 line-clamp-2 bg-muted/20 p-2 rounded-md">
                        {enc.description}
                      </p>
                    )}

                    {/* Badges preview for conditions & medications */}
                    {(conditions.length > 0 || medications.length > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {conditions.slice(0, 3).map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-muted text-foreground"
                          >
                            <Activity className="size-3 text-muted-foreground" />
                            {c.description}
                          </span>
                        ))}
                        {medications.slice(0, 2).map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-muted/60 text-foreground"
                          >
                            <Pill className="size-3 text-muted-foreground" />
                            {m.description}
                          </span>
                        ))}
                        {(conditions.length > 3 || medications.length > 2) && (
                          <span className="text-[10px] text-muted-foreground">
                            +{conditions.length + medications.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {encounters.length > 0 && (
          <PaginationControl
            currentPage={page}
            totalPages={Math.ceil(encounters.length / pageSize)}
            totalItems={encounters.length}
            pageSize={pageSize}
            onPageChange={setPage}
            itemLabel="encounters"
          />
        )}
      </div>

      {/* MODAL 1: Encounter Details Modal */}
      <EncounterDetailModal
        encounter={selectedEncounter}
        isOpen={!!selectedEncounter}
        onClose={() => setSelectedEncounter(null)}
      />

      {/* MODAL 2: Record New Clinical Visit Modal */}
      <RecordEncounterModal
        patientId={patient.id}
        patientName={`${patient.firstName} ${patient.lastName}`}
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['patientTimeline', patientId] });
          queryClient.invalidateQueries({ queryKey: ['patients'] });
        }}
      />

      {/* MODAL 3: Request Access Grant Modal */}
      {grantRequestTarget && (
        <RequestGrantModal
          patientId={patient.id}
          patientName={`${patient.firstName} ${patient.lastName}`}
          targetHospitalId={grantRequestTarget.id}
          targetHospitalName={grantRequestTarget.name}
          initialBreakGlass={grantRequestTarget.isEmergency}
          isOpen={true}
          onClose={() => setGrantRequestTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['patientTimeline', patientId] });
          }}
        />
      )}
    </div>
  );
};
