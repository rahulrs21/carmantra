export type ActivityType = 
  | 'company_created'
  | 'company_updated'
  | 'company_deleted'
  | 'vehicle_deleted'
  | 'service_created'
  | 'service_updated'
  | 'service_deleted'
  | 'quotation_email_sent'
  | 'service_status_changed'
  | 'quotation_created'
  | 'quotation_updated'
  | 'quotation_deleted'
  | 'invoice_created'
  | 'invoice_updated'
  | 'invoice_deleted'
  | 'email_sent'
  | 'referral_added'
  | 'referral_updated'
  | 'referral_deleted';

export interface ActivityLog {
  id: string;
  companyId: string;
  activityType: ActivityType;
  description: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  timestamp: Date;
  metadata?: {
    serviceId?: string;
    quotationId?: string;
    invoiceId?: string;
    referralId?: string;
    [key: string]: any;
  };
}

export interface ActivityLogInput {
  companyId: string;
  activityType: ActivityType;
  description: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  metadata?: ActivityLog['metadata'];
}
