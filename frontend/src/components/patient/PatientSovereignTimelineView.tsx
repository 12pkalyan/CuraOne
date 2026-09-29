import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TimelineResponse, TimelineEncounter } from '@/types/patient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EncounterDetailModal } from '@/components/patients/EncounterDetailModal';
import { PaginationControl } from '@/components/ui/pagination-control';
import { 
  FileText, 
  Building2, 
  Calendar, 
  Loader2, 
  ShieldCheck, 
  Activity, 
  Pill, 
  AlertCircle,
  Stethoscope,
  Eye
} from 'lucide-react';

export const PatientSovereignTimelineView: React.FC = () => {
  const [selectedEncounter, setSelectedEncounter] = useState<TimelineEncounter | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, refetch } = useQuery<TimelineResponse>({
    queryKey: ['myPatientTimeline'],
    queryFn: async () => {
      const res = await api.get<TimelineResponse>('/patients/me/timeline');
      return res.data;
    },
  });

  const encounters = data?.encounters || [];
  const patient = data?.patient;
  const summary = data?.summary;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Banner */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-5 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {patient ? `${patient.firstName} ${patient.lastName}` : 'My Medical Records'}
              </h1>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                100% Unlocked Sovereign Access
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Your unified longitudinal EHR aggregated across all participating hospital networks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-center">
              <p className="text-[11px] text-muted-foreground uppercase font-medium">Encounters</p>
              <p className="text-lg font-bold text-foreground">{summary?.totalEncounters || encounters.length}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-center">
              <p className="text-[11px] text-muted-foreground uppercase font-medium">Hospitals</p>
              <p className="text-lg font-bold text-primary">{summary?.hospitalsInvolved?.length || 1}</p>
            </div>
          </div>
        </div>

        {/* Participating Custodians */}
        {summary?.hospitalsInvolved && summary.hospitalsInvolved.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/40 text-xs text-muted-foreground">
            <span>Custodial Record Holders:</span>
            {summary.hospitalsInvolved.map((hosp, idx) => (
              <Badge key={idx} variant="outline" className="text-[11px] font-normal bg-background text-foreground">
                <Building2 className="size-3 mr-1 text-primary" />
                {hosp}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* 2. Longitudinal Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <span>Chronological Clinical Encounters</span>
          </h2>
          <span className="text-xs text-muted-foreground">Showing {encounters.length} visits</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-foreground" />
            <p className="text-sm">Loading your health history...</p>
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2">
            <p className="text-sm text-destructive font-semibold">Failed to load medical records</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : encounters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-2">
            <FileText className="size-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No clinical encounters recorded</p>
            <p className="text-xs text-muted-foreground">
              Clinical encounters will appear here as you receive care across participating hospitals.
            </p>
          </div>
        ) : (
          encounters.slice((page - 1) * pageSize, page * pageSize).map((encounter) => {
            const startDate = new Date(encounter.startDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            const conditions = encounter.clinicalEvents.filter((e) => e.eventType === 'CONDITION');
            const medications = encounter.clinicalEvents.filter((e) => e.eventType === 'MEDICATION');

            return (
              <Card key={encounter.id} className="border-border/60 bg-card/60 shadow-xs hover:border-border transition-colors">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold">
                        <ShieldCheck className="size-3" />
                        Sovereign Unlocked
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                        <Calendar className="size-3" />
                        {startDate}
                      </span>
                      {encounter.encounterClass && (
                        <Badge variant="outline" className="capitalize text-[10px] bg-muted/50">
                          {encounter.encounterClass}
                        </Badge>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEncounter(encounter)}
                      className="text-xs cursor-pointer gap-1.5 font-medium text-foreground hover:bg-muted"
                    >
                      <Eye className="size-3.5" />
                      <span>Inspect Details</span>
                    </Button>
                  </div>

                  {/* Encounter Main Details */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-foreground">
                      {encounter.description || 'Clinical Encounter'}
                    </h3>
                    {encounter.reasonDescription && (
                      <p className="text-xs text-muted-foreground">
                        Reason: {encounter.reasonDescription}
                      </p>
                    )}
                  </div>

                  {/* Facility and Doctor Attribution */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="flex items-center gap-1.5 text-foreground">
                      <Building2 className="size-3.5 text-primary shrink-0" />
                      <span className="text-muted-foreground">Custodial Facility:</span>
                      <span className="font-semibold">{encounter.hospitalName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-foreground">
                      <Stethoscope className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Attending:</span>
                      <span className="font-semibold">{encounter.doctorName || 'Attending Physician'}</span>
                    </div>
                  </div>

                  {/* Clinical Events Quick Summary */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40 text-xs">
                    {conditions.length > 0 && (
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="size-3" />
                        <span>{conditions.length} Diagnoses: </span>
                        <span className="font-medium text-foreground truncate max-w-[200px]">
                          {conditions.map((c) => c.description).join(', ')}
                        </span>
                      </div>
                    )}

                    {medications.length > 0 && (
                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 ml-auto">
                        <Pill className="size-3" />
                        <span>{medications.length} Prescriptions: </span>
                        <span className="font-medium text-foreground truncate max-w-[200px]">
                          {medications.map((m) => m.description).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
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

      {/* Inspection Modal */}
      {selectedEncounter && (
        <EncounterDetailModal
          encounter={selectedEncounter}
          isOpen={Boolean(selectedEncounter)}
          onClose={() => setSelectedEncounter(null)}
        />
      )}
    </div>
  );
};
