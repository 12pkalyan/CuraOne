import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SearchPatientsResponse, PatientListItem } from '@/types/patient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PaginationControl } from '@/components/ui/pagination-control';
import { Search, User as UserIcon, ArrowRight, Loader2, Calendar, MapPin, Mail } from 'lucide-react';

interface PatientSearchDirectoryProps {
  onSelectPatient: (patientId: string) => void;
}

function calculateAge(birthdateStr: string): number {
  const birth = new Date(birthdateStr);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export const PatientSearchDirectory: React.FC<PatientSearchDirectoryProps> = ({ onSelectPatient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError } = useQuery<SearchPatientsResponse>({
    queryKey: ['patients', searchTerm, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      params.append('limit', pageSize.toString());
      params.append('offset', ((page - 1) * pageSize).toString());
      const res = await api.get<SearchPatientsResponse>(`/patients?${params.toString()}`);
      return res.data;
    },
  });

  const patients = data?.patients || [];
  const totalItems = data?.pagination?.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Patients Directory</h1>
        <p className="text-sm text-muted-foreground">
          Search and select a patient to review their longitudinal clinical history.
        </p>
      </div>

      {/* 2. Prominent Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search patients by name, DOB, or email..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 h-11 text-sm bg-background border-border/80 focus-visible:ring-1"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => handleSearchChange('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* 3. Patient List Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-foreground" />
            <p className="text-sm">Searching patient directory...</p>
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
            Failed to load patient directory. Please check backend connection.
          </div>
        ) : patients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-2">
            <UserIcon className="size-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No matching patients found</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search query or clear the filter.
            </p>
          </div>
        ) : (
          patients.map((patient: PatientListItem) => {
            const age = patient.birthdate ? calculateAge(patient.birthdate) : null;
            const genderLabel = patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender;

            return (
              <Card
                key={patient.id}
                className="border-border/60 hover:border-border hover:shadow-xs transition-all bg-card/50"
              >
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Left: Patient Identifiers */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-xs text-foreground">
                        {patient.firstName[0]}
                        {patient.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">
                            {patient.firstName} {patient.lastName}
                          </h3>
                          {age !== null && (
                            <Badge variant="outline" className="text-[11px] py-0 px-1.5 font-normal text-muted-foreground">
                              {genderLabel}, {age}y
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pl-10.5">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="size-3 text-muted-foreground" />
                        {patient.email}
                      </span>
                      {(patient.city || patient.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground" />
                          {patient.city || ''}{patient.city && patient.state ? ', ' : ''}{patient.state || ''}
                        </span>
                      )}
                      {patient.birthdate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground" />
                          DOB: {patient.birthdate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Encounter Count & CTA Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md">
                      {patient.totalEncounters ?? patient.encounterCount ?? 0} {(patient.totalEncounters ?? patient.encounterCount ?? 0) === 1 ? 'Encounter' : 'Encounters'}
                    </span>

                    <Button
                      size="sm"
                      onClick={() => onSelectPatient(patient.id)}
                      className="gap-1.5 cursor-pointer font-medium"
                    >
                      <span>Open Records</span>
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 4. Pagination */}
      {!isLoading && !isError && totalItems > 0 && (
        <PaginationControl
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          itemLabel="patients"
        />
      )}
    </div>
  );
};
