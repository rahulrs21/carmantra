'use client';

import { useCompanies } from '@/hooks/useB2B';
import { CompanyList } from '@/components/admin/b2b/CompanyList';

export default function B2BBookingPage() {
  const { companies, isLoading, loadMore, hasMore, error } = useCompanies(20);

  console.log('B2B Page state:', { companiesCount: companies.length, isLoading, hasMore, error });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">B2B Booking Service</h1>
        <p className="text-gray-600">
          Manage companies, services, vehicles, and generate quotations & invoices
        </p>
      </div>

      <CompanyList
        companies={companies}
        isLoading={isLoading}
        onRefresh={() => window.location.reload()}
        hasMore={hasMore}
        onLoadMore={loadMore}
        error={error}
      />
    </div>
  );
}
