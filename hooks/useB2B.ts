/**
 * B2B Booking Custom Hooks
 * React hooks for data fetching, mutations, and state management
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';

import {
  B2BCompany,
  B2BService,
  B2BVehicle,
  B2BPreInspection,
  B2BReferral,
  CompanyFormData,
  ServiceFormData,
  VehicleFormData,
  PreInspectionFormData,
  ReferralFormData,
} from '@/lib/types/b2b.types';
import {
  companiesService,
  servicesService,
  vehiclesService,
  preInspectionsService,
  referralsService,
  quotationsService,
  invoicesService,
  batchUpdateServiceTotals,
} from '@/lib/firestore/b2b-service';

// ============ COMPANY HOOKS ============

export function useCompanies(pageSize = 20) {
  const queryClient = useQueryClient();
  const [lastDoc, setLastDoc] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['b2b:companies', pageSize, lastDoc ? 'paginated' : 'initial'],
    queryFn: async () => {
      try {
        const result = await companiesService.fetchCompanies(pageSize, lastDoc);
        console.log('Fetched companies:', result.companies.length);
        return result;
      } catch (err) {
        console.error('useCompanies error:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loadMore = useCallback(() => {
    if (data?.lastDoc) {
      setLastDoc(data.lastDoc);
    }
  }, [data?.lastDoc]);

  return {
    companies: data?.companies || [],
    hasMore: data?.hasMore || false,
    isLoading,
    error,
    loadMore,
  };
}

export function useCompanyById(companyId: string) {
  return useQuery({
    queryKey: ['b2b:company', companyId],
    queryFn: () => companiesService.fetchCompanyById(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { data: CompanyFormData; userId: string }) =>
      companiesService.createCompany(payload.data, payload.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2b:companies'] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { companyId: string; data: Partial<CompanyFormData> }) =>
      companiesService.updateCompany(payload.companyId, payload.data),
    onSuccess: (_: any, variables: { companyId: string; data: Partial<CompanyFormData> }) => {
      queryClient.invalidateQueries({ queryKey: ['b2b:company', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['b2b:companies'] });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) => companiesService.deleteCompany(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2b:companies'] });
    },
  });
}

// ============ SERVICE HOOKS ============

export function useServices(
  companyId: string,
  startDate?: Date,
  endDate?: Date,
  pageSize = 20
) {
  const queryClient = useQueryClient();
  const [lastDoc, setLastDoc] = useState<any>(null);

  const queryKey = ['b2b:services', companyId, startDate?.toISOString(), endDate?.toISOString()];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await servicesService.fetchServices(
        companyId,
        startDate,
        endDate,
        pageSize,
        lastDoc || undefined
      );
      return result;
    },
    enabled: !!companyId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  const loadMore = useCallback(() => {
    if (data?.lastDoc) {
      setLastDoc(data.lastDoc);
    }
  }, [data?.lastDoc]);

  return {
    services: data?.services || [],
    hasMore: data?.hasMore || false,
    isLoading,
    error,
    loadMore,
  };
}

export function useServiceById(companyId: string, serviceId: string) {
  return useQuery({
    queryKey: ['b2b:service', companyId, serviceId],
    queryFn: () => servicesService.fetchServiceById(companyId, serviceId),
    enabled: !!companyId && !!serviceId,
    staleTime: 3 * 60 * 1000,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { companyId: string; data: ServiceFormData; userId: string }) =>
      servicesService.createService(payload.companyId, payload.data, payload.userId),
    onSuccess: (_: any, variables: { companyId: string; data: ServiceFormData; userId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['b2b:services', variables.companyId] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      companyId: string;
      serviceId: string;
      data: Partial<B2BService>;
    }) =>
      servicesService.updateService(payload.companyId, payload.serviceId, payload.data),
    onSuccess: (_: any, variables: { companyId: string; serviceId: string; data: Partial<B2BService> }) => {
      queryClient.invalidateQueries({
        queryKey: ['b2b:service', variables.companyId, variables.serviceId],
      });
      queryClient.invalidateQueries({ queryKey: ['b2b:services', variables.companyId] });
    },
  });
}

export function useUpdateServiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { companyId: string; serviceId: string; status: string }) =>
      servicesService.updateServiceStatus(
        payload.companyId,
        payload.serviceId,
        payload.status as any
      ),
    onSuccess: (_: any, variables: { companyId: string; serviceId: string; status: string }) => {
      queryClient.invalidateQueries({
        queryKey: ['b2b:service', variables.companyId, variables.serviceId],
      });
      queryClient.invalidateQueries({ queryKey: ['b2b:services', variables.companyId] });
    },
  });
}

// ============ VEHICLE HOOKS ============

export function useVehicles(companyId: string, serviceId: string) {
  const { data, ...rest } = useQuery({
    queryKey: ['b2b:vehicles', companyId, serviceId],
    queryFn: () => vehiclesService.fetchVehicles(companyId, serviceId),
    enabled: !!companyId && !!serviceId,
    staleTime: 3 * 60 * 1000,
  });
  
  return {
    vehicles: data || [],
    data: data || [],
    ...rest,
  };
}

export function useVehicleById(companyId: string, serviceId: string, vehicleId: string) {
  return useQuery({
    queryKey: ['b2b:vehicle', companyId, serviceId, vehicleId],
    queryFn: () => vehiclesService.fetchVehicleById(companyId, serviceId, vehicleId),
    enabled: !!companyId && !!serviceId && !!vehicleId,
    staleTime: 3 * 60 * 1000,
  });
}

export function useAddVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      companyId: string;
      serviceId: string;
      data: VehicleFormData;
      userId: string;
    }) =>
      vehiclesService.addVehicle(payload.companyId, payload.serviceId, payload.data, payload.userId),
    onSuccess: (_: any, variables: { companyId: string; serviceId: string; data: VehicleFormData; userId: string }) => {
      queryClient.invalidateQueries({
        queryKey: ['b2b:vehicles', variables.companyId, variables.serviceId],
      });
      // Recalculate service totals
      queryClient.invalidateQueries({
        queryKey: ['b2b:service', variables.companyId],
      });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      companyId: string;
      serviceId: string;
      vehicleId: string;
      data: Partial<VehicleFormData & { status: string }>;
    }) =>
      vehiclesService.updateVehicle(
        payload.companyId,
        payload.serviceId,
        payload.vehicleId,
        payload.data
      ),
    onSuccess: (_: any, variables: { companyId: string; serviceId: string; vehicleId: string; data: Partial<VehicleFormData & { status: string }> }) => {
      queryClient.invalidateQueries({
        queryKey: ['b2b:vehicles', variables.companyId, variables.serviceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['b2b:vehicle', variables.companyId, variables.serviceId, variables.vehicleId],
      });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      companyId: string;
      serviceId: string;
      vehicleId: string;
    }) =>
      vehiclesService.deleteVehicle(
        payload.companyId,
        payload.serviceId,
        payload.vehicleId
      ),
    onSuccess: (_: any, variables: { companyId: string; serviceId: string; vehicleId: string }) => {
      queryClient.invalidateQueries({
        queryKey: ['b2b:vehicles', variables.companyId, variables.serviceId],
      });
    },
  });
}

// ============ PRE-INSPECTION HOOKS ============

export function usePreInspections(companyId: string, serviceId: string, vehicleId: string) {
  const { data, ...rest } = useQuery({
    queryKey: ['b2b:preInspections', companyId, serviceId, vehicleId],
    queryFn: () =>
      preInspectionsService.fetchPreInspections(companyId, serviceId, vehicleId),
    enabled: !!companyId && !!serviceId && !!vehicleId,
    staleTime: 3 * 60 * 1000,
  });
  
  return {
    preInspections: data || [],
    data: data || [],
    ...rest,
  };
}

export function useCreatePreInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      companyId: string;
      serviceId: string;
      vehicleId: string;
      data: PreInspectionFormData;
      userId: string;
    }) =>
      preInspectionsService.createPreInspection(
        payload.companyId,
        payload.serviceId,
        payload.vehicleId,
        payload.data,
        payload.userId
      ),
    onSuccess: (_: any, variables: { companyId: string; serviceId: string; vehicleId: string; data: PreInspectionFormData; userId: string }) => {
      queryClient.invalidateQueries({
        queryKey: ['b2b:preInspections', variables.companyId, variables.serviceId, variables.vehicleId],
      });
    },
  });
}



// Referral hooks

// ============ REFERRAL HOOKS ============

export function useReferrals(companyId: string, serviceId: string) {
  const { data, ...rest } = useQuery({
    queryKey: ['b2b:referrals', companyId, serviceId],
    queryFn: () => referralsService.fetchReferrals(companyId, serviceId),
    enabled: !!companyId && !!serviceId,
    staleTime: 3 * 60 * 1000,
  });
  
  return {
    referrals: data || [],
    data: data || [],
    ...rest,
  };
}

export function useAddReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      companyId: string;
      serviceId: string;
      data: ReferralFormData;
      userId: string;
    }) => {
      console.log('[useAddReferral] Mutation function called with:', payload);
      return referralsService.createReferral(payload.companyId, payload.serviceId, payload.data, payload.userId);
    },
    onSuccess: (_: any, variables: { companyId: string; serviceId: string; data: ReferralFormData; userId: string }) => {
      console.log('[useAddReferral] Mutation successful, invalidating queries');
      queryClient.invalidateQueries({
        queryKey: ['b2b:referrals', variables.companyId, variables.serviceId],
      });
      // Recalculate totals
      queryClient.invalidateQueries({
        queryKey: ['b2b:service', variables.companyId],
      });
    },
    onError: (error: any) => {
      console.error('[useAddReferral] Mutation error:', error);
    },
  });
}

export function useUpdateReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      companyId: string;
      serviceId: string;
      referralId: string;
      data: Partial<ReferralFormData>;
    }) =>
      referralsService.updateReferral(
        payload.companyId,
        payload.serviceId,
        payload.referralId,
        payload.data
      ),
    onSuccess: (_: any, variables: { companyId: string; serviceId: string; referralId: string; data: Partial<ReferralFormData> }) => {
      queryClient.invalidateQueries({
        queryKey: ['b2b:referrals', variables.companyId, variables.serviceId],
      });
    },
    onError: (error: any) => {
      console.error('[useUpdateReferral] Mutation error:', error);
    },
  });
}

export function useDeleteReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      companyId: string;
      serviceId: string;
      referralId: string;
    }) =>
      referralsService.deleteReferral(
        payload.companyId,
        payload.serviceId,
        payload.referralId
      ),
    onSuccess: (_: any, variables: { companyId: string; serviceId: string; referralId: string }) => {
      queryClient.invalidateQueries({
        queryKey: ['b2b:referrals', variables.companyId, variables.serviceId],
      });
    },
    onError: (error: any) => {
      console.error('[useDeleteReferral] Mutation error:', error);
    },
  });
}

// ============ UTILITY HOOKS ============

/**
 * Calculate totals from vehicles and referrals
 */
export function useCalculateTotals(vehicles: B2BVehicle[], referrals: B2BReferral[]) {
  const vehicleSubtotal = vehicles.reduce((sum, v) => {
    // Only include services total if vehicle status is 'completed'
    if (v.status === 'completed' && v.services && Array.isArray(v.services)) {
      return sum + v.services.reduce((serviceSum, s) => serviceSum + (s.amount || 0), 0);
    }
    return sum;
  }, 0);

  const referralTotal = referrals.reduce((sum, r) => {
    // Only include commissions if referral status is 'completed'
    if (r.status === 'completed') {
      return sum + (r.commission || 0);
    }
    return sum;
  }, 0);

  return {
    subtotal: vehicleSubtotal,
    referralTotal: referralTotal,
    totalAmount: vehicleSubtotal + referralTotal,
  };
}

/**
 * Format date range for display
 */
export function useDateRangeDisplay(startDate?: Timestamp | Date, endDate?: Timestamp | Date) {
  return {
    startDate: startDate ? new Date(startDate as any) : null,
    endDate: endDate ? new Date(endDate as any) : null,
    display: startDate && endDate 
      ? `${new Date(startDate as any).toLocaleDateString()} - ${new Date(endDate as any).toLocaleDateString()}`
      : '',
  };
}

// ============ QUOTATIONS HOOKS ============

export function useQuotations(companyId: string, serviceId: string) {
  return useQuery({
    queryKey: ['b2b:quotations', companyId, serviceId],
    queryFn: () => quotationsService.fetchQuotations(companyId, serviceId),
    enabled: !!companyId && !!serviceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useQuotationById(companyId: string, serviceId: string, quotationId: string) {
  return useQuery({
    queryKey: ['b2b:quotation', companyId, serviceId, quotationId],
    queryFn: () => quotationsService.fetchQuotationById(companyId, serviceId, quotationId),
    enabled: !!companyId && !!serviceId && !!quotationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      companyId: string;
      serviceIds: string[];
      company: B2BCompany;
      services: B2BService[];
      serviceTotals?: Record<string, number>;
      userId: string;
    }) =>
      quotationsService.createQuotation(
        payload.companyId,
        payload.serviceIds,
        payload.company,
        payload.services,
        payload.userId,
        payload.serviceTotals
      ),
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['b2b:quotations', variables.companyId] });
    },
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      companyId: string;
      serviceId: string;
      quotationId: string;
      data: Partial<any>;
    }) =>
      quotationsService.updateQuotation(
        payload.companyId,
        payload.serviceId,
        payload.quotationId,
        payload.data
      ),
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({
        queryKey: ['b2b:quotations', variables.companyId, variables.serviceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['b2b:quotation', variables.companyId, variables.serviceId, variables.quotationId],
      });
    },
  });
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { companyId: string; serviceId: string; quotationId: string }) =>
      quotationsService.deleteQuotation(payload.companyId, payload.serviceId, payload.quotationId),
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({
        queryKey: ['b2b:quotations', variables.companyId, variables.serviceId],
      });
    },
  });
}

// ============ INVOICES HOOKS ============

export function useInvoices(companyId: string, serviceId: string) {
  return useQuery({
    queryKey: ['b2b:invoices', companyId, serviceId],
    queryFn: () => invoicesService.fetchInvoices(companyId, serviceId),
    enabled: !!companyId && !!serviceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvoiceById(companyId: string, serviceId: string, invoiceId: string) {
  return useQuery({
    queryKey: ['b2b:invoice', companyId, serviceId, invoiceId],
    queryFn: () => invoicesService.fetchInvoiceById(companyId, serviceId, invoiceId),
    enabled: !!companyId && !!serviceId && !!invoiceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      companyId: string;
      serviceId: string;
      quotation: any;
      userId: string;
    }) =>
      invoicesService.createInvoice(
        payload.companyId,
        payload.serviceId,
        payload.quotation,
        payload.userId
      ),
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({
        queryKey: ['b2b:invoices', variables.companyId, variables.serviceId],
      });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      companyId: string;
      serviceId: string;
      invoiceId: string;
      data: Partial<any>;
    }) =>
      invoicesService.updateInvoice(
        payload.companyId,
        payload.serviceId,
        payload.invoiceId,
        payload.data
      ),
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({
        queryKey: ['b2b:invoices', variables.companyId, variables.serviceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['b2b:invoice', variables.companyId, variables.serviceId, variables.invoiceId],
      });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { companyId: string; serviceId: string; invoiceId: string }) =>
      invoicesService.deleteInvoice(payload.companyId, payload.serviceId, payload.invoiceId),
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({
        queryKey: ['b2b:invoices', variables.companyId, variables.serviceId],
      });
    },
  });
}
