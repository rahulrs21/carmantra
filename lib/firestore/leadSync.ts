import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { findOrCreateCustomer } from '@/lib/firestore/customers';
import { safeConsoleError } from '@/lib/safeConsole';

// Background sync: watch for new leads and auto-create customers
let syncRunning = false;
let lastProcessedId: string | null = null;

export function startLeadCustomerSync() {
  if (syncRunning) return;
  syncRunning = true;

  const q = query(collection(db, 'crm-leads'), orderBy('createdAt', 'desc'));
  
  onSnapshot(q, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added') {
        const doc = change.doc;
        if (lastProcessedId === doc.id) continue; // Skip if already processed
        
        const data = doc.data();
        if (data.email || data.phone) {
          try {
            await findOrCreateCustomer({
              firstName: data.name || '',
              email: data.email || '',
              mobile: data.phone || '',
            });
            lastProcessedId = doc.id;
          } catch (err) {
            safeConsoleError('Lead customer sync error', err);
          }
        }
      }
    }
  }, (err) => {
    safeConsoleError('Lead sync listener error', err);
  });
}
