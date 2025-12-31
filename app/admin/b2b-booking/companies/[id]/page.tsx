'use client';

import { use, useState, useEffect } from 'react';
import { useServices, useCompanyById } from '@/hooks/useB2B';
import { quotationsService, invoicesService } from '@/lib/firestore/b2b-service';
import { ServiceList } from '@/components/admin/b2b/ServiceList';
import { QuotationList } from '@/components/admin/b2b/QuotationList';
import { InvoiceList } from '@/components/admin/b2b/InvoiceList';
import { CompanyForm } from '@/components/admin/b2b/CompanyForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Edit } from 'lucide-react';
import Link from 'next/link';

interface CompanyDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { id } = use(params);
  const { data: company, isLoading: companyLoading, refetch: refetchCompany } = useCompanyById(id);
  const { services, isLoading: servicesLoading } = useServices(id);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [quotationsLoading, setQuotationsLoading] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Create a stable string of service IDs to use as dependency
  const serviceIdsString = services?.map((s) => s.id).join(',') || '';

  // Fetch quotations and invoices from all services
  useEffect(() => {
    if (!services || services.length === 0) {
      setQuotations([]);
      setInvoices([]);
      return;
    }

    const fetchAllQuotationsAndInvoices = async () => {
      try {
        setQuotationsLoading(true);
        setInvoicesLoading(true);

        const allQuotations: any[] = [];
        const allInvoices: any[] = [];

        // Fetch from firestore for each service
        for (const service of services) {
          try {
            const quots = await quotationsService.fetchQuotations(id, service.id);
            if (quots && quots.length > 0) {
              // Add serviceId to each quotation for later reference
              allQuotations.push(...quots.map((q) => ({ ...q, serviceId: service.id })));
            }

            const invs = await invoicesService.fetchInvoices(id, service.id);
            if (invs && invs.length > 0) {
              // Add serviceId to each invoice for later reference
              allInvoices.push(...invs.map((i) => ({ ...i, serviceId: service.id })));
            }
          } catch (error) {
            console.error(`Error fetching data for service ${service.id}:`, error);
          }
        }

        setQuotations(allQuotations);
        setInvoices(allInvoices);
      } catch (error) {
        console.error('Error fetching quotations and invoices:', error);
      } finally {
        setQuotationsLoading(false);
        setInvoicesLoading(false);
      }
    };

    fetchAllQuotationsAndInvoices();
  }, [id, serviceIdsString]);

  if (companyLoading) {
    return <div className="p-8 text-center">Loading company details...</div>;
  }

  if (!company) {
    return <div className="p-8 text-center text-red-600">Company not found</div>;
  }

  const handleGenerateQuotation = (serviceId: string) => {
    // This will be implemented with quotation generation
    console.log('Generate quotation for service:', serviceId);
  };

  const handleGenerateInvoice = (serviceId: string) => {
    // This will be implemented with invoice generation
    console.log('Generate invoice for service:', serviceId);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header with back button */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/b2b-booking">
            <Button variant="outline" size="sm" className="gap-2">
              <ChevronLeft size={16} />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{company.name}</h1>
            <p className="text-gray-600">Company ID: {company.id}</p>
          </div>
        </div>
        <CompanyForm company={company} onSuccess={() => refetchCompany()} />
      </div>

      {/* Company Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contact Person</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{company.contactPerson}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Phone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{company.phone}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-blue-600">{company.email}</p>
          </CardContent>
        </Card>
      </div>



      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-3'>
        {/* TRN Card */}
        {company.trn && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>TRN Number</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{company.trn}</p>
            </CardContent>
          </Card>
        )}

        {/* Address Info */}
        {(company.address || company.city || company.state) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                {[company.address, company.city, company.state, company.zipCode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {company.notes && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{company.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Services List */}
      <div className="mb-6">
        <ServiceList
          companyId={id}
          services={services}
          company={company}
          isLoading={servicesLoading}
          onRefresh={() => window.location.reload()}
          onGenerateQuotation={handleGenerateQuotation}
          onGenerateInvoice={handleGenerateInvoice}
        />
      </div>

      {/* Quotations Section */}
      <div className="mb-6">
        <QuotationList
          companyId={id}
          serviceId=""
          quotations={quotations}
          isLoading={quotationsLoading}
          onRefresh={() => window.location.reload()}
        />
      </div>

      {/* Invoices Section */}
      <div id='invoiceList'>
        <InvoiceList
          companyId={id}
          serviceId=""
          invoices={invoices}
          isLoading={invoicesLoading}
          onRefresh={() => window.location.reload()}
        />
      </div>
    </div>
  );
}
