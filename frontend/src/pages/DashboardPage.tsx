import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DoctorSidebar } from '@/components/layout/DoctorSidebar';
import { HospitalSidebar, type HospitalView } from '@/components/layout/HospitalSidebar';
import { PatientSidebar, type PatientViewTab } from '@/components/layout/PatientSidebar';
import { PatientSearchDirectory } from '@/components/patients/PatientSearchDirectory';
import { PatientTimelineView } from '@/components/patients/PatientTimelineView';
import { NewClinicalVisitView } from '@/components/patients/NewClinicalVisitView';
import { DoctorGrantsView } from '@/components/grants/DoctorGrantsView';
import { HospitalDoctorsView } from '@/components/hospital/HospitalDoctorsView';
import { HospitalOutboundGrantsView } from '@/components/hospital/HospitalOutboundGrantsView';
import { HospitalInboundGrantsView } from '@/components/hospital/HospitalInboundGrantsView';
import { HospitalFacilityInfoView } from '@/components/hospital/HospitalFacilityInfoView';
import { PatientSovereignTimelineView } from '@/components/patient/PatientSovereignTimelineView';
import { PatientConsentInboxView } from '@/components/patient/PatientConsentInboxView';
import { PatientSecurityAuditView } from '@/components/patient/PatientSecurityAuditView';
import { AdminSidebar, type AdminViewTab } from '@/components/layout/AdminSidebar';
import { AdminHospitalsView } from '@/components/admin/AdminHospitalsView';
import { AdminAuditView } from '@/components/admin/AdminAuditView';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bot
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [sidebarView, setSidebarView] = useState<'patients' | 'grants' | 'copilot' | 'new-visit'>('patients');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [hospitalView, setHospitalView] = useState<HospitalView>('doctors');
  const [patientTab, setPatientTab] = useState<PatientViewTab>('timeline');
  const [adminTab, setAdminTab] = useState<AdminViewTab>('hospitals');

  // Fetch pending grants count for doctor's badge
  const { data: doctorGrantsData } = useQuery<{ grants: any[]; count: number }>({
    queryKey: ['doctorGrants'],
    queryFn: async () => {
      const res = await api.get('/grants');
      return res.data;
    },
    enabled: user?.role === 'DOCTOR',
  });

  // Fetch grants for hospital admin's badges
  const { data: hospitalGrantsData } = useQuery<{ grants: any[]; count: number }>({
    queryKey: ['hospitalGrants'],
    queryFn: async () => {
      const res = await api.get('/grants');
      return res.data;
    },
    enabled: user?.role === 'HOSPITAL',
  });

  // Fetch grants for patient's badges
  const { data: patientGrantsData } = useQuery<{ grants: any[]; count: number }>({
    queryKey: ['patientGrants'],
    queryFn: async () => {
      const res = await api.get('/grants');
      return res.data;
    },
    enabled: user?.role === 'PATIENT',
  });

  // Fetch hospitals for system admin's badge
  const { data: adminHospitalsData } = useQuery<{ count: number; hospitals: any[] }>({
    queryKey: ['adminHospitals'],
    queryFn: async () => {
      const res = await api.get('/admin/hospitals');
      return res.data;
    },
    enabled: user?.role === 'SYSTEM_ADMIN',
  });

  // Fetch all grants for system admin's dispute badge
  const { data: adminAuditData } = useQuery<{ count: number; grants: any[] }>({
    queryKey: ['adminAuditGrants'],
    queryFn: async () => {
      const res = await api.get('/grants');
      return res.data;
    },
    enabled: user?.role === 'SYSTEM_ADMIN',
  });

  const pendingGrantsCount = doctorGrantsData?.grants?.filter((g) => g.status === 'PENDING').length || 0;

  const currentHospitalId = user?.hospitalId || user?.id;
  const pendingOutboundCount = hospitalGrantsData?.grants?.filter(
    (g) => g.requestingHospitalId === currentHospitalId && g.status === 'PENDING'
  ).length || 0;
  const activeInboundCount = hospitalGrantsData?.grants?.filter(
    (g) => g.targetHospitalId === currentHospitalId && g.status === 'APPROVED'
  ).length || 0;
  const flaggedOutboundCount = hospitalGrantsData?.grants?.filter(
    (g) =>
      g.requestingHospitalId === currentHospitalId &&
      (g.patientConsent?.isDisputed || g.hospitalClearance?.flaggedForHostReview)
  ).length || 0;

  const pendingPatientConsentsCount =
    patientGrantsData?.grants?.filter(
      (g) => g.patientConsent?.status === 'PENDING' && g.status === 'PENDING'
    ).length || 0;

  const patientAuditAlertCount =
    patientGrantsData?.grants?.filter(
      (g) => g.isBreakGlass && !g.patientConsent?.isDisputed
    ).length || 0;

  const adminDisputedCount =
    adminAuditData?.grants?.filter((g) => g.patientConsent?.isDisputed).length || 0;

  if (!user) return null;

  // 1. DOCTOR WORKSTATION LAYOUT
  if (user.role === 'DOCTOR') {
    return (
      <div className="flex flex-1 h-full min-h-0 overflow-hidden">
        <DoctorSidebar
          activeView={sidebarView}
          onSelectView={(view) => {
            setSidebarView(view);
          }}
          isPatientSelected={!!selectedPatientId}
          pendingGrantsCount={pendingGrantsCount}
        />

        <main className="flex-1 h-full p-4 sm:p-6 lg:p-8 overflow-y-auto bg-background/50">
          {sidebarView === 'patients' && (
            selectedPatientId ? (
              <PatientTimelineView
                patientId={selectedPatientId}
                onBack={() => setSelectedPatientId(null)}
                onNavigateToNewVisit={() => setSidebarView('new-visit')}
              />
            ) : (
              <PatientSearchDirectory
                onSelectPatient={(id) => setSelectedPatientId(id)}
              />
            )
          )}

          {sidebarView === 'new-visit' && (
            <NewClinicalVisitView
              preselectedPatientId={selectedPatientId}
              onSelectPatient={(id) => setSelectedPatientId(id)}
              onViewTimeline={(id) => {
                setSelectedPatientId(id);
                setSidebarView('patients');
              }}
            />
          )}

          {sidebarView === 'grants' && (
            <DoctorGrantsView
              onSelectPatient={(id) => {
                setSelectedPatientId(id);
                setSidebarView('patients');
              }}
            />
          )}

          {sidebarView === 'copilot' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Clinical Copilot</h1>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    Slice 4 Upcoming
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Authorized contextual retrieval & grounding over longitudinal medical records.
                </p>
              </div>

              <Card className="border-border/60 bg-card/60 shadow-xs">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bot className="size-5 text-primary" />
                    <CardTitle className="text-base font-semibold">Gated Semantic Search Architecture</CardTitle>
                  </div>
                  <CardDescription>Research core powering clinical question-answering</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    Unlike standard medical LLM tools that search open unverified data, the CuraOne Copilot strictly queries{' '}
                    <strong className="text-foreground">768-dimensional Gemini embeddings</strong> stored in PostgreSQL with <code className="text-foreground font-mono text-xs">pgvector</code>.
                  </p>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-2 text-xs">
                    <p className="font-semibold text-foreground">Strict Authorization Rule:</p>
                    <p>
                      Similarity retrieval is dynamically gated by active <code className="text-foreground font-mono text-xs">access_requests</code>. Records from external hospitals with expired or absent consent grants are never retrieved into the prompt context.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSidebarView('patients')}
                    className="cursor-pointer"
                  >
                    Return to Patients Directory
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    );
  }

  // 2. HOSPITAL WORKSTATION LAYOUT
  if (user.role === 'HOSPITAL') {
    return (
      <div className="flex flex-1 h-full min-h-0 overflow-hidden">
        <HospitalSidebar
          activeView={hospitalView}
          onSelectView={setHospitalView}
          pendingOutboundCount={pendingOutboundCount}
          activeInboundCount={activeInboundCount}
          flaggedOutboundCount={flaggedOutboundCount}
        />

        <main className="flex-1 h-full p-4 sm:p-6 lg:p-8 overflow-y-auto bg-background/50">
          {hospitalView === 'doctors' && <HospitalDoctorsView />}
          {hospitalView === 'outbound' && <HospitalOutboundGrantsView />}
          {hospitalView === 'inbound' && <HospitalInboundGrantsView />}
          {hospitalView === 'facility' && <HospitalFacilityInfoView />}
        </main>
      </div>
    );
  }

  // 3. PATIENT SOVEREIGN IDENTITY & CONSENT PORTAL (VERTICAL SLICE 3)
  if (user.role === 'PATIENT') {
    return (
      <div className="flex flex-1 h-full min-h-0 overflow-hidden">
        <PatientSidebar
          activeTab={patientTab}
          onTabChange={setPatientTab}
          pendingConsentCount={pendingPatientConsentsCount}
          auditAlertCount={patientAuditAlertCount}
        />

        <main className="flex-1 h-full p-4 sm:p-6 lg:p-8 overflow-y-auto bg-background/50">
          {patientTab === 'timeline' && <PatientSovereignTimelineView />}
          {patientTab === 'consent' && <PatientConsentInboxView />}
          {patientTab === 'audit' && <PatientSecurityAuditView />}
        </main>
      </div>
    );
  }

  // 4. SYSTEM ADMIN WORKSTATION LAYOUT
  return (
    <div className="flex flex-1 h-full min-h-0 overflow-hidden">
      <AdminSidebar
        activeTab={adminTab}
        onSelectTab={setAdminTab}
        hospitalsCount={adminHospitalsData?.count || adminHospitalsData?.hospitals?.length || 0}
        disputedCount={adminDisputedCount}
      />

      <main className="flex-1 h-full p-4 sm:p-6 lg:p-8 overflow-y-auto bg-background/50">
        {adminTab === 'hospitals' && <AdminHospitalsView />}
        {adminTab === 'audit' && <AdminAuditView />}
      </main>
    </div>
  );
};
