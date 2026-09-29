import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, ShieldCheck, MapPin, Mail, Server, Network } from 'lucide-react';

export const HospitalFacilityInfoView: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const hospitalName = user.name || user.details?.hospitalName || 'Custodial Medical Center';
  const hospitalCity = user.details?.city || 'Framingham';
  const hospitalState = user.details?.state || 'MA';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Facility Node Jurisdiction</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Institutional identity and cryptographic custodial node status on the CuraOne network.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Institutional Identity</CardTitle>
              <Building2 className="size-4 text-foreground" />
            </div>
            <CardDescription>Official hospital node registration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Facility Name:</span>
              <span className="font-semibold text-foreground text-right">{hospitalName}</span>
            </div>

            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Jurisdiction:</span>
              <span className="font-medium text-foreground flex items-center gap-1">
                <MapPin className="size-3 text-muted-foreground" />
                {hospitalCity}, {hospitalState}
              </span>
            </div>

            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Admin Account:</span>
              <span className="font-medium text-foreground flex items-center gap-1">
                <Mail className="size-3 text-muted-foreground" />
                {user.email}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-muted-foreground">Node UUID:</span>
              <span className="font-mono text-[11px] text-foreground bg-muted/50 px-2 py-0.5 rounded">
                {user.id}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Network & Custody Node</CardTitle>
              <Server className="size-4 text-foreground" />
            </div>
            <CardDescription>Decentralized record trust status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Custodial Status:</span>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-semibold">
                <ShieldCheck className="size-3" />
                Active Custodian Node
              </Badge>
            </div>

            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Protocol:</span>
              <span className="font-mono text-foreground font-semibold">CuraOne ABAC / RBAC v1.0</span>
            </div>

            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Access Gating:</span>
              <span className="text-foreground font-medium">Sovereign Patient Consent</span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-muted-foreground">Embeddings Engine:</span>
              <span className="text-foreground font-medium flex items-center gap-1">
                <Network className="size-3 text-primary" />
                768-dim pgvector
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-muted/20 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Institutional Custody Rules</CardTitle>
          <CardDescription className="text-xs">
            How longitudinal medical records are safeguarded under the CuraOne architecture
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
          <p>
            • <strong>Custodial Responsibility</strong>: Each hospital node acts as the legal custodian for the clinical encounters logged within its walls. Records are not held in a central unencrypted database.
          </p>
          <p>
            • <strong>Cross-Hospital Isolation</strong>: Attending physicians from external institutions cannot read medical notes, diagnoses, or prescriptions held by this hospital unless an active <code className="text-foreground font-mono text-[11px]">access_grant</code> exists.
          </p>
          <p>
            • <strong>Patient Sovereignty</strong>: Only the patient has the authority to approve, reject, or prematurely revoke an access grant. Hospital nodes and attending physicians cannot bypass patient consent.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
