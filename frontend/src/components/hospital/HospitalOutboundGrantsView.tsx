import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { GrantItem } from '@/types/grant';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  Ban, 
  Building2, 
  User, 
  Loader2, 
  Stethoscope, 
  XCircle, 
  Hourglass, 
  ShieldCheck, 
  AlertTriangle, 
  Key,
  ShieldAlert,
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

type StatusFilter = 'ALL' | 'FLAGGED' | 'PENDING' | 'APPROVED' | 'EXPIRED' | 'REVOKED';

export const HospitalOutboundGrantsView: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<StatusFilter>('ALL');
  const [selectedGrantForRevocation, setSelectedGrantForRevocation] = useState<GrantItem | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, refetch } = useQuery<{ grants: GrantItem[]; count: number }>({
    queryKey: ['hospitalGrants'],
    queryFn: async () => {
      const res = await api.get<{ grants: GrantItem[]; count: number }>('/grants');
      return res.data;
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ grantId, reason }: { grantId: string; reason: string }) => {
      await api.post(`/grants/${grantId}/revoke`, { reason });
    },
    onSuccess: () => {
      toast.error('Doctor Access Revoked by Host Facility', {
        description: 'Administrative revocation executed. External doctor access severed and records locked.',
      });
      setSelectedGrantForRevocation(null);
      setRevocationReason('');
      queryClient.invalidateQueries({ queryKey: ['hospitalGrants'] });
    },
    onError: (err: any) => {
      toast.error('Failed to revoke access', {
        description: err.response?.data?.message || 'Server error',
      });
    },
  });

  const now = new Date();

  // Outbound: Requests initiated by our hospital's doctors
  const outboundGrants = (data?.grants || []).filter((g) => {
    const currentHospitalId = user?.hospitalId || user?.id;
    return g.requestingHospitalId === currentHospitalId;
  });

  // Calculate status counts
  const flaggedGrants = outboundGrants.filter(
    (g) => g.patientConsent?.isDisputed || g.hospitalClearance?.flaggedForHostReview
  );
  const flaggedCount = flaggedGrants.length;
  const pendingCount = outboundGrants.filter((g) => g.status === 'PENDING').length;
  const approvedCount = outboundGrants.filter(
    (g) => g.status === 'APPROVED' && (!g.expiresAt || new Date(g.expiresAt) > now)
  ).length;
  const expiredCount = outboundGrants.filter(
    (g) => g.status === 'APPROVED' && g.expiresAt && new Date(g.expiresAt) <= now
  ).length;
  const revokedCount = outboundGrants.filter(
    (g) => g.status === 'REVOKED' || g.status === 'REJECTED'
  ).length;

  const filteredGrants = outboundGrants.filter((g) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'FLAGGED') {
      return g.patientConsent?.isDisputed || g.hospitalClearance?.flaggedForHostReview;
    }
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
          <Send className="size-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Outbound Doctor Requests</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Monitor cross-hospital data requests submitted by attending medical staff affiliated with your institution.
        </p>
      </div>

      {/* Disciplinary Alert Banner for Host Hospital Admin */}
      {flaggedCount > 0 && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-destructive/20 flex items-center justify-center text-destructive shrink-0 mt-0.5">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-destructive flex items-center gap-1.5">
                <span>🚨 Attending Medical Staff Review Alert</span>
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold">
                  {flaggedCount} Flagged
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
                Emergency Break-Glass or custodial requests by your hospital's doctors have been flagged as improper by the patient or custodial facility. Conduct clinical peer review and revoke external access if required.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleFilterChange('FLAGGED')}
            className="text-xs font-semibold shrink-0 cursor-pointer"
          >
            Filter Flagged Staff Requests
          </Button>
        </div>
      )}

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
          All ({outboundGrants.length})
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange('FLAGGED')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1.5 ${
            selectedFilter === 'FLAGGED'
              ? 'bg-rose-600 text-white border-rose-600 font-bold'
              : flaggedCount > 0
              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/40 font-semibold hover:bg-rose-500/20'
              : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
          }`}
        >
          <AlertTriangle className="size-3" />
          <span>Staff Flagged ({flaggedCount})</span>
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
          <span>Active Grants ({approvedCount})</span>
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

      {/* 3. Outbound Requests List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-foreground" />
            <p className="text-sm">Loading staff requests...</p>
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2">
            <p className="text-sm text-destructive font-semibold">Failed to load requests</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filteredGrants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-2">
            <ShieldCheck className="size-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No outbound requests found</p>
            <p className="text-xs text-muted-foreground">
              {selectedFilter === 'ALL'
                ? 'Your hospital doctors have not requested external records yet.'
                : `No outbound requests with status "${selectedFilter.toLowerCase()}".`}
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
            const isDisputed = grant.patientConsent?.isDisputed;
            const isFlagged = isFlaggedForReview || isDisputed;

            return (
              <Card
                key={grant.id}
                className={
                  isFlagged
                    ? 'border-destructive/60 bg-destructive/5 shadow-xs'
                    : 'border-border/60 bg-card/60 shadow-xs'
                }
              >
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {grant.status === 'PENDING' && (
                        <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-semibold">
                          <Clock className="size-3" />
                          Pending Dual-Key Authorization
                        </Badge>
                      )}
                      {isActive && (
                        <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold">
                          <CheckCircle2 className="size-3" />
                          Approved & Active
                        </Badge>
                      )}
                      {isExpired && (
                        <Badge variant="outline" className="gap-1 bg-muted text-muted-foreground border-border text-xs">
                          <Hourglass className="size-3" />
                          Authorization Expired
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
                          Access Revoked / Locked
                        </Badge>
                      )}

                      {/* Emergency Break-Glass Indicator */}
                      {grant.isBreakGlass && (
                        <Badge variant="destructive" className="gap-1 text-[11px] font-semibold">
                          <AlertTriangle className="size-3" />
                          Break-Glass Emergency
                        </Badge>
                      )}

                      {/* Patient Disputed Indicator */}
                      {isDisputed && (
                        <Badge variant="destructive" className="gap-1 text-[11px] font-bold animate-pulse">
                          🚨 Patient Disputed
                        </Badge>
                      )}

                      {/* Host Peer Review Flag Alert */}
                      {isFlaggedForReview && (
                        <Badge variant="destructive" className="gap-1 text-[11px] font-bold animate-bounce">
                          🚨 Staff Peer Review Required
                        </Badge>
                      )}

                      <span className="text-xs text-muted-foreground font-mono">
                        Requested on {createdDate}
                      </span>
                    </div>

                    {/* Host Hospital Administrative Action */}
                    {isActive && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedGrantForRevocation(grant);
                            setRevocationReason('Host hospital administrative intervention: physician access terminated for compliance review.');
                          }}
                          className="text-xs font-semibold cursor-pointer gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
                        >
                          <Lock className="size-3.5" />
                          <span>Revoke Doctor Access</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Dual-Key Tracking Breakdown */}
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
                        {patientConsentStatus === 'APPROVED' ? 'Granted ✓' :
                         patientConsentStatus === 'BYPASSED_BREAK_GLASS' ? 'Emergency Bypassed ⚠️' :
                         patientConsentStatus === 'REJECTED' ? 'Refused ✗' : 'Awaiting Patient'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pl-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="size-3.5 text-primary" />
                        <span className="font-medium">Target Custodian Clearance:</span>
                      </div>
                      <span className={`font-semibold ${
                        hospitalClearanceStatus === 'APPROVED' ? 'text-emerald-600 dark:text-emerald-400' :
                        hospitalClearanceStatus === 'REJECTED' ? 'text-destructive' : 'text-amber-500'
                      }`}>
                        {hospitalClearanceStatus === 'APPROVED' ? 'Cleared ✓' :
                         hospitalClearanceStatus === 'REJECTED' ? 'Denied ✗' : 'Awaiting Custodian'}
                      </span>
                    </div>
                  </div>

                  {/* Doctor & Target Hospital */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="flex items-start gap-2 text-foreground">
                      <Stethoscope className="size-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">{grant.requestingDoctorName || 'Attending Physician'}</p>
                        <p className="text-muted-foreground">Requesting Staff Member</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-foreground">
                      <Building2 className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">{grant.targetHospitalName}</p>
                        <p className="text-muted-foreground">Target Custodian Hospital</p>
                      </div>
                    </div>
                  </div>

                  {/* Patient Subject */}
                  <div className="flex items-center gap-1.5 text-xs text-foreground bg-muted/20 p-2 rounded-md">
                    <User className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Patient Subject:</span>
                    <span className="font-semibold">{grant.patientName}</span>
                    <span className="text-muted-foreground">({grant.patientEmail})</span>
                  </div>

                  {/* Patient Dispute Notice */}
                  {isDisputed && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="size-3.5" />
                        <span>Patient Dispute Filed Against Your Staff:</span>
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        {grant.patientConsent?.disputeReason}
                        {grant.patientConsent?.disputedAt && (
                          <span className="text-muted-foreground ml-2 font-mono">
                            ({new Date(grant.patientConsent.disputedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })})
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Custodial Peer Review Notice */}
                  {isFlaggedForReview && (
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <ShieldAlert className="size-3.5" />
                        <span>Custodial Facility Review Notice:</span>
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        {grant.hospitalClearance?.hostReviewNotes || 'An incident dispute was filed against this cross-hospital access request. Conduct clinical peer review of attending physician.'}
                      </p>
                    </div>
                  )}

                  {/* Stated Purpose */}
                  <div className="text-xs p-3 rounded-md bg-muted/30 border border-border/40 text-foreground">
                    <span className="font-semibold text-muted-foreground">Clinical Justification: </span>
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
            itemLabel="requests"
          />
        )}
      </div>

      {/* Host Hospital Revocation Modal */}
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
                  reason: revocationReason.trim() || 'Host hospital administrative intervention.',
                });
              }}
              className="space-y-4"
            >
              <DialogHeader>
                <div className="flex items-center gap-2 text-rose-600">
                  <ShieldAlert className="size-5" />
                  <DialogTitle className="text-lg font-bold">
                    🚨 Revoke Staff Physician Access
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  As the employing institution for {selectedGrantForRevocation.requestingDoctorName || 'this clinician'}, terminate external access to records held by {selectedGrantForRevocation.targetHospitalName}.
                </DialogDescription>
              </DialogHeader>

              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Lock className="size-3.5" />
                  <span>Immediate Disciplinary Impact:</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  Doctor access will be immediately terminated in real time. The doctor's decrypted longitudinal timeline will re-lock.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Administrative Revocation Reason *
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
                  {revokeMutation.isPending ? 'Terminating Access...' : 'Revoke Doctor Access & Lock Records'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
