import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { findOrCreateCustomer } from './customers';

// Comprehensive sync function to import from all modules
export async function syncAllModulesToCustomers() {
  console.log('Starting comprehensive sync from all modules...');
  
  try {
    let totalSynced = 0;
    let totalSkipped = 0;
    
    // 1. Sync from bookedServices
    const bookingsSnap = await getDocs(collection(db, 'bookedServices'));
    console.log(`Found ${bookingsSnap.size} bookings`);
    for (const docSnap of bookingsSnap.docs) {
      const booking = docSnap.data();
      if (!booking.email && !booking.mobileNo) {
        totalSkipped++;
        continue;
      }
      await findOrCreateCustomer({
        firstName: booking.firstName,
        lastName: booking.lastName,
        email: booking.email,
        mobile: booking.mobileNo,
        address: booking.address,
        city: booking.city,
        country: booking.country,
        state: booking.state,
      });
      totalSynced++;
    }
    
    // 2. Sync from crm-leads
    const leadsSnap = await getDocs(collection(db, 'crm-leads'));
    console.log(`Found ${leadsSnap.size} leads`);
    for (const docSnap of leadsSnap.docs) {
      const lead = docSnap.data();
      if (!lead.email && !lead.phone) {
        totalSkipped++;
        continue;
      }
      await findOrCreateCustomer({
        firstName: lead.name?.split(' ')[0] || lead.name,
        lastName: lead.name?.split(' ').slice(1).join(' '),
        email: lead.email,
        mobile: lead.phone,
      });
      totalSynced++;
    }
    
    // 3. Sync from invoices
    const invoicesSnap = await getDocs(collection(db, 'invoices'));
    console.log(`Found ${invoicesSnap.size} invoices`);
    for (const docSnap of invoicesSnap.docs) {
      const invoice = docSnap.data();
      if (!invoice.customerEmail) {
        totalSkipped++;
        continue;
      }
      await findOrCreateCustomer({
        firstName: invoice.customerName?.split(' ')[0],
        lastName: invoice.customerName?.split(' ').slice(1).join(' '),
        email: invoice.customerEmail,
        mobile: invoice.customerPhone,
      });
      totalSynced++;
    }
    
    // 4. Sync from quotations
    const quotationsSnap = await getDocs(collection(db, 'quotations'));
    console.log(`Found ${quotationsSnap.size} quotations`);
    for (const docSnap of quotationsSnap.docs) {
      const quotation = docSnap.data();
      if (!quotation.email && !quotation.phone) {
        totalSkipped++;
        continue;
      }
      await findOrCreateCustomer({
        firstName: quotation.customerName?.split(' ')[0] || quotation.name,
        lastName: quotation.customerName?.split(' ').slice(1).join(' '),
        email: quotation.email,
        mobile: quotation.phone,
      });
      totalSynced++;
    }
    
    console.log(`Sync complete! Synced: ${totalSynced}, Skipped: ${totalSkipped}`);
    return { synced: totalSynced, skipped: totalSkipped };
  } catch (error) {
    console.error('Error syncing all modules:', error);
    throw error;
  }
}

// Legacy function name for compatibility
export async function syncExistingBookingsToCustomers() {
  return syncAllModulesToCustomers();
}
