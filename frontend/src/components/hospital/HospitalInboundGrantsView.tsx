import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { GrantItem } from '@/types/grant';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Inbox, 
  Clock, 
  CheckCircle2, 
  Ban, 
  Building2, 
  User, 
  Loader2, 
  ShieldAlert,
  XCircle,
  Hourglass,
  ShieldCheck,
  Key,
  AlertTriangle,
  Lock
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { PaginationControl } from '@/components/ui/pagination-control';
import { toast } from 'sonner';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'EXPIRED' | 'REVOKED';

export const HospitalInboundGrantsView: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<StatusFilter>('ALL');
  const [selectedGrantForRevocation, setSelectedGrantForRevocation] = useState<GrantItem | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [selectedGrantForDispute, setSelectedGrantForDispute] = useState<GrantItem | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeAlsoRevoke, setDisputeAlsoRevoke] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, refetch } = useQuery<{ grants: GrantItem[]; count: number }>({
    queryKey: ['hospitalGrants'],
    queryFn: async () => {
      const res = await api.get<{ grants: GrantItem[]; count: number }>('/grants');
      return res.data;
    },
  });

  // Clearance approval mutation
  const clearanceMutation = useMutation({
    mutationFn: async ({ grantId, status }: { grantId: string; status: 'APPROVED' | 'REJECTED' }) => {
      await api.patch(`/grants/${grantId}/hospital-clearance`, { status });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === 'APPROVED' ? 'Custodial disclosure clearance granted' : 'Disclosure clearance denied'
      );
      queryClient.invalidateQueries({ queryKey: ['hospitalGrants'] });
    },
    onError: (err: any) => {
      toast.error('Failed to update clearance', {
        description: err.response?.data?.message || 'Server error',
      });
    },
  });

  // Priority Revocation mutation (Instant Custodial Kill-Switch)
  const revokeMutation = useMutation({
    mutationFn: async ({ grantId, reason }: { grantId: string; reason: string }) => {
      await api.post(`/grants/${grantId}/revoke`, { reason });
    },
    onSuccess: () => {
      toast.error('Custodial Disclosure Terminated', {
        description: 'Vault records re-locked. External doctor access severed immediately.',
      });
      setSelectedGrantForRevocation(null);
      setRevocationReason('');
      queryClient.invalidateQueries({ queryKey: ['hospitalGrants'] });
    },
    onError: (err: any) => {
      toast.error('Failed to revoke disclosure', {
        description: err.response?.data?.message || 'Server error',
      });
    },
  });

  // Dispute / Host Hospital Escalation mutation
  const flagDisputeMutation = useMutation({
    mutationFn: async ({
      grantId,
      reason,
      alsoRevoke,
    }: {
      grantId: string;
      reason: string;
      alsoRevoke?: boolean;
    }) => {
      await api.post(`/grants/${grantId}/flag-dispute`, {
        reason,
        alsoRevoke,
      });
    },
    onSuccess: (_, variables) => {
      if (variables.alsoRevoke) {
        toast.error('Incident Flagged & Disclosure Terminated', {
          description: 'Host hospital notified and records quarantined in your custodial vault.',
        });
      } else {
        toast.warning('Incident Escalated to Host Facility', {
          description: 'Host hospital admin has been notified to audit the requesting physician credentials.',
        });
      }
      setSelectedGrantForDispute(null);
      setDisputeReason('');
      setDisputeAlsoRevoke(true);
      queryClient.invalidateQueries({ queryKey: ['hospitalGrants'] });
    },
    onError: (err: any) => {
      toast.error('Failed to flag incident', {
        description: err.response?.data?.message || 'Server error',
      });
    },
  });

  const now = new Date();

  // Inbound: External hospitals requesting our custodial records
  const inboundGrants = (data?.grants || []).filter((g) => {
    const currentHospitalId = user?.hospitalId || user?.id;
    return g.targetHospitalId === currentHospitalId;
  });

  // Calculate status counts
  const pendingCount = inboundGrants.filter((g) => g.status === 'PENDING').length;
  const approvedCount = inboundGrants.filter(
    (g) => g.status === 'APPROVED' && (!g.expiresAt || new Date(g.expiresAt) > now)
  ).length;
  const expiredCount = inboundGrants.filter(
    (g) => g.status === 'APPROVED' && g.expiresAt && new Date(g.expiresAt) <= now
  ).length;
  const revokedCount = inboundGrants.filter(
    (g) => g.status === 'REVOKED' || g.status === 'REJECTED'
  ).length;

  const filteredGrants = inboundGrants.filter((g) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'PENDING') return g.status === 'PENDING';
    if (selectedFilter === 'APPROVED') {
      return g.status === 'APPROVED' && (!g.expiresAt || new Date(g.expiresAt) > now);
    }
    if (selectedFilter === 'EXPIRED') {
      return g.status === 'APPROVED' && g.expiresAt && new Date(g.expiresAt) <= now;
    }
    if (selectedFilter === 'REVOKED') {
      return g.status === 'REVOKED' || g.status === 'REJECTED';
    }
    return true;
  });

  const handleFilterChange = (filter: StatusFilter) => {
    setSelectedFilter(filter);
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Inbox className="size-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Inbound Record Disclosures</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Audit external hospital requests attempting to access longitudinal records held in your custodial vault.
        </p>
      </div>

      {/* 2. Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => handleFilterChange('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
            selectedFilter === 'ALL'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
          }`}
        >
          All ({inboundGrants.length})
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange('PENDING')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1.5 ${
            selectedFilter === 'PENDING'
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
          }`}
        >
          <Clock className="size-3" />
          <span>Pending Clearance ({pendingCount})</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange('APPROVED')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1.5 ${
            selectedFilter === 'APPROVED'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
          }`}
        >
          <CheckCircle2 className="size-3" />
          <span>Active Disclosures ({approvedCount})</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange('EXPIRED')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1.5 ${
            selectedFilter === 'EXPIRED'
              ? 'bg-muted text-foreground border-border font-semibold'
              : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
          }`}
        >
          <Hourglass className="size-3" />
          <span>Expired ({expiredCount})</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange('REVOKED')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1.5 ${
            selectedFilter === 'REVOKED'
              ? 'bg-rose-600 text-white border-rose-600'
              : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
          }`}
        >
          <Ban className="size-3" />
          <span>Revoked ({revokedCount})</span>
        </button>
      </div>

      {/* 3. Inbound Disclosures List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-foreground" />
            <p className="text-sm">Loading custodial disclosures...</p>
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2">
            <p className="text-sm text-destructive font-semibold">Failed to load disclosures</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filteredGrants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-2">
            <ShieldCheck className="size-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No inbound disclosures found</p>
            <p className="text-xs text-muted-foreground">
              {selectedFilter === 'ALL'
                ? 'No external hospitals have requested access to records in your custodial vault.'
                : `No inbound disclosures with status "${selectedFilter.toLowerCase()}".`}
            </p>
          </div>
        ) : (
          filteredGrants.slice((page - 1) * pageSize, page * pageSize).map((grant) => {
            const createdDate = new Date(grant.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            const isRevoked = grant.status === 'REVOKED' || !!grant.revokedAt;
            const isExpired = grant.status === 'APPROVED' && grant.expiresAt && new Date(grant.expiresAt) <= now;
            const isActive = grant.status === 'APPROVED' && !isRevoked && !isExpired;
            const patientConsentStatus = grant.patientConsent?.status || 'PENDING';
            const hospitalClearanceStatus = grant.hospitalClearance?.status || 'PENDING';
            const isFlaggedForReview = grant.hospitalClearance?.flaggedForHostReview;

            return (
              <Card key={grant.id} className="border-border/60 bg-card/60 shadow-xs">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {grant.status === 'PENDING' && (
                        <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-semibold">
                          <Clock className="size-3" />
                          Pending Institutional Dual-Key
                        </Badge>
                      )}
                      {isActive && (
                        <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold">
                          <CheckCircle2 className="size-3" />
                          Active Disclosure Authorized
                        </Badge>
                      )}
                      {isExpired && (
                        <Badge variant="outline" className="gap-1 bg-muted text-muted-foreground border-border text-xs">
                          <Hourglass className="size-3" />
                          Disclosure Expired
                        </Badge>
                      )}
                      {grant.status === 'REJECTED' && (
                        <Badge variant="outline" className="gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs">
                          <XCircle className="size-3" />
                          Declined
                        </Badge>
                      )}
                      {isRevoked && (
                        <Badge variant="outline" className="gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/40 text-xs font-semibold">
                          <Lock className="size-3" />
                          Custodial Disclosure Revoked (Vault Locked)
                        </Badge>
                      )}

                      {/* Emergency Break-Glass Indicator */}
                      {grant.isBreakGlass && (
                        <Badge variant="destructive" className="gap-1 text-[11px] font-semibold">
                          <AlertTriangle className="size-3" />
                          Emergency Break-Glass Override
                        </Badge>
                      )}

                      {/* Patient Disputed Notice Badge */}
                      {grant.patientConsent?.isDisputed && (
                        <Badge variant="destructive" className="gap-1 text-[11px] font-bold animate-pulse">
                          🚨 Disputed by Patient
                        </Badge>
                      )}

                      <span className="text-xs text-muted-foreground font-mono">
                        Requested on {createdDate}
                      </span>
                    </div>

                    {/* Custodial Action Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {hospitalClearanceStatus === 'PENDING' && grant.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => clearanceMutation.mutate({ grantId: grant.id, status: 'APPROVED' })}
                            disabled={clearanceMutation.isPending}
                            className="text-xs cursor-pointer gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span>Authorize Clearance</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => clearanceMutation.mutate({ grantId: grant.id, status: 'REJECTED' })}
                            disabled={clearanceMutation.isPending}
                            className="text-xs cursor-pointer text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                          >
                            <XCircle className="size-3.5" />
                            <span>Deny</span>
                          </Button>
                        </>
                      )}

                      {/* Priority Revocation / Instant Kill-Switch */}
                      {isActive && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedGrantForRevocation(grant);
                            setRevocationReason(
                              grant.isBreakGlass
                                ? 'Custodial compliance quarantine: unverified emergency override rejected.'
                                : 'Institutional clearance revoked by custodial medical center.'
                            );
                          }}
                          className="text-xs cursor-pointer gap-1.5 font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                        >
                          <ShieldAlert className="size-3.5" />
                          <span>🚨 Priority Revoke Disclosure</span>
                        </Button>
                      )}

                      {/* Break-Glass Peer Review Flag */}
                      {grant.isBreakGlass && !isFlaggedForReview && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedGrantForDispute(grant);
                            setDisputeReason('Custodial compliance review: emergency break-glass flagged for host facility staff investigation.');
                          }}
                          disabled={flagDisputeMutation.isPending}
                          className="text-xs cursor-pointer text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10 gap-1.5"
                        >
                          <AlertTriangle className="size-3.5" />
                          <span>Flag for Host Peer Review</span>
                        </Button>
                      )}

                      {isFlaggedForReview && (
                        <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                          🚨 Host Facility Review Active
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Dual-Key Status Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-muted/20 border border-border/40 rounded-md p-2.5">
                    <div className="flex items-center justify-between gap-2 pr-2 border-r border-border/40">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Key className="size-3.5 text-primary" />
                        <span className="font-medium">Patient Sovereign Consent:</span>
                      </div>
                      <span className={`font-semibold ${
                        patientConsentStatus === 'APPROVED' ? 'text-emerald-600 dark:text-emerald-400' :
                        patientConsentStatus === 'BYPASSED_BREAK_GLASS' ? 'text-amber-600 dark:text-amber-400' :
                        patientConsentStatus === 'REJECTED' ? 'text-destructive' : 'text-amber-500'
                      }`}>
                        {patientConsentStatus === 'APPROVED' ? 'Patient Consented ✓' :
                         patientConsentStatus === 'BYPASSED_BREAK_GLASS' ? 'Emergency Bypassed ⚠️' :
                         patientConsentStatus === 'REJECTED' ? 'Patient Refused ✗' : 'Awaiting Patient'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pl-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="size-3.5 text-primary" />
                        <span className="font-medium">Our Custodial Clearance:</span>
                      </div>
                      <span className={`font-semibold ${
                        hospitalClearanceStatus === 'APPROVED' ? 'text-emerald-600 dark:text-emerald-400' :
                        hospitalClearanceStatus === 'REJECTED' ? 'text-destructive' : 'text-amber-500'
                      }`}>
                        {hospitalClearanceStatus === 'APPROVED' ? 'Cleared by Custodian ✓' :
                         hospitalClearanceStatus === 'REJECTED' ? 'Denied by Custodian ✗' : 'Pending Our Action'}
                      </span>
                    </div>
                  </div>

                  {/* Requester Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="flex items-start gap-2 text-foreground">
                      <Building2 className="size-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">{grant.requestingHospitalName || 'External Medical Facility'}</p>
                        <p className="text-muted-foreground">External Custodian Requester</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-foreground">
                      <ShieldAlert className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">{grant.requestingDoctorName || 'External Physician'}</p>
                        <p className="text-muted-foreground">External Requesting Clinician</p>
                      </div>
                    </div>
                  </div>

                  {/* Patient Subject */}
                  <div className="flex items-center gap-1.5 text-xs text-foreground bg-muted/20 p-2 rounded-md">
                    <User className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Protected Patient Record:</span>
                    <span className="font-semibold">{grant.patientName}</span>
                    <span className="text-muted-foreground">({grant.patientEmail})</span>
                  </div>

                  {/* Patient Dispute Notice */}
                  {grant.patientConsent?.isDisputed && (
                    <div className="text-xs p-2.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 flex items-start gap-2">
                      <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Patient Sovereign Dispute Filed: </span>
                        <span>{grant.patientConsent.disputeReason}</span>
                        {grant.patientConsent.disputedAt && (
                          <span className="text-muted-foreground ml-2 font-mono">
                            ({new Date(grant.patientConsent.disputedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Review Notes if Present */}
                  {grant.hospitalClearance?.hostReviewNotes && (
                    <div className="text-xs p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200">
                      <span className="font-semibold">Institutional Review Audit: </span>
                      <span>{grant.hospitalClearance.hostReviewNotes}</span>
                    </div>
                  )}

                  {/* Stated Purpose */}
                  <div className="text-xs p-3 rounded-md bg-muted/30 border border-border/40 text-foreground">
                    <span className="font-semibold text-muted-foreground">Stated Purpose for Access: </span>
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
            itemLabel="disclosures"
          />
        )}
      </div>

      {/* Custodial Priority Revocation Modal */}
      {selectedGrantForRevocation && (
        <Dialog
          open={Boolean(selectedGrantForRevocation)}
          onOpenChange={(open) => !open && setSelectedGrantForRevocation(null)}
        >
          <DialogContent className="w-full sm:max-w-md p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!selectedGrantForRevocation) return;
                revokeMutation.mutate({
                  grantId: selectedGrantForRevocation.id,
                  reason: revocationReason.trim() || 'Custodial compliance quarantine.',
                });
              }}
              className="space-y-4"
            >
              <DialogHeader>
                <div className="flex items-center gap-2 text-rose-600">
                  <ShieldAlert className="size-5" />
                  <DialogTitle className="text-lg font-bold">
                    🚨 Immediate Custodial Revocation
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  As the custodial data trustee for {selectedGrantForRevocation.targetHospitalName}, terminating this disclosure immediately closes vault access to external physician {selectedGrantForRevocation.requestingDoctorName || 'attending doctor'}.
                </DialogDescription>
              </DialogHeader>

              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Lock className="size-3.5" />
                  <span>Vault Quarantine Enforcement:</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  Longitudinal records held in your node will be immediately re-locked. Any active semantic retrieval sessions will drop these records from the doctor's query context.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Custodial Revocation Reason *
                </label>
                <Textarea
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                  required
                />
              </div>

              <DialogFooter className="pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedGrantForRevocation(null)}
                  disabled={revokeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  disabled={revokeMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  {revokeMutation.isPending ? 'Terminating Disclosure...' : 'Terminate Disclosure & Lock Vault'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Custodial Flag for Peer Review Modal */}
      {selectedGrantForDispute && (
        <Dialog
          open={Boolean(selectedGrantForDispute)}
          onOpenChange={(open) => !open && setSelectedGrantForDispute(null)}
        >
          <DialogContent className="w-full sm:max-w-md p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!selectedGrantForDispute) return;
                flagDisputeMutation.mutate({
                  grantId: selectedGrantForDispute.id,
                  reason: disputeReason.trim() || 'Custodial compliance officer flagged emergency override.',
                  alsoRevoke: disputeAlsoRevoke,
                });
              }}
              className="space-y-4"
            >
              <DialogHeader>
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="size-5" />
                  <DialogTitle className="text-lg font-bold">
                    Flag for Host Facility Peer Review
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Formally notify {selectedGrantForDispute.requestingHospitalName} administration to audit attending clinician {selectedGrantForDispute.requestingDoctorName || 'doctor'} for potential emergency override abuse.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Compliance Audit Notes *
                </label>
                <Textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                  required
                />
              </div>

              {/* Simultaneous Custodial Revocation Option */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10">
                <input
                  type="checkbox"
                  id="custodialDisputeAlsoRevoke"
                  checked={disputeAlsoRevoke}
                  onChange={(e) => setDisputeAlsoRevoke(e.target.checked)}
                  className="mt-0.5 size-4 rounded accent-destructive cursor-pointer"
                />
                <label htmlFor="custodialDisputeAlsoRevoke" className="text-xs text-foreground font-medium cursor-pointer space-y-0.5">
                  <div className="font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                    <Lock className="size-3" />
                    <span>Priority Revocation: Quarantine vault records immediately</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Instantly severs external clinician access and locks custodial records held in your node.
                  </p>
                </label>
              </div>

              <DialogFooter className="pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedGrantForDispute(null)}
                  disabled={flagDisputeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  disabled={flagDisputeMutation.isPending}
                >
                  {flagDisputeMutation.isPending
                    ? 'Submitting...'
                    : disputeAlsoRevoke
                    ? 'Flag & Quarantine Vault Immediately'
                    : 'Dispatch Host Review Notice'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
