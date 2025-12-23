export type ID = string;

export interface Customer {
  id?: ID;
  customerType?: 'b2c' | 'b2b';
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  servicesHistory?: string;
  firstName: string;
  lastName?: string;
  email: string;
  mobile: string;
  status: 'active' | 'inactive';
  address?: string;
  city?: string;
  country?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Vehicle {
  id?: ID;
  make: string;
  model: string;
  year?: number;
  plate: string;
  vin?: string;
  color?: string;
  fuelType?: string;
  createdAt?: any;
  services?: Array<{
    id: string;
    category: string;
    status: string;
    scheduledDate: any;
    jobCardNo?: string;
  }>;
}

export interface Note {
  id?: ID;
  message: string;
  authorUid?: string;
  createdAt?: any;
}

export interface ServiceBooking {
  id?: ID;
  customerType?: 'b2c' | 'b2b';
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  servicesHistory?: string;
  jobCardNo?: string;
  category?: string;
  firstName?: string;
  lastName?: string;
  mobileNo?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  state?: string;
  scheduledDate?: any;
  status?: string;
  vehicleBrand?: string;
  modelName?: string;
  numberPlate?: string;
  fuelType?: string;
  vehicleType?: string;
  vinNumber?: string;
  vehicleCount?: number;
  vehicles?: Array<{
    vehicleType?: string;
    vehicleBrand?: string;
    modelName?: string;
    numberPlate?: string;
    fuelType?: string;
    vinNumber?: string;
    category?: string;
  }>;
}
export interface InvoiceDoc {
  id?: ID;
  customerType?: 'b2c' | 'b2b';
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  customerName?: string;
  customerEmail?: string;
  customerMobile?: string;
  total?: number;
  createdAt?: any;
  vehicleDetails?: {
    type?: string;
    brand?: string;
    model?: string;
    plate?: string;
    vin?: string;
  };
}

export type UserRole = 'admin' | 'manager' | 'sales' | 'support' | 'viewer';

export interface Permission {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface UserAccount {
  id?: string;
  email: string;
  role: UserRole;
  displayName?: string;
  photoURL?: string;
  isOnline?: boolean;
  status: 'active' | 'inactive' | 'pending';
  permissions?: Permission[];
  createdAt?: any;
  createdBy?: string;
  lastLogin?: any;
  inviteToken?: string;
  inviteExpires?: any;
}

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    { module: 'dashboard', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'leads', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'customers', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'services', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'invoices', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'quotations', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'users', canView: true, canCreate: true, canEdit: true, canDelete: true },
  ],
  manager: [
    { module: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'leads', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'customers', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'services', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'invoices', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'quotations', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'users', canView: true, canCreate: false, canEdit: false, canDelete: false },
  ],
  sales: [
    { module: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'leads', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'customers', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'services', canView: true, canCreate: true, canEdit: false, canDelete: false },
    { module: 'invoices', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'quotations', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'users', canView: false, canCreate: false, canEdit: false, canDelete: false },
  ],
  support: [
    { module: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'leads', canView: true, canCreate: false, canEdit: true, canDelete: false },
    { module: 'customers', canView: true, canCreate: false, canEdit: true, canDelete: false },
    { module: 'services', canView: true, canCreate: false, canEdit: true, canDelete: false },
    { module: 'invoices', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'quotations', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'users', canView: false, canCreate: false, canEdit: false, canDelete: false },
  ],
  viewer: [
    { module: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'leads', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'customers', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'services', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'invoices', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'quotations', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'users', canView: false, canCreate: false, canEdit: false, canDelete: false },
  ],
};
