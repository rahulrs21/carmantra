'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { B2BCompany } from '@/lib/types/b2b.types';
import { CompanyForm } from './CompanyForm';
import Link from 'next/link';
import { ArrowRight, Search, Trash2 } from 'lucide-react';
import { useDeleteCompany } from '@/hooks/useB2B';

interface CompanyListProps {
  companies: B2BCompany[];
  isLoading: boolean;
  onRefresh: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  error?: Error | null;
}

export function CompanyList({
  companies,
  isLoading,
  onRefresh,
  hasMore = false,
  onLoadMore,
  error,
}: CompanyListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const deleteCompany = useDeleteCompany();

  const filteredCompanies = companies.filter(
    (company) =>
      (company.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (company.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (company.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const handleDelete = async (companyId: string) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await deleteCompany.mutateAsync(companyId);
        onRefresh();
      } catch (error) {
        console.error('Error deleting company:', error);
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>B2B Companies</CardTitle>
        <CardDescription>Manage all B2B client companies</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search & Actions */}
        <div className="flex gap-2 items-center justify-between">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by company name, email, or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <CompanyForm onSuccess={onRefresh} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">Error loading companies</p>
            <p className="text-red-600 text-sm">{error.message}</p>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>TRN</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Loading companies...
                  </TableCell>
                </TableRow>
              ) : filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {companies.length === 0
                      ? 'No companies added yet. Create your first company!'
                      : 'No companies match your search.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((company) => (
                  <TableRow key={company.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{company.name || '-'}</TableCell>
                    <TableCell>{company.contactPerson || '-'}</TableCell>
                    <TableCell>{company.phone || '-'}</TableCell>
                    <TableCell className="text-blue-600">{company.email || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-600">{company.trn || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {company.createdAt
                        ? new Date(
                            company.createdAt instanceof Date
                              ? company.createdAt
                              : (company.createdAt as any).toDate()
                          ).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/b2b-booking/companies/${company.id}`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            View
                            <ArrowRight size={14} />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(company.id)}
                          disabled={deleteCompany.isPending}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={onLoadMore} disabled={isLoading}>
              Load More Companies
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
