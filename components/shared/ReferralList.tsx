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
import { Referral } from '@/lib/types/referral.types';
import { ReferralForm } from './ReferralForm';
import { Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReferralListProps {
  serviceId: string;
  referrals: Referral[];
  isLoading: boolean;
  onRefresh: () => void;
  onDelete: (referralId: string) => Promise<void>;
  disabled?: boolean;
  onAddSuccess?: () => void;
}

export function ReferralList({
  serviceId,
  referrals,
  isLoading,
  onRefresh,
  onDelete,
  disabled = false,
  onAddSuccess,
}: ReferralListProps) {
  const { toast } = useToast();

  const handleDelete = async (referral: Referral) => {
    if (confirm(`Are you sure you want to delete this referral for ${referral.personName}? This action cannot be undone.`)) {
      try {
        await onDelete(referral.id);
        toast({
          title: 'Success',
          description: 'Referral deleted successfully',
        });
        onRefresh();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete referral',
          variant: 'destructive',
        });
      }
    }
  };

  const totalCommission = referrals.reduce((sum, r) => sum + (r.commission || 0), 0);

  return (
    <Card className="w-full border-2 border-purple-200">
      <CardHeader className="space-y-0 pb-4">
        <div>
          <CardTitle>Referrals</CardTitle>
          <CardDescription>Commission tracking per referral</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Loading referrals...
                  </TableCell>
                </TableRow>
              ) : referrals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No referrals added yet.
                  </TableCell>
                </TableRow>
              ) : (
                referrals.map((referral) => (
                  <TableRow key={referral.id} className="hover:bg-gray-50">
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
                            : referral.status === 'cancelled'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        {referral.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <ReferralForm
                          serviceId={serviceId}
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
              <p className="text-2xl font-bold text-purple-600">AED {totalCommission.toLocaleString('en-AE')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
