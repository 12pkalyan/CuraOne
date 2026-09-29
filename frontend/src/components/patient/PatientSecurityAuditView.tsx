import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { GrantItem } from '@/types/grant';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Building2, 
  Stethoscope, 
  Loader2, 
  CheckCircle2, 
  FileWarning,
  Ban,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { PaginationControl } from '@/components/ui/pagination-control';

export const PatientSecurityAuditView: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedGrantForDispute, setSelectedGrantForDispute] = useState<GrantItem | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeAlsoRevoke, setDisputeAlsoRevoke] = useState(true);
  const [selectedGrantForRevocation, setSelectedGrantForRevocation] = useState<GrantItem | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, refetch } = useQuery<{ grants: GrantItem[]; count: number }>({
    queryKey: ['patientGrants'],
    queryFn: async () => {
      const res = await api.get<{ grants: GrantItem[]; count: number }>('/grants');
      return res.data;
    },
  });

  const disputeMutation = useMutation({
    mutationFn: async ({
      grantId,
      reason,
      alsoRevoke,
    }: {
      grantId: string;
      reason: string;
      alsoRevoke?: boolean;
    }) => {
      await api.post(`/grants/${grantId}/flag-dispute`, { reason, alsoRevoke });
    },
    onSuccess: (_, variables) => {
      if (variables.alsoRevoke) {
        toast.error('Dispute Filed & Access Terminated', {
          description: "Doctor access severed immediately and host hospital administration notified for disciplinary review.",
        });
      } else {
        toast.warning('Dispute Filed Successfully', {
          description: "The doctor's employing hospital administration has been notified for disciplinary peer review.",
        });
      }
      setSelectedGrantForDispute(null);
      setDisputeReason('');
      setDisputeAlsoRevoke(true);
      queryClient.invalidateQueries({ queryKey: ['patientGrants'] });
    },
    onError: (err: any) => {
      toast.error('Failed to submit dispute', {
        description: err.response?.data?.message || 'Server error',
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ grantId, reason }: { grantId: string; reason: string }) => {
      await api.post(`/grants/${grantId}/revoke`, { reason });
    },
    onSuccess: () => {
      toast.error('Emergency Access Terminated', {
        description: 'Doctor access has been severed immediately. Records are now re-locked.',
      });
      setSelectedGrantForRevocation(null);
      setRevocationReason('');
      queryClient.invalidateQueries({ queryKey: ['patientGrants'] });
    },
    onError: (err: any) => {
      toast.error('Failed to revoke access', {
        description: err.response?.data?.message || 'Server error',
      });
    },
  });

  const allGrants = data?.grants || [];
  // Filter for break-glass events or grants flagged as disputed or revoked
  const breakGlassEvents = allGrants.filter(
    (g) => g.isBreakGlass || g.patientConsent?.isDisputed || g.status === 'REVOKED'
  );

  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim() || !selectedGrantForDispute) {
      toast.error('Please provide a reason for disputing this access');
      return;
    }
    disputeMutation.mutate({
      grantId: selectedGrantForDispute.id,
      reason: disputeReason.trim(),
      alsoRevoke: disputeAlsoRevoke,
    });
  };

  const handleRevocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrantForRevocation) return;
    revokeMutation.mutate({
      grantId: selectedGrantForRevocation.id,
      reason: revocationReason.trim() || 'Revoked by patient: emergency conditions not verified.',
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Security & Access Audit</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Audit emergency Break-Glass access events and hold healthcare providers accountable. If an emergency override occurred when you were not in an acute emergency, you can file an immediate disciplinary review flag.
        </p>
      </div>

      {/* Audit List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-foreground" />
            <p className="text-sm">Loading security audit records...</p>
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2">
            <p className="text-sm text-destructive font-semibold">Failed to load audit events</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : breakGlassEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-2">
            <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No Emergency Overrides on Record</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Your medical history has not been accessed via Break-Glass emergency bypass. All record accesses have required your sovereign consent.
            </p>
          </div>
        ) : (
          breakGlassEvents.slice((page - 1) * pageSize, page * pageSize).map((grant) => {
            const dateStr = new Date(grant.createdAt).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            const now = new Date();
            const isDisputed = grant.patientConsent?.isDisputed;
            const isRevoked = grant.status === 'REVOKED' || !!grant.revokedAt;
            const isExpired = grant.status === 'APPROVED' && !!grant.expiresAt && new Date(grant.expiresAt) <= now;
            const isActive = grant.status === 'APPROVED' && !isRevoked && !isExpired;

            return (
              <Card key={grant.id} className="border-border/60 bg-card/60 shadow-xs">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="destructive" className="gap-1 text-xs font-semibold">
                        <AlertTriangle className="size-3" />
                        Emergency Break-Glass Override
                      </Badge>

                      {isRevoked ? (
                        <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/40 font-semibold gap-1">
                          <Lock className="size-3" />
                          <span>Access Severed & Re-Locked</span>
                        </Badge>
                      ) : isDisputed ? (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/40 font-semibold">
                          🚨 Dispute Filed (Under Peer Review)
                        </Badge>
                      ) : isExpired ? (
                        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
                          Expired (24h Window Closed)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                          Verified Audit Event
                        </Badge>
                      )}

                      <span className="text-xs text-muted-foreground font-mono">{dateStr}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {isActive && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedGrantForRevocation(grant);
                            setRevocationReason('Patient not in acute medical distress - emergency access unauthorized.');
                          }}
                          className="text-xs cursor-pointer gap-1.5 font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                        >
                          <ShieldAlert className="size-3.5" />
                          <span>🚨 Priority Revoke</span>
                        </Button>
                      )}

                      {!isDisputed && !isRevoked && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedGrantForDispute(grant)}
                          className="text-xs cursor-pointer text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10 gap-1.5"
                        >
                          <FileWarning className="size-3.5" />
                          <span>Flag Suspicious Access</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Provider Details */}
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
                        <p className="text-muted-foreground">Target Custodial Records Accessed</p>
                      </div>
                    </div>
                  </div>

                  {/* Physician Legal Attestation */}
                  <div className="text-xs p-3 rounded-md bg-destructive/5 border border-destructive/20 text-foreground space-y-1">
                    <p className="font-semibold text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5" />
                      <span>Physician Emergency Attestation:</span>
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      {grant.breakGlassAttestation || 'Attested emergency care needed for incapacitated patient.'}
                    </p>
                  </div>

                  {/* Revoked Details */}
                  {isRevoked && (
                    <div className="text-xs p-2.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                      <Ban className="size-4 shrink-0" />
                      <div>
                        <span className="font-semibold">Access Severed (Records Locked): </span>
                        <span>{grant.patientConsent?.disputeReason || 'Priority Revocation executed by patient.'}</span>
                        {grant.revokedAt && (
                          <span className="text-muted-foreground ml-2 font-mono">
                            ({new Date(grant.revokedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dispute Details if reported without revocation */}
                  {!isRevoked && isDisputed && (
                    <div className="text-xs p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
                      <span className="font-semibold">Your Dispute Reason: </span>
                      {grant.patientConsent?.disputeReason}
                    </div>
                  )}

                  {/* Custodial Facility Quarantine Notice */}
                  {grant.hospitalClearance?.flaggedForHostReview && (
                    <div className="text-xs p-2.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 flex items-center gap-2">
                      <ShieldAlert className="size-4 shrink-0 text-rose-600" />
                      <div>
                        <span className="font-semibold">Custodial Hospital Quarantine Flag: </span>
                        <span>{grant.hospitalClearance.hostReviewNotes}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}

        {breakGlassEvents.length > 0 && (
          <PaginationControl
            currentPage={page}
            totalPages={Math.ceil(breakGlassEvents.length / pageSize)}
            totalItems={breakGlassEvents.length}
            pageSize={pageSize}
            onPageChange={setPage}
            itemLabel="audit events"
          />
        )}
      </div>

      {/* Priority Revocation Modal */}
      {selectedGrantForRevocation && (
        <Dialog
          open={Boolean(selectedGrantForRevocation)}
          onOpenChange={(open) => !open && setSelectedGrantForRevocation(null)}
        >
          <DialogContent className="w-full sm:max-w-md p-6">
            <form onSubmit={handleRevocationSubmit} className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 text-rose-600">
                  <ShieldAlert className="size-5" />
                  <DialogTitle className="text-lg font-bold">
                    🚨 Immediate Priority Revocation
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Exercise sovereign veto: Immediately terminate external physician emergency access and re-lock your medical records held by {selectedGrantForRevocation.targetHospitalName}.
                </DialogDescription>
              </DialogHeader>

              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Lock className="size-3.5" />
                  <span>Immediate Technical Impact:</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  Doctor access will be severed in real time. Decrypted longitudinal charts and AI clinical retrieval will be blocked immediately.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Revocation Justification / Notes *
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
                  {revokeMutation.isPending ? 'Terminating Access...' : 'Sever Access & Lock Records'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Dispute Modal */}
      {selectedGrantForDispute && (
        <Dialog open={Boolean(selectedGrantForDispute)} onOpenChange={(open) => !open && setSelectedGrantForDispute(null)}>
          <DialogContent className="w-full sm:max-w-md p-6">
            <form onSubmit={handleDisputeSubmit} className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="size-5" />
                  <DialogTitle className="text-lg font-bold">
                    Dispute Emergency Access
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Filing a dispute alerts the doctor's employing hospital administration and compliance officers to review the physician's conduct.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Why was this emergency access improper? *
                </label>
                <Textarea
                  placeholder="e.g., I was conscious and capable of giving consent, or I did not visit this hospital on this date..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                  required
                />
              </div>

              {/* Simultaneous Priority Revocation Option */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10">
                <input
                  type="checkbox"
                  id="disputeAlsoRevoke"
                  checked={disputeAlsoRevoke}
                  onChange={(e) => setDisputeAlsoRevoke(e.target.checked)}
                  className="mt-0.5 size-4 rounded accent-destructive cursor-pointer"
                />
                <label htmlFor="disputeAlsoRevoke" className="text-xs text-foreground font-medium cursor-pointer space-y-0.5">
                  <div className="font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                    <Lock className="size-3" />
                    <span>Priority Revocation: Sever doctor access immediately</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Instantly terminates active access so the doctor cannot view your records for the remaining duration.
                  </p>
                </label>
              </div>

              <DialogFooter className="pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedGrantForDispute(null)}
                  disabled={disputeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  disabled={disputeMutation.isPending}
                >
                  {disputeMutation.isPending
                    ? 'Submitting...'
                    : disputeAlsoRevoke
                    ? 'Dispute & Sever Access Immediately'
                    : 'Submit Incident Report'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
