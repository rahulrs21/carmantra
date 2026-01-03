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

// =============== B2B BOOKING SERVICE MODULE ===============

export interface B2BCompany {
  id?: ID;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  contactPerson: string;
  companyVat?: string;
  companyCode?: string;
  address?: string;
  city?: string;
  country?: string;
  state?: string;
  status: 'active' | 'inactive';
  createdAt?: any;
  updatedAt?: any;
}

export interface B2BVehicle {
  id?: ID;
  companyId: string;
  vehicleBrand: string;
  modelName: string;
  numberPlate: string;
  vin?: string;
  fuelType?: string;
  vehicleType?: string;
  color?: string;
  year?: number;
  status: 'active' | 'inactive';
  preInspection?: PreInspectionData;
  referral?: ReferralInfo;
  createdAt?: any;
  updatedAt?: any;
}

export interface B2BService {
  id?: ID;
  vehicleId: string;
  companyId: string;
  category: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  scheduledDate?: any;
  completedDate?: any;
  amount?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface PreInspectionData {
  message?: string;
  images?: string[];
  videos?: string[];
  inspectionDate?: any;
}

export interface ReferralInfo {
  referralContact?: string;
  referralPhone?: string;
  referralEmail?: string;
  commissionRate?: number;
  totalCommission?: number;
  notes?: string;
}

export interface B2BVehicleDetail extends B2BVehicle {
  preInspection?: PreInspectionData;
  referral?: ReferralInfo;
  services?: B2BService[];
}

// =============== USER & PERMISSIONS ===============

export type UserRole = 'admin' | 'manager' | 'sales' | 'support' | 'viewer' | 'employee';

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

// =============== EMPLOYEE MANAGEMENT ===============

export interface Employee {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  department: string;
  position: string;
  joiningDate: any;
  salary: number; // Base salary
  photoURL?: string;
  status: 'active' | 'inactive';
  userId?: string; // Link to Users module (optional)
  createdAt?: any;
  updatedAt?: any;
}

export interface AttendanceRecord {
  employeeId: string;
  date: any;
  status: 'present' | 'absent' | 'leave' | 'holiday' | 'halfday';
  leaveId?: string; // Reference to leave record if status is 'leave'
  remarks?: string;
}

export interface LeaveRequest {
  id?: string;
  employeeId: string;
  type: 'casual' | 'sick' | 'earned' | 'unpaid' | 'maternity' | 'paternity';
  startDate: any;
  endDate: any;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  approvedBy?: string; // Admin UID
  appliedAt?: any;
  approvedAt?: any;
}

export interface LeaveBalance {
  employeeId: string;
  year: number;
  casual: number;
  sick: number;
  earned: number;
  unpaid: number;
  maternity: number;
  paternity: number;
}

export interface SalaryRecord {
  id?: string;
  employeeId: string;
  month: string; // YYYY-MM format
  baseSalary: number;
  allowances?: Record<string, number>; // { DA: 5000, HRA: 3000 }
  deductions?: Record<string, number>; // { tax: 5000, loan: 1000 }
  netSalary: number;
  status: 'pending' | 'approved' | 'paid';
  paidDate?: any;
  remarks?: string;
  createdAt?: any;
}

export interface SalarySettings {
  id?: string;
  allowanceTypes: Array<{ name: string; percentage?: number; amount?: number }>;
  deductionTypes: Array<{ name: string; percentage?: number; fixed?: number }>;
  defaultLeaveBalance: Partial<LeaveBalance>;
  workDays: string[]; // ['Monday', 'Tuesday', ...]
  updatedAt?: any;
}

export interface Holiday {
  id?: string;
  name: string;
  date: any;
  type: 'national' | 'regional' | 'company';
  description?: string;
  createdAt?: any;
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
    { module: 'b2b-booking', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'accounts', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'tasks', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'users', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'employees', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'attendance', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'leaves', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'salary', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employee-leaves', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'employee-salary', canView: true, canCreate: true, canEdit: true, canDelete: true },
  ],
  manager: [
    { module: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'leads', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'customers', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'services', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'invoices', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'quotations', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'b2b-booking', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'accounts', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'tasks', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'users', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employees', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'attendance', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'leaves', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'salary', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employee-leaves', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'employee-salary', canView: true, canCreate: true, canEdit: true, canDelete: false },
  ],
  sales: [
    { module: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'leads', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'customers', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'services', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'invoices', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'quotations', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'b2b-booking', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'accounts', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'tasks', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'users', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employees', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'attendance', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'leaves', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'salary', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employee-leaves', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employee-salary', canView: false, canCreate: false, canEdit: false, canDelete: false },
  ],
  support: [
    { module: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'leads', canView: true, canCreate: false, canEdit: true, canDelete: false },
    { module: 'customers', canView: true, canCreate: false, canEdit: true, canDelete: false },
    { module: 'services', canView: true, canCreate: false, canEdit: true, canDelete: false },
    { module: 'invoices', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'quotations', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'b2b-booking', canView: true, canCreate: false, canEdit: true, canDelete: false },
    { module: 'accounts', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'tasks', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'users', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employees', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'attendance', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'leaves', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'salary', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employee-leaves', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employee-salary', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employee-tasks', canView: false, canCreate: false, canEdit: false, canDelete: false },
  ],
  viewer: [
    { module: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'leads', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'customers', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'services', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'invoices', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'quotations', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'b2b-booking', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'accounts', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'tasks', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'users', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employees', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'attendance', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'leaves', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'salary', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employee-leaves', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employee-salary', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employee-tasks', canView: false, canCreate: false, canEdit: false, canDelete: false },
  ],
  employee: [
    { module: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'leads', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'customers', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'services', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'invoices', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'quotations', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { module: 'b2b-booking', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'accounts', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'tasks', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'users', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employees', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'attendance', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'leaves', canView: true, canCreate: true, canEdit: false, canDelete: false },
    { module: 'salary', canView: true, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employee-leaves', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employee-salary', canView: false, canCreate: false, canEdit: false, canDelete: false },
    { module: 'employee-tasks', canView: true, canCreate: false, canEdit: true, canDelete: false },
  ],
};
