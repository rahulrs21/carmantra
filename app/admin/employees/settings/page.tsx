"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, addDoc, query, onSnapshot, deleteDoc, Timestamp } from 'firebase/firestore';
import { Holiday, SalarySettings } from '@/lib/types';
import { useUser } from '@/lib/userContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Settings, Plus, Trash2, Shield } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ModuleAccess, PermissionGate, ModuleAccessComponent } from '@/components/PermissionGate';

export default function SettingsPage() {
  const { role: currentRole } = useUser();
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('holidays');
  const [salarySettings, setSalarySettings] = useState<SalarySettings | null>(null);

  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    type: 'national' as 'national' | 'regional' | 'company',
  });

  const [workDays, setWorkDays] = useState({
    Monday: true,
    Tuesday: true,
    Wednesday: true,
    Thursday: true,
    Friday: true,
    Saturday: false,
    Sunday: false,
  });

  const [leaveBalance, setLeaveBalance] = useState({
    casual: 12,
    sick: 5,
    earned: 18,
    unpaid: 0,
    maternity: 180,
    paternity: 15,
  });

  const isAuthorized = currentRole === 'admin' || currentRole === 'manager';

  // Fetch holidays
  useEffect(() => {
    const q = query(collection(db, 'holidays'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Holiday[];
      setHolidays(data);
    });

    return () => unsubscribe();
  }, []);

  // Fetch salary settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsRef = doc(db, 'settings', 'salary');
        const settingsDoc = await getDoc(settingsRef);
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data() as SalarySettings;
          setSalarySettings(settings);
          setLeaveBalance(settings.defaultLeaveBalance as any);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching settings:', error);
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthorized) {
      toast.error('You do not have permission to manage settings');
      return;
    }

    if (!holidayForm.name || !holidayForm.date) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, 'holidays'), {
        name: holidayForm.name,
        date: Timestamp.fromDate(new Date(holidayForm.date)),
        type: holidayForm.type,
        createdAt: Timestamp.now(),
      });

      toast.success('Holiday added');
      setHolidayForm({ name: '', date: '', type: 'national' });
      setIsHolidayDialogOpen(false);
    } catch (error: any) {
      console.error('Error adding holiday:', error);
      toast.error('Failed to add holiday');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    if (!isAuthorized) {
      toast.error('You do not have permission to delete holidays');
      return;
    }

    if (!confirm('Are you sure you want to delete this holiday?')) return;

    try {
      await deleteDoc(doc(db, 'holidays', holidayId));
      toast.success('Holiday deleted');
    } catch (error: any) {
      console.error('Error deleting holiday:', error);
      toast.error('Failed to delete holiday');
    }
  };

  const handleSaveSettings = async () => {
    if (!isAuthorized) {
      toast.error('You do not have permission to update settings');
      return;
    }

    setSubmitting(true);

    try {
      const settingsRef = doc(db, 'settings', 'salary');
      await setDoc(settingsRef, {
        workDays: Object.keys(workDays).filter(day => workDays[day as keyof typeof workDays]),
        defaultLeaveBalance: leaveBalance,
        updatedAt: Timestamp.now(),
      });

      toast.success('Settings saved');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don&apos;t have permission to access employee settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ModuleAccessComponent module={ModuleAccess.EMPLOYEES}>
      <div className="space-y-6 pb-20 sm:pb-6">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">Configure employee module settings</p>
        </header>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="flex border-b overflow-x-auto">
            {['holidays', 'workdays', 'leavebalance'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'holidays' && 'Holidays'}
                {tab === 'workdays' && 'Work Days'}
                {tab === 'leavebalance' && 'Leave Balance'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Holidays Tab */}
            {activeTab === 'holidays' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">Company Holidays</h3>
                  <Button onClick={() => setIsHolidayDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Holiday
                  </Button>
                </div>

                {holidays.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No holidays configured</p>
                ) : (
                  <div className="space-y-3">
                    {holidays.map((holiday) => {
                      const date = holiday.date?.toDate?.() || new Date(holiday.date);
                      return (
                        <div key={holiday.id} className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{holiday.name}</h4>
                            <p className="text-sm text-gray-600">
                              {date.toLocaleDateString('en-IN')} • {holiday.type}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteHoliday(holiday.id!)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Work Days Tab */}
            {activeTab === 'workdays' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-4">Select Work Days</h3>
                  <div className="space-y-3">
                    {Object.entries(workDays).map(([day, isWork]) => (
                      <div key={day} className="flex items-center space-x-3">
                        <Checkbox
                          checked={isWork}
                          onCheckedChange={(checked) =>
                            setWorkDays(prev => ({ ...prev, [day]: checked }))
                          }
                        />
                        <Label className="font-medium cursor-pointer">{day}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={handleSaveSettings} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 w-full">
                  {submitting ? 'Saving...' : 'Save Work Days'}
                </Button>
              </div>
            )}

            {/* Leave Balance Tab */}
            {activeTab === 'leavebalance' && (
              <div className="space-y-6">
                <p className="text-gray-600">Set default leave balance for new employees</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(leaveBalance).map(([type, days]) => (
                    <div key={type} className="space-y-2">
                      <Label htmlFor={type} className="capitalize">
                        {type} Leave (Days)
                      </Label>
                      <Input
                        id={type}
                        type="number"
                        value={days}
                        onChange={(e) =>
                          setLeaveBalance(prev => ({
                            ...prev,
                            [type]: parseInt(e.target.value) || 0,
                          }))
                        }
                        min="0"
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={handleSaveSettings} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 w-full">
                  {submitting ? 'Saving...' : 'Save Leave Balance'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Holiday Dialog */}
        <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Add Holiday</DialogTitle>
              <DialogDescription>
                Add a new company holiday
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddHoliday}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Holiday Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Independence Day"
                    value={holidayForm.name}
                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    value={holidayForm.type}
                    onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="national">National</option>
                    <option value="regional">Regional</option>
                    <option value="company">Company</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsHolidayDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Holiday'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleAccessComponent>
  );
}
