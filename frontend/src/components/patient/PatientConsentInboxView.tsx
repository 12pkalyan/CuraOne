import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { GrantItem } from '@/types/grant';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Inbox, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Ban, 
  Building2, 
  Stethoscope, 
  Loader2, 
  ShieldCheck, 
  AlertTriangle,
  Key
} from 'lucide-react';
import { PaginationControl } from '@/components/ui/pagination-control';
import { toast } from 'sonner';

export const PatientConsentInboxView: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'PAST'>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, refetch } = useQuery<{ grants: GrantItem[]; count: number }>({
    queryKey: ['patientGrants'],
    queryFn: async () => {
      const res = await api.get<{ grants: GrantItem[]; count: number }>('/grants');
      return res.data;
    },
  });

  // Patient consent response mutation
  const consentMutation = useMutation({
    mutationFn: async ({ grantId, status }: { grantId: string; status: 'APPROVED' | 'REJECTED' }) => {
      await api.patch(`/grants/${grantId}/patient-consent`, { status });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === 'APPROVED'
          ? 'Consent Granted! Target hospital will be notified.'
          : 'Consent Declined'
      );
      queryClient.invalidateQueries({ queryKey: ['patientGrants'] });
    },
    onError: (err: any) => {
      toast.error('Failed to update consent', {
        description: err.response?.data?.message || 'Server error',
      });
    },
  });

  // Revoke consent mutation
  const revokeMutation = useMutation({
    mutationFn: async (grantId: string) => {
      await api.post(`/grants/${grantId}/revoke`);
    },
    onSuccess: () => {
      toast.success('Consent revoked immediately. Records are now re-locked.');
      queryClient.invalidateQueries({ queryKey: ['patientGrants'] });
    },
    onError: (err: any) => {
      toast.error('Failed to revoke consent', {
        description: err.response?.data?.message || 'Server error',
      });
    },
  });

  const grants = data?.grants || [];

  const pendingCount = grants.filter(
    (g) => g.patientConsent?.status === 'PENDING' && g.status === 'PENDING'
  ).length;

  const approvedCount = grants.filter(
    (g) => g.patientConsent?.status === 'APPROVED' && g.status !== 'REVOKED'
  ).length;

  const filteredGrants = grants.filter((g) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'PENDING') {
      return g.patientConsent?.status === 'PENDING' && g.status === 'PENDING';
    }
    if (activeFilter === 'APPROVED') {
      return g.patientConsent?.status === 'APPROVED' && g.status !== 'REVOKED';
    }
    if (activeFilter === 'PAST') {
      return g.status === 'REVOKED' || g.status === 'REJECTED' || g.patientConsent?.status === 'REJECTED';
    }
    return true;
  });
  const handleFilterChange = (filter: 'ALL' | 'PENDING' | 'APPROVED' | 'PAST') => {
    setActiveFilter(filter);
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Inbox className="size-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Consent Requests</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          You are the sovereign owner of your medical records. Review and approve or reject clinical data access requests from doctors.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => handleFilterChange('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
            activeFilter === 'ALL'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
          }`}
        >
          All Requests ({grants.length})
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange('PENDING')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1.5 ${
            activeFilter === 'PENDING'
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
          }`}
        >
          <Clock className="size-3" />
          <span>Requires Your Decision ({pendingCount})</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange('APPROVED')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1.5 ${
            activeFilter === 'APPROVED'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
          }`}
        >
          <CheckCircle2 className="size-3" />
          <span>Active Consents ({approvedCount})</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange('PAST')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1.5 ${
            activeFilter === 'PAST'
              ? 'bg-muted text-foreground border-border font-semibold'
              : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
          }`}
        >
          <Ban className="size-3" />
          <span>Past / Declined</span>
        </button>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-foreground" />
            <p className="text-sm">Loading consent requests...</p>
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2">
            <p className="text-sm text-destructive font-semibold">Failed to load consent requests</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filteredGrants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-2">
            <ShieldCheck className="size-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No consent requests found</p>
            <p className="text-xs text-muted-foreground">
              {activeFilter === 'PENDING'
                ? 'No pending requests require your attention at this time.'
                : 'Your consent history is clean.'}
            </p>
          </div>
        ) : (
          filteredGrants.slice((page - 1) * pageSize, page * pageSize).map((grant) => {
            const createdDate = new Date(grant.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            const patientConsentStatus = grant.patientConsent?.status || 'PENDING';
            const hospitalClearanceStatus = grant.hospitalClearance?.status || 'PENDING';
            const isPendingDecision = patientConsentStatus === 'PENDING' && grant.status === 'PENDING';

            return (
              <Card key={grant.id} className="border-border/60 bg-card/60 shadow-xs">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPendingDecision ? (
                        <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-semibold">
                          <Clock className="size-3" />
                          Awaiting Your Sovereign Consent
                        </Badge>
                      ) : patientConsentStatus === 'APPROVED' && grant.status === 'APPROVED' ? (
                        <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold">
                          <CheckCircle2 className="size-3" />
                          Consent Granted (Active)
                        </Badge>
                      ) : patientConsentStatus === 'APPROVED' && grant.status === 'PENDING' ? (
                        <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs font-semibold">
                          <Clock className="size-3" />
                          Consent Granted (Awaiting Hospital Key 2)
                        </Badge>
                      ) : patientConsentStatus === 'BYPASSED_BREAK_GLASS' ? (
                        <Badge variant="destructive" className="gap-1 text-[11px] font-semibold">
                          <AlertTriangle className="size-3" />
                          Emergency Break-Glass Override
                        </Badge>
                      ) : grant.status === 'REVOKED' ? (
                        <Badge variant="outline" className="gap-1 bg-muted text-muted-foreground border-border text-xs">
                          <Ban className="size-3" />
                          Revoked by You
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs">
                          <XCircle className="size-3" />
                          Declined
                        </Badge>
                      )}

                      <span className="text-xs text-muted-foreground font-mono">
                        Received {createdDate}
                      </span>
                    </div>

                    {/* Patient Consent Action Controls */}
                    <div className="flex items-center gap-2">
                      {isPendingDecision && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => consentMutation.mutate({ grantId: grant.id, status: 'APPROVED' })}
                            disabled={consentMutation.isPending}
                            className="text-xs cursor-pointer gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span>Grant Consent</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => consentMutation.mutate({ grantId: grant.id, status: 'REJECTED' })}
                            disabled={consentMutation.isPending}
                            className="text-xs cursor-pointer text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                          >
                            <XCircle className="size-3.5" />
                            <span>Decline</span>
                          </Button>
                        </>
                      )}

                      {patientConsentStatus === 'APPROVED' && grant.status !== 'REVOKED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeMutation.mutate(grant.id)}
                          disabled={revokeMutation.isPending}
                          className="text-xs cursor-pointer text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                        >
                          Revoke Consent
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Dual-Key Governance Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-muted/20 border border-border/40 rounded-md p-2.5">
                    <div className="flex items-center justify-between gap-2 pr-2 border-r border-border/40">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Key className="size-3.5 text-primary" />
                        <span className="font-medium">Your Decision (Key 1):</span>
                      </div>
                      <span className={`font-semibold ${
                        patientConsentStatus === 'APPROVED' ? 'text-emerald-600 dark:text-emerald-400' :
                        patientConsentStatus === 'BYPASSED_BREAK_GLASS' ? 'text-amber-600 dark:text-amber-400' :
                        patientConsentStatus === 'REJECTED' ? 'text-destructive' : 'text-amber-500'
                      }`}>
                        {patientConsentStatus === 'APPROVED' ? 'Granted ✓' :
                         patientConsentStatus === 'BYPASSED_BREAK_GLASS' ? 'Emergency Bypass ⚠️' :
                         patientConsentStatus === 'REJECTED' ? 'Refused ✗' : 'Action Needed'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pl-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="size-3.5 text-primary" />
                        <span className="font-medium">Custodian Hospital (Key 2):</span>
                      </div>
                      <span className={`font-semibold ${
                        hospitalClearanceStatus === 'APPROVED' ? 'text-emerald-600 dark:text-emerald-400' :
                        hospitalClearanceStatus === 'REJECTED' ? 'text-destructive' : 'text-amber-500'
                      }`}>
                        {hospitalClearanceStatus === 'APPROVED' ? 'Authorized ✓' :
                         hospitalClearanceStatus === 'REJECTED' ? 'Denied ✗' : 'Pending Hospital'}
                      </span>
                    </div>
                  </div>

                  {/* Requesting Clinician & Hospital */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="flex items-start gap-2 text-foreground">
                      <Stethoscope className="size-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">{grant.requestingDoctorName || 'Attending Physician'}</p>
                        <p className="text-muted-foreground">{grant.requestingHospitalName}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-foreground">
                      <Building2 className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">{grant.targetHospitalName}</p>
                        <p className="text-muted-foreground">Custodial Records Being Requested</p>
                      </div>
                    </div>
                  </div>

                  {/* Stated Purpose */}
                  <div className="text-xs p-3 rounded-md bg-muted/30 border border-border/40 text-foreground">
                    <span className="font-semibold text-muted-foreground">Doctor's Clinical Justification: </span>
                    {grant.purpose}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {filteredGrants.length > 0 && (
          <PaginationControl
            currentPage={page}
            totalPages={Math.ceil(filteredGrants.length / pageSize)}
            totalItems={filteredGrants.length}
            pageSize={pageSize}
            onPageChange={setPage}
            itemLabel="consent requests"
          />
        )}
      </div>
    </div>
  );
};
