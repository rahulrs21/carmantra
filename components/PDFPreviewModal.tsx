'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { useRef } from 'react';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDataUrl: string | null;
  fileName: string;
  title: string;
}

export function PDFPreviewModal({
  isOpen,
  onClose,
  pdfDataUrl,
  fileName,
  title,
}: PDFPreviewModalProps) {
  const downloadRef = useRef<HTMLAnchorElement>(null);

  const handleDownload = () => {
    if (!pdfDataUrl || !downloadRef.current) return;

    downloadRef.current.href = pdfDataUrl;
    downloadRef.current.download = fileName;
    downloadRef.current.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{title}</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X size={18} />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-gray-100 rounded-lg">
          {pdfDataUrl ? (
            <iframe
              src={pdfDataUrl}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-gray-500">Loading PDF...</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!pdfDataUrl}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Download size={16} />
            Download PDF
          </Button>
        </DialogFooter>

        <a ref={downloadRef} style={{ display: 'none' }} />
      </DialogContent>
    </Dialog>
  );
}
