import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PaginationControl } from '@/components/ui/pagination-control';
import { ProvisionHospitalModal } from '@/components/admin/ProvisionHospitalModal';
import { 
  Building2, 
  PlusCircle, 
  Search, 
  Mail, 
  MapPin, 
  Stethoscope, 
  CheckCircle2, 
  Loader2,
  Calendar
} from 'lucide-react';

export interface HospitalNodeItem {
  id: string;
  name: string;
  adminEmail: string;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  createdAt: string;
  doctorsCount?: number;
}

export const AdminHospitalsView: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<{ count: number; hospitals: HospitalNodeItem[] }>({
    queryKey: ['adminHospitals'],
    queryFn: async () => {
      const res = await api.get('/admin/hospitals');
      return res.data;
    },
  });

  const hospitals = data?.hospitals || [];

  const filteredHospitals = hospitals.filter((h) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      h.name.toLowerCase().includes(term) ||
      h.adminEmail.toLowerCase().includes(term) ||
      (h.city && h.city.toLowerCase().includes(term)) ||
      (h.state && h.state.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Hospital Nodes</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Participating healthcare institutions acting as sovereign custodial record holders in the CuraOne federation.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsProvisionModalOpen(true)}
          className="gap-2 cursor-pointer font-medium self-start sm:self-auto"
        >
          <PlusCircle className="size-4" />
          <span>Provision Hospital Node</span>
        </Button>
      </div>

      {/* 2. Search Box */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search hospital by facility name, admin email, or city..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="pl-10 h-11 text-sm bg-background border-border/80 focus-visible:ring-1"
        />
      </div>

      {/* 3. Hospital Nodes List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-foreground" />
            <p className="text-sm font-medium">Loading hospital federation nodes...</p>
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2">
            <p className="text-sm text-destructive font-semibold">Failed to load hospital nodes</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filteredHospitals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-2">
            <Building2 className="size-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No hospital nodes found</p>
            <p className="text-xs text-muted-foreground">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Enroll a hospital node to start the federation.'}
            </p>
          </div>
        ) : (
          filteredHospitals.slice((page - 1) * pageSize, page * pageSize).map((h) => {
            const enrolledDate = new Date(h.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <Card key={h.id} className="border-border/60 bg-card/60 shadow-xs hover:border-border transition-colors">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                        <Building2 className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{h.name}</h3>
                        <p className="text-xs text-muted-foreground font-mono">Node ID: {h.id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      <Badge variant="outline" className="gap-1 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                        <CheckCircle2 className="size-3" />
                        Federation Node Active
                      </Badge>
                      <Badge variant="outline" className="gap-1 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                        <Stethoscope className="size-3" />
                        {h.doctorsCount ?? 0} Clinicians
                      </Badge>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3.5 text-foreground shrink-0" />
                      <span className="truncate">Admin: <strong className="text-foreground">{h.adminEmail}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-foreground shrink-0" />
                      <span>{h.city || 'Leominster'}, {h.state || 'MA'}</span>
                      {h.phone && <span className="text-muted-foreground/60">• {h.phone}</span>}
                    </div>

                    <div className="flex items-center gap-1.5 sm:justify-end">
                      <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                      <span>Enrolled: {enrolledDate}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {filteredHospitals.length > 0 && (
          <PaginationControl
            currentPage={page}
            totalPages={Math.ceil(filteredHospitals.length / pageSize)}
            totalItems={filteredHospitals.length}
            pageSize={pageSize}
            onPageChange={setPage}
            itemLabel="hospital nodes"
          />
        )}
      </div>

      {/* Provision Modal */}
      <ProvisionHospitalModal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['adminHospitals'] });
        }}
      />
    </div>
  );
};
