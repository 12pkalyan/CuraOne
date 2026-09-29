import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ProvisionDoctorModal } from '@/components/hospital/ProvisionDoctorModal';
import { PaginationControl } from '@/components/ui/pagination-control';
import { 
  Stethoscope, 
  PlusCircle, 
  Search, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  Loader2, 
  Users 
} from 'lucide-react';

interface DoctorItem {
  id: string;
  name: string;
  email: string;
  specialty?: string | null;
  gender?: string | null;
  createdAt: string;
}

export const HospitalDoctorsView: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<{ count: number; doctors: DoctorItem[] }>({
    queryKey: ['hospitalDoctors'],
    queryFn: async () => {
      const res = await api.get('/hospitals/doctors');
      return res.data;
    },
  });

  const doctors = data?.doctors || [];

  const filteredDoctors = doctors.filter((doc) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      doc.name.toLowerCase().includes(term) ||
      (doc.specialty && doc.specialty.toLowerCase().includes(term)) ||
      doc.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Medical Staff</h1>
            <Badge variant="outline" className="text-xs font-semibold text-muted-foreground">
              {doctors.length} {doctors.length === 1 ? 'Physician' : 'Physicians'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage authorized attending physicians and clinical specialists credentialed to this facility.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsProvisionModalOpen(true)}
          className="gap-2 cursor-pointer font-medium self-start sm:self-auto"
        >
          <PlusCircle className="size-4" />
          <span>Provision Doctor</span>
        </Button>
      </div>

      {/* 2. Search Box */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search doctors by name, specialty, or email..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="pl-10 h-11 text-sm bg-background border-border/80 focus-visible:ring-1"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* 3. Doctors List Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-foreground" />
            <p className="text-sm">Loading medical staff directory...</p>
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2">
            <p className="text-sm text-destructive font-semibold">Failed to load medical staff</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-2">
            <Users className="size-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">
              {searchTerm ? 'No physicians match your search' : 'No doctors provisioned yet'}
            </p>
            <p className="text-xs text-muted-foreground">
              {searchTerm ? 'Try a different search term.' : 'Click "Provision Doctor" to credential your first physician.'}
            </p>
          </div>
        ) : (
          filteredDoctors.slice((page - 1) * pageSize, page * pageSize).map((doctor) => {
            const formattedDate = new Date(doctor.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <Card key={doctor.id} className="border-border/60 bg-card/60 shadow-xs hover:border-border transition-colors">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                        <Stethoscope className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-foreground">{doctor.name}</h3>
                          <Badge variant="outline" className="text-[11px] font-normal bg-muted/60">
                            {doctor.specialty || 'General Practice'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pl-11.5">
                      <span className="flex items-center gap-1">
                        <Mail className="size-3 text-muted-foreground" />
                        {doctor.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-muted-foreground" />
                        Credentialed: {formattedDate}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    <Badge variant="outline" className="gap-1 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                      Active Credential
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {filteredDoctors.length > 0 && (
          <PaginationControl
            currentPage={page}
            totalPages={Math.ceil(filteredDoctors.length / pageSize)}
            totalItems={filteredDoctors.length}
            pageSize={pageSize}
            onPageChange={setPage}
            itemLabel="physicians"
          />
        )}
      </div>

      {/* Modal: Provision New Doctor */}
      <ProvisionDoctorModal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['hospitalDoctors'] });
        }}
      />
    </div>
  );
};
