'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { B2BReferral } from '@/lib/types/b2b.types';
import { ReferralForm } from './ReferralForm';
import { Trash2, Pencil } from 'lucide-react';
import { useDeleteReferral } from '@/hooks/useB2B';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/lib/userContext';
import { activityService } from '@/lib/firestore/activity-service';

interface ReferralListProps {
  companyId: string;
  serviceId: string;
  jobCardNo?: string; // Job Card number for tracking
  referrals: B2BReferral[];
  vehicleIds?: string[];
  isLoading: boolean;
  onRefresh: () => void;
  disabled?: boolean;
}

export function ReferralList({
  companyId,
  serviceId,
  jobCardNo,
  referrals,
  vehicleIds = [],
  isLoading,
  onRefresh,
  disabled = false,
}: ReferralListProps) {
  const deleteReferral = useDeleteReferral();
  const { toast } = useToast();
  const { role, user } = useUser();
  
  const handleDelete = (referral: B2BReferral) => {
    // Show confirmation alert
    if (confirm(`Are you sure you want to delete this referral for ${referral.personName}? This action cannot be undone.`)) {
      deleteReferral.mutate(
        {
          companyId,
          serviceId,
          referralId: referral.id,
        },
        {
          onSuccess: async () => {
            // Log activity
            await activityService.logActivity({
              companyId,
              activityType: 'referral_deleted',
              description: `Referral deleted - ${referral.personName} (Commission: AED ${referral.commission})`,
              userId: user?.uid || 'unknown',
              userName: user?.displayName || 'Unknown User',
              userEmail: user?.email || 'unknown@email.com',
              userRole: role || 'unknown',
              metadata: {
                serviceId,
                referralId: referral.id,
                personName: referral.personName,
                contact: referral.contact,
                commission: referral.commission,
                status: referral.status,
                jobCardNo,
              },
            });

            toast({
              title: 'Success',
              description: 'Referral deleted successfully',
            });
            onRefresh();
          },
          onError: (error) => {
            toast({
              title: 'Error',
              description: 'Failed to delete referral',
              variant: 'destructive',
            });
          },
        }
      );
    }
  };

  const totalCommission = referrals.reduce((sum, r) => sum + (r.commission || 0), 0);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Referrals</CardTitle>
          <CardDescription>Commission tracking per referral</CardDescription>
        </div>
        <ReferralForm
          companyId={companyId}
          serviceId={serviceId}
          jobCardNo={jobCardNo}
          vehicleIds={vehicleIds}
          onSuccess={onRefresh}
          disabled={disabled}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Card No</TableHead>
                <TableHead>Person Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Loading referrals...
                  </TableCell>
                </TableRow>
              ) : referrals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No referrals added yet.
                  </TableCell>
                </TableRow>
              ) : (
                referrals.map((referral) => (
                  <TableRow key={referral.id} className="hover:bg-gray-50">
                    <TableCell className="font-semibold text-blue-600">
                      {referral.jobCardNo || jobCardNo || '-'}
                    </TableCell>
                    <TableCell className="font-medium">{referral.personName}</TableCell>
                    <TableCell className="text-sm">{referral.contact}</TableCell>
                    <TableCell className="font-semibold">
                      AED {referral.commission.toLocaleString('en-AE')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(
                        referral.referralDate instanceof Date
                          ? referral.referralDate
                          : (referral.referralDate as any).toDate()
                      ).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm px-2 py-1 rounded ${
                          referral.status === 'completed'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        {referral.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <ReferralForm
                          companyId={companyId}
                          serviceId={serviceId}
                          jobCardNo={jobCardNo}
                          vehicleIds={vehicleIds}
                          referral={referral}
                          onSuccess={onRefresh}
                          trigger={
                            <Button size="sm" variant="outline" className="gap-1">
                              <Pencil size={14} />
                              Edit
                            </Button>
                          }
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(referral)}
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

        {referrals.length > 0 && (
          <div className="border-t pt-4 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Commission</p>
              <p className="text-2xl font-bold">AED {totalCommission.toLocaleString('en-AE')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
