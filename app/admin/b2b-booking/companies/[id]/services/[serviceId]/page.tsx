'use client';

import { use, useState } from 'react';
import {
  useServiceById,
  useVehicles,
  useReferrals,
  useCompanyById,
  useCalculateTotals,
  useUpdateServiceStatus,
} from '@/hooks/useB2B';
import { batchUpdateServiceTotals } from '@/lib/firestore/b2b-service';
import { VehicleList } from '@/components/admin/b2b/VehicleList';
import { ReferralList } from '@/components/admin/b2b/ReferralList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface ServiceDetailPageProps {
  params: Promise<{
    id: string;
    serviceId: string;
  }>;
}

export default function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { id, serviceId } = use(params);
  const { data: service, isLoading: serviceLoading, refetch: refetchService } = useServiceById(
    id,
    serviceId
  );
  const { data: company } = useCompanyById(id);
  const { vehicles, isLoading: vehiclesLoading } = useVehicles(id, serviceId);
  const { referrals, isLoading: referralsLoading } = useReferrals(id, serviceId);
  const updateServiceStatus = useUpdateServiceStatus();
  const [newStatus, setNewStatus] = useState<string>('');

  const totals = useCalculateTotals(vehicles, referrals);

  if (serviceLoading) {
    return <div className="p-8 text-center">Loading service details...</div>;
  }

  if (!service) {
    return <div className="p-8 text-center text-red-600">Service not found</div>;
  }

  const handleStatusChange = async (status: string) => {
    try {
      console.log('[ServiceDetail] Status change requested:', status);
      
      // Update status
      await updateServiceStatus.mutateAsync({
        companyId: id,
        serviceId: serviceId,
        status,
      });

      console.log('[ServiceDetail] Status updated, calculating totals');

      // If status is completed, also persist the calculated totals to the service document
      if (status === 'completed') {
        console.log('[ServiceDetail] Status is completed, persisting totals:', totals);
        await batchUpdateServiceTotals(id, serviceId, totals.subtotal, totals.referralTotal);
        console.log('[ServiceDetail] Totals persisted successfully');
      }

      setNewStatus(status);
      
      // Reload to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('[ServiceDetail] Error updating status:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/b2b-booking/companies/${id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ChevronLeft size={16} />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{service.title}</h1>
            <p className="text-gray-600">Service ID: {serviceId}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Total Service Amount</p>
          <p className="text-3xl font-bold">AED {totals.totalAmount.toLocaleString('en-AE')}</p>
        </div>
      </div>

      {/* Service Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{service.type}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Service Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {new Date(
                service.serviceDate instanceof Date
                  ? service.serviceDate
                  : (service.serviceDate as any).toDate()
              ).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Company</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{company?.name || 'N/A'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={service.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Totals Summary */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Vehicle Services Total</p>
              <p className="text-2xl font-bold">AED {totals.subtotal.toLocaleString('en-AE')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Referral Commissions</p>
              <p className="text-2xl font-bold text-green-600">
                AED {totals.referralTotal.toLocaleString('en-AE')}
              </p>
            </div>
            <div className="border-l-2 pl-6">
              <p className="text-sm text-gray-600">Service Total</p>
              <p className="text-3xl font-bold">AED {totals.totalAmount.toLocaleString('en-AE')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {service.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Service Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{service.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Vehicles Section */}
      <div className="mb-6">
        <VehicleList
          companyId={id}
          serviceId={serviceId}
          vehicles={vehicles}
          isLoading={vehiclesLoading}
          onRefresh={() => window.location.reload()}
        />
      </div>

      {/* Referrals Section */}
      <div className="mb-6">
        <ReferralList
          companyId={id}
          serviceId={serviceId}
          referrals={referrals}
          vehicleIds={vehicles.map((v: any) => v.id)}
          isLoading={referralsLoading}
          onRefresh={() => window.location.reload()}
        />
      </div>
    </div>
  );
}
