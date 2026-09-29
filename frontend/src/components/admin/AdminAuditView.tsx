import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { GrantItem } from '@/types/grant';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PaginationControl } from '@/components/ui/pagination-control';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  Building2, 
  User, 
  Stethoscope, 
  Loader2, 
  ShieldAlert, 
  AlertTriangle,
  Key,
  XCircle
} from 'lucide-react';

type AuditFilter = 'ALL' | 'BREAK_GLASS' | 'DISPUTED' | 'APPROVED';

export const AdminAuditView: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<AuditFilter>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, refetch } = useQuery<{ grants: GrantItem[]; count: number }>({
    queryKey: ['adminAuditGrants'],
    queryFn: async () => {
      const res = await api.get<{ grants: GrantItem[]; count: number }>('/grants');
      return res.data;
    },
  });

  const allGrants = data?.grants || [];

  const breakGlassCount = allGrants.filter((g) => g.isBreakGlass).length;
  const disputedCount = allGrants.filter((g) => g.patientConsent?.isDisputed).length;
  const approvedCount = allGrants.filter((g) => g.status === 'APPROVED').length;

  const filteredGrants = allGrants.filter((g) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'BREAK_GLASS') return g.isBreakGlass;
    if (selectedFilter === 'DISPUTED') return g.patientConsent?.isDisputed;
    if (selectedFilter === 'APPROVED') return g.status === 'APPROVED';
    return true;
  });

  const handleFilterChange = (filter: AuditFilter) => {
    setSelectedFilter(filter);
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <FileText className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cross-Hospital Audit Log</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Platform-wide audit trail of all cross-hospital record requests, Dual-Key authorizations, emergency Break-Glass events, and patient dispute flags.
        </p>
      </div>

      {/* 2. Filter Pills */}
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
          All Requests ({allGrants.length})
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange('BREAK_GLASS')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1.5 ${
            selectedFilter === 'BREAK_GLASS'
              ? 'bg-rose-600 text-white border-rose-600'
              : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
          }`}
        >
          <AlertTriangle className="size-3" />
          <span>Break-Glass Overrides ({breakGlassCount})</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange('DISPUTED')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1.5 ${
            selectedFilter === 'DISPUTED'
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
          }`}
        >
          <ShieldAlert className="size-3" />
          <span>Patient Disputes ({disputedCount})</span>
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
      </div>

      {/* 3. Audit Items List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-foreground" />
            <p className="text-sm font-medium">Loading network audit logs...</p>
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2">
            <p className="text-sm text-destructive font-semibold">Failed to load audit events</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filteredGrants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-2">
            <CheckCircle2 className="size-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No records matching filter</p>
            <p className="text-xs text-muted-foreground">
              All cross-hospital requests and disclosures appear here in chronological order.
            </p>
          </div>
        ) : (
          filteredGrants.slice((page - 1) * pageSize, page * pageSize).map((grant) => {
            const createdDate = new Date(grant.createdAt).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            const patientConsentStatus = grant.patientConsent?.status || 'PENDING';
            const hospitalClearanceStatus = grant.hospitalClearance?.status || 'PENDING';
            const isDisputed = grant.patientConsent?.isDisputed;

            return (
              <Card key={grant.id} className="border-border/60 bg-card/60 shadow-xs">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  {/* Top Bar: Master Status & Dual-Key Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {grant.status === 'PENDING' && (
                        <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                          <Clock className="size-3" />
                          Pending Dual-Key Clearance
                        </Badge>
                      )}
                      {grant.status === 'APPROVED' && (
                        <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold">
                          <CheckCircle2 className="size-3" />
                          Active Disclosure Authorized
                        </Badge>
                      )}
                      {grant.status === 'REJECTED' && (
                        <Badge variant="outline" className="gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs">
                          <XCircle className="size-3" />
                          Request Rejected
                        </Badge>
                      )}
                      {grant.status === 'REVOKED' && (
                        <Badge variant="outline" className="gap-1 bg-muted text-muted-foreground border-border text-xs">
                          Revoked
                        </Badge>
                      )}

                      {/* Dual-Key Independent Badges */}
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-border/60 bg-muted/30 text-muted-foreground flex items-center gap-1">
                        <Key className="size-3" />
                        Key 1 Patient: <strong className="text-foreground">{patientConsentStatus}</strong>
                      </span>

                      <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-border/60 bg-muted/30 text-muted-foreground flex items-center gap-1">
                        <Key className="size-3" />
                        Key 2 Custodian: <strong className="text-foreground">{hospitalClearanceStatus}</strong>
                      </span>

                      {grant.isBreakGlass && (
                        <Badge variant="destructive" className="gap-1 text-[11px] font-semibold">
                          <AlertTriangle className="size-3" />
                          Break-Glass Override
                        </Badge>
                      )}

                      {isDisputed && (
                        <Badge variant="outline" className="gap-1 text-[11px] font-semibold bg-amber-500/10 text-amber-600 border-amber-500/40">
                          🚨 Disputed Access Flag
                        </Badge>
                      )}
                    </div>

                    <span className="text-xs text-muted-foreground font-mono self-start sm:self-auto">
                      {createdDate}
                    </span>
                  </div>

                  {/* Parties Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="flex items-start gap-2 text-foreground">
                      <Stethoscope className="size-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">{grant.requestingDoctorName || 'Attending Physician'}</p>
                        <p className="text-muted-foreground">Requesting Node: {grant.requestingHospitalName}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-foreground">
                      <Building2 className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">{grant.targetHospitalName}</p>
                        <p className="text-muted-foreground">Target Custodial Records</p>
                      </div>
                    </div>
                  </div>

                  {/* Patient Subject Info */}
                  <div className="flex items-center gap-1.5 text-xs text-foreground bg-muted/20 p-2 rounded-md">
                    <User className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Subject Patient:</span>
                    <span className="font-semibold">{grant.patientName}</span>
                    <span className="text-muted-foreground font-mono text-[11px]">({grant.patientEmail})</span>
                  </div>

                  {/* Disciplinary Dispute Notice */}
                  {isDisputed && (
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="size-3.5 text-amber-600" />
                        <span>Patient Dispute Under Peer Review:</span>
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        Reason: {grant.patientConsent?.disputeReason || 'Patient reported unauthorized emergency override'}
                      </p>
                    </div>
                  )}

                  {/* Break Glass Attestation */}
                  {grant.isBreakGlass && (
                    <div className="text-xs p-2 rounded bg-destructive/5 border border-destructive/20 text-muted-foreground">
                      <span className="font-semibold text-destructive">Physician Attestation: </span>
                      {grant.breakGlassAttestation}
                    </div>
                  )}

                  {/* Purpose */}
                  <div className="text-xs p-2.5 rounded-md bg-muted/30 border border-border/40 text-foreground">
                    <span className="font-semibold text-muted-foreground">Clinical Purpose: </span>
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
            itemLabel="audit events"
          />
        )}
      </div>
    </div>
  );
};
