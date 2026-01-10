'use client';

import { use, useState, useEffect, useContext } from 'react';
import {
  useServiceById,
  useVehicles,
  useReferrals,
  useCompanyById,
  useCalculateTotals,
  useUpdateServiceStatus,
} from '@/hooks/useB2B';
import { batchUpdateServiceTotals } from '@/lib/firestore/b2b-service';
import { activityService } from '@/lib/firestore/activity-service';
import { VehicleList } from '@/components/admin/b2b/VehicleList';
import { ReferralList } from '@/components/admin/b2b/ReferralList';
import { ActivityHistoryModal } from '@/components/ActivityHistoryModal';
import { ActivityHistoryButton } from '@/components/ActivityHistoryButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { db } from '@/lib/firebase';
import { useUser } from '@/lib/userContext';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';

interface ServiceDetailPageProps {
  params: Promise<{
    id: string;
    serviceId: string;
  }>;
}

const EXPENSE_CATEGORIES = ['Car Parts & Accessories', 'Ceramic Coating Materials',  
  'Cleaning Supplies', 'Maintenance Supplies', 'Car Wash Materials', 'Polishing Materials',
  'Paints & Coatings', 'PPF Wrapping Materials', 'Tyres & Rims', 'Inspection Tools & Equipment', 
    'Fluids', 'Other'];

export default function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { id, serviceId } = use(params);
  const { role, user } = useUser();
  const isEmployeeRole = role === 'employee';
  const [showActivityHistory, setShowActivityHistory] = useState(false);
  const { data: service, isLoading: serviceLoading, refetch: refetchService } = useServiceById(
    id,
    serviceId
  );
  const { data: company } = useCompanyById(id);
  const { vehicles, isLoading: vehiclesLoading } = useVehicles(id, serviceId);
  const { referrals, isLoading: referralsLoading } = useReferrals(id, serviceId);
  const updateServiceStatus = useUpdateServiceStatus();
  const [newStatus, setNewStatus] = useState<string>('');

  // Expense state variables
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseFormData, setExpenseFormData] = useState({
    category: '',
    quantity: '',
    amount: '',
    description: '',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
  });

  const totals = useCalculateTotals(vehicles, referrals);

  // Refresh page when invoice is created from QuotationList
  useEffect(() => {
    const newInvoiceId = sessionStorage.getItem('newInvoiceId');
    if (newInvoiceId) {
      // Refetch service data to reflect changes
      refetchService();
      // Clear the sessionStorage key
      sessionStorage.removeItem('newInvoiceId');
    }
  }, [refetchService]);

  // Restrict access for employees
  if (isEmployeeRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to view this page.</p>
          <Link href="/admin">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Fetch expenses for this service
  useEffect(() => {
    if (!serviceId) return;
    const expenseQuery = query(
      collection(db, 'expenses'),
      where('serviceBookingId', '==', serviceId)
    );
    const unsubscribe = onSnapshot(
      expenseQuery,
      (snap) => {
        const expensesList = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setExpenses(expensesList);
      },
      (err) => {
        console.error('Expenses fetch error', err);
      }
    );

    return () => unsubscribe();
  }, [serviceId]);

  if (serviceLoading) {
    return <div className="p-8 text-center">Loading service details...</div>;
  }

  if (!service) {
    return <div className="p-8 text-center text-red-600">Service not found</div>;
  }

  // Expense handlers
  async function handleSaveExpense() {
    if (!serviceId || !expenseFormData.category || !expenseFormData.amount || !expenseFormData.date) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const expenseData = {
        serviceBookingId: serviceId,
        companyId: id,
        companyName: company?.name,
        category: expenseFormData.category,
        quantity: parseInt(expenseFormData.quantity) || 1,
        amount: parseFloat(expenseFormData.amount),
        description: expenseFormData.description,
        vendor: expenseFormData.vendor,
        date: new Date(expenseFormData.date),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      if (editingExpenseId) {
        await updateDoc(doc(db, 'expenses', editingExpenseId), {
          ...expenseData,
          updatedAt: Timestamp.now(),
        });
        await activityService.logActivity({
          companyId: id,
          activityType: 'service_updated',
          description: `Expense "${expenseFormData.category}" updated - AED ${expenseFormData.amount}`,
          userId: user?.uid || 'unknown',
          userName: user?.displayName || 'Unknown User',
          userEmail: user?.email || 'unknown@email.com',
          userRole: role || 'unknown',
          metadata: {
            serviceId: serviceId,
            expenseId: editingExpenseId,
            category: expenseFormData.category,
            amount: expenseFormData.amount, 
          },
        });
        alert('✓ Expense updated successfully');
      } else {
        const docRef = await addDoc(collection(db, 'expenses'), expenseData);
        await activityService.logActivity({
          companyId: id,
          activityType: 'service_updated',
          description: `Expense "${expenseFormData.category}" added - AED ${expenseFormData.amount}`,
          userId: user?.uid || 'unknown',
          userName: user?.displayName || 'Unknown User',
          userEmail: user?.email || 'unknown@email.com',
          userRole: role || 'unknown',
          metadata: {
            serviceId: serviceId,
            expenseId: docRef.id,
            category: expenseFormData.category,
            amount: expenseFormData.amount,
          },
        });
        alert('✓ Expense added successfully');
      }
      // Reset form
      setExpenseFormData({
        category: '',
        quantity: '',
        amount: '',
        description: '',
        vendor: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowExpenseForm(false);
      setEditingExpenseId(null);
    } catch (err) {
      console.error('Error saving expense:', err);
      alert('Failed to save expense');
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const expense = expenses.find(e => e.id === expenseId);
      await updateDoc(doc(db, 'expenses', expenseId), {
        deletedAt: Timestamp.now(),
      });
      await activityService.logActivity({
        companyId: id,
        activityType: 'service_updated',
        description: `Expense "${expense?.category}" deleted - AED ${expense?.amount}`,
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown User',
        userEmail: user?.email || 'unknown@email.com',
        userRole: role || 'unknown',
        metadata: {
          serviceId: serviceId,
          expenseId: expenseId,
          category: expense?.category,
          amount: expense?.amount,
        },
      });
      alert('✓ Expense deleted successfully');
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert('Failed to delete expense');
    }
  }

  function handleEditExpense(expense: any) {
    setEditingExpenseId(expense.id);
    setExpenseFormData({
      category: expense.category,
      quantity: expense.quantity?.toString() || '',
      amount: expense.amount?.toString() || '',
      description: expense.description || '',
      vendor: expense.vendor || '',
      date: expense.date ? new Date(expense.date.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setShowExpenseForm(true);
  }

  function cancelExpenseForm() {
    setShowExpenseForm(false);
    setEditingExpenseId(null);
    setExpenseFormData({
      category: '',
      quantity: '',
      amount: '',
      description: '',
      vendor: '',
      date: new Date().toISOString().split('T')[0],
    });
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

      // Log activity
      await activityService.logActivity({
        companyId: id,
        activityType: 'service_updated',
        description: `Service status changed to "${status}"`,
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown User',
        userEmail: user?.email || 'unknown@email.com',
        userRole: role || 'unknown',
        metadata: {
          serviceId: serviceId,
          newStatus: status,
        },
      });

      console.log('[ServiceDetail] Status updated, calculating totals');

      // If status is completed, also persist the calculated totals to the service document
      if (status === 'completed') {
        console.log('[ServiceDetail] Status is completed, persisting totals:', totals);
        await batchUpdateServiceTotals(id, serviceId, totals.subtotal, totals.referralTotal);
        console.log('[ServiceDetail] Totals persisted successfully');
      }

      setNewStatus(status);
      
      // Refetch service data to reflect changes
      await refetchService();
    } catch (error) {
      console.error('[ServiceDetail] Error updating status:', error);
    }
  };

  return (
    <div className="container mx-auto pb-8 px-2 md:px-4">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link href={`/admin/b2b-booking/companies/${id}`}>
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
              <ChevronLeft size={16} />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">{service.title}</h1>
            <p className="text-sm sm:text-base text-gray-600">Service ID: {serviceId}</p>
          </div>
        </div>
        <div className='flex justify-between border border-blue-200 p-2 rounded-xl items-center gap-4'>
          <div className="bg-blue-100 dark:bg-gray-800 rounded-lg px-4 py-2 flex items-center justify-center sm:justify-start">
            <p className="text-sm sm:text-base">Job Card: <span className="font-semibold">{service.jobCardNo}</span></p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs sm:text-sm text-gray-600">Total Service Amount</p>
            <p className="text-2xl sm:text-3xl font-bold">AED {totals.totalAmount.toLocaleString('en-AE')}</p>
          </div>
        </div>
      </div>

      {/* Service Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm">Company</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base sm:text-lg font-semibold">{company?.name || 'N/A'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm">Service Type: <span className="text-sm sm:text-base uppercase">{service.type}</span></CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs">Notes: <span className="text-sm sm:text-base">{service.notes}</span></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm">Service Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base sm:text-lg font-semibold">
              {(() => {
                const date = new Date(
                  service.serviceDate instanceof Date
                    ? service.serviceDate
                    : (service.serviceDate as any).toDate()
                );
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
              })()}
            </p>
          </CardContent>
        </Card>

        

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Status</CardTitle>

              {service.status !== 'completed' && (
                
                <div className="group relative cursor-help">
                  <div className="w-4 h-4 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs font-bold">!</div>
                  <div className="absolute -top-3 -left-2 md:left-1/3 transform translate-x-1/2  px-3 py-2 bg-yellow-600 text-white text-xs rounded-lg whitespace-nowrap  transition-opacity pointer-events-none z-50 animate-pulse">
                    Select 'Completed' when done
                  </div>
                </div>
              )} 
            </div>
          </CardHeader>
          <CardContent>
            <Select value={service.status} onValueChange={handleStatusChange} disabled={isEmployeeRole}>
              <SelectTrigger className={`w-full h-10 ${isEmployeeRole ? 'opacity-60 cursor-not-allowed' : ''}`}>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Vehicle Services Total</p>
              <p className="text-lg sm:text-2xl font-bold">AED {totals.subtotal.toLocaleString('en-AE')}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Referral Commissions</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600">
                AED {totals.referralTotal.toLocaleString('en-AE')}
              </p>
            </div>
            <div className="border-l-2 pl-4 sm:pl-6">
              <p className="text-xs sm:text-sm text-gray-600">Service Total</p>
              <p className="text-xl sm:text-3xl font-bold">AED {totals.totalAmount.toLocaleString('en-AE')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      

      {/* Vehicles Section */}
      <section className="mb-6" id='vehiclesList'>
        <VehicleList
          companyId={id}
          serviceId={serviceId}
          vehicles={vehicles}
          isLoading={vehiclesLoading}
          onRefresh={() => refetchService()}
          disabled={isEmployeeRole}
        />
      </section>

      

      {/* Referrals Section */}
      <section className="mb-6" id='referralsList'>
        <ReferralList
          companyId={id}
          serviceId={serviceId}
          jobCardNo={service.jobCardNo}
          referrals={referrals}
          vehicleIds={vehicles.map((v: any) => v.id)}
          isLoading={referralsLoading}
          onRefresh={() => refetchService()}
          disabled={isEmployeeRole}
        />
      </section>


      {/* Expenses Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Expenses</CardTitle>
            <Button
              size="sm"
              variant={showExpenseForm ? 'default' : 'outline'}
              onClick={() => {
                if (editingExpenseId) {
                  cancelExpenseForm();
                } else {
                  setShowExpenseForm(!showExpenseForm);
                }
              }}
              className="text-xs w-full sm:w-auto"
            >
              {showExpenseForm ? 'Close' : '+ Add Expense'}
            </Button>
          </div>
        </CardHeader>

        {/* Expense Form Modal */}
        {showExpenseForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
              {/* Modal Header */}
              <div className="sticky top-0 flex items-start sm:items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 p-4 sm:p-6 border-b border-blue-500/20 gap-2">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {editingExpenseId ? '✏️ Edit Expense' : '➕ Add New Expense'}
                  </h3>
                  <p className="text-blue-100 text-xs sm:text-sm mt-1">
                    {editingExpenseId ? 'Update expense details' : 'Record a new expense for this service'}
                  </p>
                </div>
                <button
                  onClick={cancelExpenseForm}
                  className="text-white hover:bg-blue-500/20 p-2 rounded-lg transition-colors duration-200"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <form className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Category Row */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    📁 Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={expenseFormData.category}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                    className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-sm dark:bg-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors duration-200"
                  >
                    <option value="">Select a category</option>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    📝 Description
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Engine oil, brake pads, etc."
                    value={expenseFormData.description}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                    className="border-2 border-gray-300 dark:border-gray-600 h-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors duration-200"
                  />
                </div>

                {/* Amount & Quantity Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      📦 Quantity
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 2"
                      value={expenseFormData.quantity}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, quantity: e.target.value })}
                      className="border-2 border-gray-300 dark:border-gray-600 h-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      💰 Amount (AED) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 250.00"
                      value={expenseFormData.amount}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                      className="border-2 border-gray-300 dark:border-gray-600 h-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors duration-200"
                    />
                  </div>
                </div>

                

                {/* Vendor & Date Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      🏪 Vendor/Supplier
                    </label>
                    <Input
                      type="text"
                      placeholder="Supplier name (optional)"
                      value={expenseFormData.vendor}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, vendor: e.target.value })}
                      className="border-2 border-gray-300 dark:border-gray-600 h-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      📅 Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={expenseFormData.date}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                      className="border-2 border-gray-300 dark:border-gray-600 h-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors duration-200"
                    />
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <span className="font-semibold">💡 Tip:</span> This expense will be automatically added to your expense report and reflected in the financial summaries.
                  </p>
                </div>
              </form>

              {/* Modal Footer */}
              <div className="sticky bottom-0 flex flex-col sm:flex-row gap-2 sm:gap-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <Button
                  type="button"
                  onClick={cancelExpenseForm}
                  variant="outline"
                  className="w-full sm:flex-1 h-10 sm:h-12 border-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveExpense}
                  className="w-full sm:flex-1 h-10 sm:h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {editingExpenseId ? '💾 Update Expense' : '💾 Save Expense'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Expenses Table */}
        <CardContent>
          {expenses.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:-mx-6 md:mx-0">
              <table className="w-full text-xs sm:text-sm">
                <thead className="border-b bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-600 dark:text-gray-300">Category</th>
                    <th className="hidden sm:table-cell text-left py-2 px-2 sm:px-3 font-semibold text-gray-600 dark:text-gray-300">Company</th>
                    <th className="hidden md:table-cell text-center py-2 px-2 sm:px-3 font-semibold text-gray-600 dark:text-gray-300">Qty</th>
                    <th className="text-right py-2 px-2 sm:px-3 font-semibold text-gray-600 dark:text-gray-300">Amount</th>
                    <th className="hidden lg:table-cell text-left py-2 px-2 sm:px-3 font-semibold text-gray-600 dark:text-gray-300">Description</th>
                    <th className="hidden md:table-cell text-left py-2 px-2 sm:px-3 font-semibold text-gray-600 dark:text-gray-300">Vendor</th>
                    <th className="hidden md:table-cell text-left py-2 px-2 sm:px-3 font-semibold text-gray-600 dark:text-gray-300">Date</th>
                    {service.status !== 'completed' && service.status !== 'cancelled' && (
                      <th className="text-center py-2 px-2 sm:px-3 font-semibold text-gray-600 dark:text-gray-300">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {expenses
                    .filter((exp: any) => !exp.deletedAt)
                    .map((expense: any, idx: number) => (
                      <tr key={expense.id || idx} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-3 px-2 sm:px-3">
                          <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-medium whitespace-nowrap">
                            {expense.category}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell py-3 px-2 sm:px-3 text-left text-gray-700 dark:text-gray-300 text-xs">
                          {company?.name || 'N/A'}
                        </td>
                        <td className="hidden md:table-cell py-3 px-2 sm:px-3 text-center text-gray-700 dark:text-gray-300 text-xs">
                          {expense.quantity || 1}
                        </td>
                        <td className="py-3 px-2 sm:px-3 text-right font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                          AED {(expense.amount || 0).toFixed(2)}
                        </td>
                        <td className="hidden lg:table-cell py-3 px-2 sm:px-3 text-gray-700 dark:text-gray-300 truncate max-w-xs" title={expense.description}>
                          {expense.description || '-'}
                        </td>
                        <td className="hidden md:table-cell py-3 px-2 sm:px-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap" title={expense.vendor}>
                          {expense.vendor || '-'}
                        </td>
                        <td className="hidden md:table-cell py-3 px-2 sm:px-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">
                          {expense.date
                            ? (() => {
                                const date = new Date(
                                  expense.date.seconds ? expense.date.seconds * 1000 : expense.date
                                );
                                const day = String(date.getDate()).padStart(2, '0');
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const year = date.getFullYear();
                                return `${day}/${month}/${year}`;
                              })()
                            : '-'}
                        </td>
                        {service.status !== 'completed' && service.status !== 'cancelled' && (
                          <td className="py-3 px-2 sm:px-3 text-center">
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => handleEditExpense(expense)}
                                className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm sm:text-xs"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition-colors text-sm sm:text-xs"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
              {showExpenseForm ? 'No expenses yet. Add one below.' : 'No expenses added yet.'}
            </div>
          )}

          {/* Total Expenses */}
          {expenses.length > 0 && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Total Expenses:</span>
                <span className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                  AED{' '}
                  {expenses
                    .filter((exp: any) => !exp.deletedAt)
                    .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Activity History Button */}
      <ActivityHistoryButton onClick={() => setShowActivityHistory(true)} />

      {/* Activity History Modal */}
      <ActivityHistoryModal
        companyId={id}
        isOpen={showActivityHistory}
        onClose={() => setShowActivityHistory(false)}
      />
    </div>
  );
}
