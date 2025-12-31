'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { B2BPreInspection } from '@/lib/types/b2b.types';
import { PreInspectionForm } from './PreInspectionForm';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface PreInspectionListProps {
  companyId: string;
  serviceId: string;
  vehicleId: string;
  preInspections: B2BPreInspection[];
  isLoading: boolean;
  onRefresh: () => void;
}

const STATUS_CONFIG = {
  ok: { icon: CheckCircle2, color: 'text-green-600' },
  issue: { icon: AlertCircle, color: 'text-red-600' },
  pending: { icon: Clock, color: 'text-yellow-600' },
};

export function PreInspectionList({
  companyId,
  serviceId,
  vehicleId,
  preInspections,
  isLoading,
  onRefresh,
}: PreInspectionListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Loading pre-inspections...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pre-Inspections</h3>
          <p className="text-sm text-gray-600">Vehicle inspection records with images & notes</p>
        </div>
        <PreInspectionForm
          companyId={companyId}
          serviceId={serviceId}
          vehicleId={vehicleId}
          onSuccess={onRefresh}
        />
      </div>

      {preInspections.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            No pre-inspections yet. Add your first one!
          </CardContent>
        </Card>
      ) : (
        preInspections.map((inspection) => (
          <Card key={inspection.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {inspection.inspectionType === 'before'
                      ? 'Before Service'
                      : inspection.inspectionType === 'after'
                      ? 'After Service'
                      : 'Follow-up'}{' '}
                    Inspection
                  </CardTitle>
                  <CardDescription>
                    {new Date(
                      inspection.inspectionDate instanceof Date
                        ? inspection.inspectionDate
                        : (inspection.inspectionDate as any).toDate()
                    ).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant="outline">{inspection.inspectionType || 'standard'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Notes */}
              <div>
                <p className="text-sm font-semibold mb-1">Notes</p>
                <p className="text-sm text-gray-700">{inspection.notes}</p>
              </div>

              {/* Checklist */}
              {inspection.checklist.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Checklist</p>
                  <div className="space-y-1">
                    {inspection.checklist.map((item, idx) => {
                      const Config = STATUS_CONFIG[item.status];
                      const Icon = Config?.icon || Clock;
                      return (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <Icon size={16} className={Config?.color || 'text-gray-400'} />
                          <span className="flex-1">{item.item}</span>
                          <span className="text-gray-600">({item.status})</span>
                          {item.remark && <span className="text-gray-500 italic">- {item.remark}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Media */}
              {(inspection.images.length > 0 || inspection.videos.length > 0) && (
                <div>
                  <p className="text-sm font-semibold mb-3">Media</p>
                  
                  {/* Images */}
                  {inspection.images.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-600 mb-2">📷 Images ({inspection.images.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {inspection.images.map((img, idx) => (
                          <div key={idx} className="group relative">
                            <img
                              src={img.path}
                              alt={img.name}
                              className="w-full h-24 object-cover rounded border border-gray-200 hover:border-blue-400 transition"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              <a
                                href={img.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white text-blue-600 px-2 py-1 rounded text-xs font-semibold hover:bg-blue-50"
                                title="View full size"
                              >
                                👁️
                              </a>
                              <a
                                href={img.path}
                                download={img.name}
                                className="bg-white text-green-600 px-2 py-1 rounded text-xs font-semibold hover:bg-green-50"
                                title="Download"
                              >
                                ⬇️
                              </a>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 truncate">{img.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos */}
                  {inspection.videos.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2">🎬 Videos ({inspection.videos.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {inspection.videos.map((vid, idx) => (
                          <div key={idx} className="group relative">
                            <video
                              src={vid.path}
                              className="w-full h-24 object-cover rounded border border-gray-200 hover:border-purple-400 transition bg-black"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              <a
                                href={vid.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white text-purple-600 px-2 py-1 rounded text-xs font-semibold hover:bg-purple-50"
                                title="Play video"
                              >
                                ▶️
                              </a>
                              <a
                                href={vid.path}
                                download={vid.name}
                                className="bg-white text-green-600 px-2 py-1 rounded text-xs font-semibold hover:bg-green-50"
                                title="Download"
                              >
                                ⬇️
                              </a>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 truncate">{vid.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
