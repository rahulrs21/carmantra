export type ID = string;

export interface Customer {
  id?: ID;
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
}

export interface InvoiceDoc {
  id?: ID;
  customerName?: string;
  customerEmail?: string;
  total?: number;
  createdAt?: any;
  vehicleDetails?: {
    type?: string;
    brand?: string;
    model?: string;
    plate?: string;
  };
}
