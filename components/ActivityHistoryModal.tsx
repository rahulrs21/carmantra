'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ActivityLog } from '@/lib/types/activity.types';
import { activityService } from '@/lib/firestore/activity-service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { History, Loader2, ChevronDown, ChevronUp, X, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface ActivityHistoryModalProps {
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
}

const ACTIVITY_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  company_created: { label: 'Company Created', color: 'bg-blue-100 text-blue-800', icon: '✨' },
  company_updated: { label: 'Company Updated', color: 'bg-blue-50 text-blue-700', icon: '✏️' },
  company_deleted: { label: 'Company Deleted', color: 'bg-red-100 text-red-800', icon: '🗑️' },
  vehicle_deleted: { label: 'Vehicle Deleted', color: 'bg-red-100 text-red-800', icon: '🗑️' },
  service_created: { label: 'Service Created', color: 'bg-green-100 text-green-800', icon: '➕' },
  service_updated: { label: 'Service Updated', color: 'bg-green-50 text-green-700', icon: '✏️' },
  service_deleted: { label: 'Service Deleted', color: 'bg-red-100 text-red-800', icon: '🗑️' },
  quotation_created: { label: 'Quotation Created', color: 'bg-purple-100 text-purple-800', icon: '📄' },
  quotation_updated: { label: 'Quotation Updated', color: 'bg-purple-50 text-purple-700', icon: '✏️' },
  quotation_deleted: { label: 'Quotation Deleted', color: 'bg-red-100 text-red-800', icon: '🗑️' },
  invoice_created: { label: 'Invoice Created', color: 'bg-indigo-100 text-indigo-800', icon: '💰' },
  invoice_updated: { label: 'Invoice Updated', color: 'bg-indigo-50 text-indigo-700', icon: '✏️' },
  invoice_deleted: { label: 'Invoice Deleted', color: 'bg-red-100 text-red-800', icon: '🗑️' },
  email_sent: { label: 'Email Sent', color: 'bg-yellow-100 text-yellow-800', icon: '📧' },
  referral_added: { label: 'Referral Added', color: 'bg-cyan-100 text-cyan-800', icon: '👥' },
  referral_updated: { label: 'Referral Updated', color: 'bg-cyan-50 text-cyan-700', icon: '✏️' },
  referral_deleted: { label: 'Referral Deleted', color: 'bg-red-100 text-red-800', icon: '🗑️' },
};

const formatDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getActivityLink = (activity: ActivityLog, companyId: string): string | null => {
  const { activityType, metadata } = activity;

  // Service links under vehicle 
  if (activity.description.toLowerCase().includes('service') && activityType.includes('vehicle')) {
    if (metadata?.serviceId) {
      return `/admin/b2b-booking/companies/${companyId}/services/${metadata.serviceId}/vehicles/${metadata.vehicleId}`;
    } 
  }

  // Assigned Task links
  if (activity.description.toLowerCase().includes('task')) {
    if (metadata?.serviceId) {
      return `/admin/b2b-booking/companies/${companyId}/services/${metadata.serviceId}/vehicles/${metadata.vehicleId}`;
    } 
  }

  // PreInspection 
  if (activity.description.toLowerCase().includes('pre-inspection')) {
    if (metadata?.serviceId) {
      return `/admin/b2b-booking/companies/${companyId}/services/${metadata.serviceId}/vehicles/${metadata.vehicleId}`;
    } 
  }

  // Vehicle Status links under Vehicle ID
  if (activity.description.toLowerCase().includes('vehicle') && activity.description.toLowerCase().includes('status')) {
    if (metadata?.vehicleId) {
      return `/admin/b2b-booking/companies/${companyId}/services/${metadata.serviceId}/vehicles/${metadata.vehicleId}#vehiclesList`;
    } 
  }

  // Service links
  if (activity.description.toLowerCase().includes('service')) {
    if (metadata?.serviceId) {
      return `/admin/b2b-booking/companies/${companyId}/services/${metadata.serviceId}`;
    }
  }

  // Vehicle links 
  if (activity.description.toLowerCase().includes('vehicle')) {
    if (metadata?.vehicleId) {
      return `/admin/b2b-booking/companies/${companyId}/services/${metadata.serviceId}`;
    } 
  }

  // Expense Links
  if (activity.description.toLowerCase().includes('expense')) {
    if (metadata?.expenseId) {
      return `/admin/b2b-booking/companies/${companyId}/services/${metadata.serviceId}`;
    }
  }

  // Quotation links
  if (activity.description.toLowerCase().includes('quotation')) {
    if (metadata?.quotationId) {
      return `/admin/b2b-booking/companies/${companyId}`;
    }
  }

  // Invoice links
  if (activity.description.toLowerCase().includes('invoice')) {
    if (metadata?.invoiceId) {
      return `/admin/b2b-booking/companies/${companyId}`;
    }
  }

  // Referral links
  if (activity.description.toLowerCase().includes('referral')) {
    if (metadata?.referralId) {
      return `/admin/b2b-booking/companies/${companyId}/services/${metadata.serviceId}#referralsList`;
    }
  }

  // Company links
  if (activity.description.includes('company')) {
    return `/admin/b2b-booking/companies/${companyId}`;
  }

  // Email links
  if (activity.description === 'email_sent') {
    return `/admin/b2b-booking/companies/${companyId}/emails`;
  }

  return null;
};

export function ActivityHistoryModal({ companyId, isOpen, onClose }: ActivityHistoryModalProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedActivityIds, setExpandedActivityIds] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<any>(undefined);
  const [customRange, setCustomRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });

  useEffect(() => {
    if (isOpen && companyId) {
      fetchActivities();
    }
  }, [isOpen, companyId]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const data = await activityService.fetchActivities(companyId);
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandActivity = (activityId: string) => {
    const newExpanded = new Set(expandedActivityIds);
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId);
    } else {
      newExpanded.add(activityId);
    }
    setExpandedActivityIds(newExpanded);
  };

  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateFilter) {
      case 'today': {
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        return { start: today, end: endOfToday };
      }
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);
        return { start: yesterday, end: endOfYesterday };
      }
      case 'last7': {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        return { start: sevenDaysAgo, end: endOfToday };
      }
      case 'custom': {
        const start = customRange.from || today;
        const end = customRange.to || today;
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      default:
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    }
  };

  const filteredActivities = activities.filter((activity) => {
    const activityDate = new Date(activity.timestamp);
    const { start, end } = getDateRange();
    return activityDate >= start && activityDate <= end;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-[95vw] max-h-[95vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 py-4 border-b">
            <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3'>
                <div className='flex justify-between items-center'>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                            Activity History
                    </DialogTitle>
                </div>
                
                {/* Date Filters */}
                <div className='flex flex-col  sm:flex-row gap-2 flex-wrap items-start sm:items-center sm:mr-6'>
                  <div className='flex gap-2 flex-wrap'>
                    <Button
                      variant={dateFilter === 'today' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDateFilter('today')}
                      className="text-xs"
                    >
                      Today
                    </Button>
                    <Button
                      variant={dateFilter === 'yesterday' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDateFilter('yesterday')}
                      className="text-xs"
                    >
                      Yesterday
                    </Button>
                    <Button
                      variant={dateFilter === 'last7' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDateFilter('last7')}
                      className="text-xs"
                    >
                      Last 7 Days
                    </Button>
                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                      <PopoverTrigger asChild>
                        <button
                          className={`px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap transition-colors border rounded-md ${
                            dateFilter === 'custom'
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 border-gray-300'
                          }`}
                          onClick={() => {
                            setDateFilter('custom');
                            setIsPopoverOpen(true);
                          }}
                        >
                          Custom
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto">
                        <div className="flex flex-col gap-2">
                          <Calendar
                            mode="range"
                            selected={selectedRange}
                            onSelect={(r: any) => {
                              setSelectedRange(r);
                              // auto-apply when both dates are selected
                              if (r?.from && r?.to) {
                                setCustomRange({ from: r.from, to: r.to });
                                setDateFilter('custom');
                              } else if (r instanceof Date) {
                                setCustomRange({ from: r, to: r });
                                setDateFilter('custom');
                              }
                            }}
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRange(undefined);
                                setCustomRange({ from: null, to: null });
                                setIsPopoverOpen(false);
                              }}
                            >
                              Clear
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (!selectedRange) return setIsPopoverOpen(false);
                                let from: Date | null = null;
                                let to: Date | null = null;
                                if (selectedRange.from || selectedRange.to) {
                                  from = selectedRange.from || selectedRange.to || null;
                                  to = selectedRange.to || selectedRange.from || null;
                                } else if (selectedRange instanceof Date) {
                                  from = selectedRange;
                                  to = selectedRange;
                                }
                                if (from && to) {
                                  setCustomRange({ from, to });
                                  setDateFilter('custom');
                                }
                                setIsPopoverOpen(false);
                              }}
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
            </div>

          <DialogDescription>
            Complete record of all actions and changes made to this company
          </DialogDescription>

          <>
            <div className='flex justify-between text-sm'>
                <span className="text-gray-500">Total Activities: {filteredActivities.length}</span>
            </div>
          </>
        </DialogHeader>

        <ScrollArea className="flex-1 px-2 sm:px-6 mb-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No activities found for the selected date range</p>
            </div>
          ) : (
            <div className="space-y-3 pr-0 md:pr-4">
              {filteredActivities.map((activity, index) => {
                const typeInfo = ACTIVITY_TYPE_LABELS[activity.activityType] || {
                  label: activity.activityType,
                  color: 'bg-gray-100 text-gray-800',
                  icon: '📌',
                };
                const isLastItem = index === filteredActivities.length - 1;
                const isExpanded = expandedActivityIds.has(activity.id);
                const hasMetadata = activity.metadata && Object.keys(activity.metadata).length > 0;

                return (
                  <div key={activity.id} className="relative">
                    {/* Timeline line */}
                    {!isLastItem && (
                      <div className="hidden sm:block absolute left-5 top-14 w-0.5 h-16 bg-gray-200" />
                    )}

                    {/* Activity card */}
                    <div className="flex gap-3 ">
                      {/* Timeline dot */}
                      <div className="hidden sm:flex flex-shrink-0">
                        <div className="flex items-center justify-center mt-5 w-10 h-10 rounded-full bg-white border-2 border-gray-200">
                          <span className="text-lg">{typeInfo.icon}</span>
                        </div>
                      </div>

                      {/* Activity details */}
                      <div className="flex-1 pt-2">
                        <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                          {/* Main content - Always visible */}
                          <div className="p-4">
                            {/* Activity type and time */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeInfo.color}`}>
                                    {/* {typeInfo.label} */}
                                  {activity.description.split(' - ')[0]} 
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {formatDate(activity.timestamp)}   {' | '}
                                {new Date(activity.timestamp).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                              </span>
                              
                            </div>

                            {/* Description */}
                            {activity.description && (
                              <p className="text-sm text-gray-700 break-words line-clamp-2 font-semibold">{activity.description.split(' - ')[1]} </p>
                            )}

                            {/* User info - Compact view */}
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs">
 

                                <div className="flex items-center gap-1">
                                  <span className="text-gray-600">By:</span>
                                  <span className="font-medium text-gray-900">{activity.userName} | {activity.userEmail}</span>
                                </div>
                                <span className="hidden sm:inline text-gray-300">•</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-600">Role:</span>
                                  <span className="font-medium text-gray-900 capitalize">{activity.userRole}</span>
                                </div>
                                <span className="hidden sm:inline text-gray-300">•</span>

                                <div className="flex items-center gap-1">
                                  {getActivityLink(activity, companyId) && (
                                    <Link 
                                      href={getActivityLink(activity, companyId)!}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <button 
                                        className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                                        title="Open in new tab"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span className="text-xs">Open</span>
                                      </button>
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Expand button */}
                            {hasMetadata && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpandActivity(activity.id)}
                                  className="w-full justify-between text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-0"
                                >
                                  <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Expanded details - Shown on demand */}
                          {isExpanded && hasMetadata && (
                            <div className="px-4 pb-4 border-t border-gray-100">
                              {/* Full user info */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4 pt-4">
                                <div>
                                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    User
                                  </label>
                                  <p className="text-sm text-gray-900 font-medium">{activity.userName}</p>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    Email
                                  </label>
                                  <p className="text-sm text-blue-600 break-all">{activity.userEmail}</p>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    Role
                                  </label>
                                  <p className="text-sm text-gray-900 capitalize font-medium">{activity.userRole}</p>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    Date & Time
                                  </label>
                                  <p className="text-sm text-gray-900">
                                    {new Date(activity.timestamp).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>

                              {/* Metadata */}
                              <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  Additional Info
                                </label>
                                <div className="mt-2 text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded">
                                  {activity.metadata && Object.entries(activity.metadata)
                                    .filter(([_, v]) => v !== null && v !== undefined && v !== '')
                                    .map(([key, value]) => (
                                      <div key={key} className="flex justify-between gap-4">
                                        <span className="font-mono text-gray-500 min-w-max">{key}:</span>
                                        <span className="font-mono text-gray-700 break-all text-right">{String(value)}</span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>


    </Dialog>
  );
}
