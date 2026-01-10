import html2pdf from 'html2pdf.js';

export interface QuotationPDFData {
  quotationNumber: string;
  date: string;
  company: {
    name: string;
    phone?: string;
    email?: string;
    trn?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  serviceTitle: string;
  vehicles: Array<{
    plate: string;
    brand: string;
    model: string;
    year: number;
    serviceAmount: number;
    service?: string;
    services?: Array<{ description: string; amount: number }>;
    jobCardNo?: string | null;
    serviceDate?: Date | string | null;
  }>;
  referralTotal: number;
  subtotal: number;
  grandTotal: number;
  status: string;
  notes?: string;
  validityDate?: string;
  paymentTerms?: string;
  showReferralCommission?: boolean;
}

export interface InvoicePDFData {
  invoiceNumber: string;
  date: Date;
  company: {
    name: string;
    phone?: string;
    email?: string;
    trn?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  serviceTitle: string;
  vehicles: Array<{
    plate: string;
    brand: string;
    model: string;
    year: number;
    serviceAmount: number;
    service?: string;
    services?: Array<{ description: string; amount: number }>;
    jobCardNo?: string | null;
    serviceDate?: Date | string | null;
  }>;
  referralTotal: number;
  subtotal: number;
  grandTotal: number;
  status: string;
  amountStatus?: string;
  cancellationReason?: string;
  paymentMethod?: string;
  validityDate?: string;
  dueDate?: string;
  showReferralCommission?: boolean;
  notes?: string;
}

const getDateString = (date: string | Date | null | undefined): string => {
  if (!date) {
    return new Date().toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
  
  let dateObj: Date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'object' && date !== null && 'toDate' in date) {
    dateObj = (date as any).toDate();
  } else {
    dateObj = new Date();
  }
  
  return dateObj.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// Calculate subtotal from vehicle service amounts
const calculateSubtotalFromVehicles = (vehicles: Array<{ serviceAmount: number }>): number => {
  return vehicles.reduce((sum, vehicle) => sum + (vehicle.serviceAmount || 0), 0);
};

export const generateQuotationPDF = async (data: QuotationPDFData) => {
  // Calculate actual subtotal from vehicles, not from stored value
  const calculatedSubtotal = calculateSubtotalFromVehicles(data.vehicles);
  const vehicleRows = data.vehicles
    .map(
      (v) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #4a90e2;">${v.jobCardNo || '-'}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${v.brand} ${v.model}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${v.plate} | ${v.year}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${v.services?.map((svc: any) => svc.description).join(', ') || v.service || data.serviceTitle}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">AED ${v.serviceAmount.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const htmlContent = `
    <html>
      <head>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
            color: #2c3e50;
            background: #f5f7fa;
            line-height: 1.6;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 30px;
            background: white;
          }
          .header {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #ddd;
            align-items: flex-start;
          }
          .logo-section {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
          }
          .logo-box {
            background: #000;
            padding: 6px;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            flex-shrink: 0;
          }
          .logo-box img {
            max-height: 48px;
            width: auto;
            display: block;
            filter: brightness(0) invert(1);
          }
          .company-details {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .company-details h2 {
            margin: 0;
            color: #2c3e50;
            font-size: 16px;
            font-weight: 700;
            line-height: 1.2;
          }
          .company-details p {
            margin: 0;
            font-size: 10px;
            color: #666;
            line-height: 1.3;
            margin-top: 5px;
          }
          .quotation-header {
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            gap: 2px;
          }
          .quotation-header h1 {
            margin: 0;
            color: #4a90e2;
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.5px;
            line-height: 1.1;
          }
          .quotation-number {
            font-size: 13px;
            font-weight: 600;
            color: #2c3e50;
            margin: 0;
          }
          .quote-date {
            font-size: 10px;
            color: #666;
            margin: 0;
          }
          .quote-valid {
            font-size: 9px;
            color: #999;
            font-style: italic;
            margin: 2px 0 0 0;
          }
          .customer-info-header {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 6px;
          }
          .customer-info-header > div {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }
          .customer-info-header label {
            font-weight: 700;
            color: #4a90e2;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .customer-info-header p {
            margin: 0;
            color: #2c3e50;
            font-size: 11px;
            line-height: 1.3;

          }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-top: 8px;
            text-transform: uppercase;
            width: fit-content;
          }
          .status-draft { 
            background: #f0f0f0; 
            color: #666;
          }
          .status-sent { 
            background: #d4e6f1; 
            color: #1a5276;
          }
          .status-accepted { 
            background: #d5f4e6; 
            color: #0b5345;
          }
          .status-rejected { 
            background: #fadbd8; 
            color: #78281f;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            background: #4a90e2;
            color: white;
            padding: 12px 16px;
            font-weight: 700;
            font-size: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
            border-radius: 4px 4px 0 0;
            margin-bottom: 0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 0 0 4px 4px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .info-box {
            background: white;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #e5e5e5;
            font-size: 12px;
          }
          .info-box label {
            font-weight: 700;
            color: #4a90e2;
            display: block;
            margin-bottom: 4px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-box p {
            margin: 0;
            color: #2c3e50;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border: 1px solid #e8eef7;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          thead {
            background: #4a90e2;
            color: white;
          }
          th {
            padding: 12px 10px;
            text-align: left;
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          th:last-child {
            text-align: right;
          }
          tbody tr {
            border-bottom: 1px solid #e8eef7;
            transition: background-color 0.2s ease;
          }
          tbody tr:nth-child(even) {
            background: #f8f9fb;
          }
          tbody tr:hover {
            background: #f0f3ff;
          }
          td {
            padding: 12px;
            font-size: 13px;
            color: #2c3e50;
          }
          td:last-child {
            text-align: right;
            font-weight: 600;
          }
          .totals-section {
            margin-top: 20px;
            margin-left: auto;
            width: 100%;
            max-width: 350px;
            display: flex;
            flex-direction: column;
            gap: 0;
          }
          .total-row {
            display: grid;
            grid-template-columns: 1fr 120px;
            align-items: center;
            gap: 10px;
            padding: 5px 16px;
            border: 1px solid #e8eef7;
            border-bottom: none;
            font-size: 13px;
            background: white;
          }
          .total-row:last-child {
            border-bottom: 1px solid #e8eef7;
            border-radius: 0 0 6px 6px;
          }
          .total-row:first-child {
            border-radius: 6px 6px 0 0;
          }
          .total-row.grand-total {
            background: #4a90e2;
            color: white;
            font-weight: 700;
            font-size: 13px;
            padding: 14px;
            border-color: #4a90e2;
            box-shadow: 0 1px 3px rgba(74, 144, 226, 0.15);
          }
          .total-label {
            text-align: left;
          }
          .total-amount {
            text-align: right;
            font-weight: 700;
          }
          .notes-section {
            background: #f0f6fb;
            padding: 14px;
            border-radius: 4px;
            border-left: 3px solid #4a90e2;
            margin-top: 20px;
          }
          .notes-section label {
            font-weight: 700;
            color: #4a90e2;
            display: block;
            margin-bottom: 6px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .notes-section p {
            margin: 0;
            color: #2c3e50;
            font-size: 13px;
            line-height: 1.6;
          }
          .footer {
            text-align: center;
            margin-top: auto;
            padding-top: 20px;
            border-top: 2px solid #e8eef7;
            color: #999;
            font-size: 11px;
          }
          .footer p {
            margin: 4px 0;
          }

          .stamp-image {
            display: block;
            width: 40px;
            height: 40px;
            margin-top: -35px;
            margin-left: auto;
            margin-right: 0;
            opacity: 0.6;
          }

          .info-box-comp {
            display: flex !important;
            flex-direction: row !important;
            justify-content: flex-end !important;
            align-items: center !important;
            gap: 8px !important;
          }

          .info-box-comp label {
            display: inline-block !important;
            text-align: right !important;
            margin: 0 !important;
            font-weight: 600;
            white-space: nowrap;
          }

          .info-box-comp p {
            text-align: left !important;
            display: inline-block !important;
            margin: 0 !important;
          }

          
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            
            <div class="logo-section">
              <div class="logo-box">
                <img src="/images/Carmantra_Invoice.png" alt="Carmantra Logo" />
              </div>

                <div class="company-details">
                  <h2>Car Mantra</h2>
                  <p>Premium Auto Care Services</p>
                  <p>Email: info@carmantra.com | Phone: +971 50 123 4567</p>
                </div>
            </div>
            <div class="customer-info-header">
              <div>
                <label style={{fontWeight: 'bold', fontSize: '18px'}}>Company Information</label>
                <p><strong>${data.company.name}</strong></p>
              </div>
              
               ${data.company.trn ? `<div class="info-box-comp">
                <label>TRN No:</label>
                <p>${data.company.trn}</p>
              </div>` : ''}
              ${data.company.email || data.company.phone ? `<div class="info-box-comp">
                <p>${data.company.email} | ${data.company.phone} </p>
              </div>` : ''}
              ${data.company.address ? `<div > 
                <p>${[data.company.address, data.company.city, data.company.state, data.company.zipCode].filter(Boolean).join(', ')}</p>
              </div>` : ''}


            </div>
            <div class="quotation-header">
              <h1>QUOTATION</h1>
              <div class="quotation-number">#${data.quotationNumber}</div>
              <div class="quote-date">Date: ${getDateString(data.date)}</div>
              <div class="quote-valid">Valid Until: ${data.validityDate ? getDateString(data.validityDate) : '15 days'}</div>
              <span class="status-badge status-${data.status.toLowerCase()}">${data.status}</span>
            </div>
            
          </div>

          <div class="section">
            <div class="section-title">SERVICE DETAILS</div>
            <table>
              <thead>
                <tr>
                  <th>JobCard #</th>
                  <th>Vehicle</th>
                  <th>Plate # | Year</th>
                  <th>Service</th>
                  <th style="text-align: right; width: 100px;">Amount (AED)</th>
                </tr>
              </thead>
              <tbody>
                ${vehicleRows}
              </tbody>
            </table>

            <div class="totals-section">
              <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-amount">AED ${calculatedSubtotal.toFixed(2)}</span>
              </div>
              ${data.showReferralCommission ? `<div class="total-row">
                <span class="total-label">Referral Commission:</span>
                <span class="total-amount">AED ${data.referralTotal.toFixed(2)}</span>
              </div>` : ''}
              <div class="total-row grand-total">
                <span class="total-label">GRAND TOTAL:</span>
                <span class="total-amount">AED ${(data.showReferralCommission ? (calculatedSubtotal + data.referralTotal) : calculatedSubtotal).toFixed(2)}</span>
              </div>
            </div>
            <img src="/images/sample-stamp.png" style="width: 130px !important; height: 120px !important; display: block; margin: -5px auto 0 auto; margin-left: auto; margin-right: 0; opacity: 0.6;" alt="Approved Stamp" />
          </div>

          ${data.notes ? `<div class="notes-section">
            <label>NOTES:</label>
            <p>${data.notes}</p>
          </div>` : ''}

          <div class="footer">
            <p>This is a computer-generated quotation. No signature is required.</p>
            <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const element = document.createElement('div');
  element.innerHTML = htmlContent;

  const options = {
    margin: 10,
    filename: `Quotation_${data.quotationNumber}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait' as const, unit: 'mm' as const, format: 'a4' },
  };

  try {
    await (html2pdf() as any).set(options).from(element).save();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const generateQuotationPDFBlob = async (data: QuotationPDFData): Promise<string> => {
  // Calculate actual subtotal from vehicles, not from stored value
  const calculatedSubtotal = calculateSubtotalFromVehicles(data.vehicles);
  const vehicleRows = data.vehicles
    .map(
      (v) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #4a90e2;">${v.jobCardNo || '-'}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${v.brand} ${v.model}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${v.plate} | ${v.year}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${v.services?.map((svc: any) => svc.description).join(', ') || v.service || data.serviceTitle}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">AED ${v.serviceAmount.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const htmlContent = `
    <html>
      <head>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
            color: #2c3e50;
            background: #f5f7fa;
            line-height: 1.6;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 30px;
            background: white;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }
          .header {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #ddd;
            align-items: flex-start;
          }
          .logo-section {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }
          .logo-box {
            background: #000;
            padding: 6px;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            flex-shrink: 0;
          }
          .logo-box img {
            max-height: 48px;
            width: auto;
            display: block;
            filter: brightness(0) invert(1);
          }
          .company-details {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .company-details h2 {
            margin: 0;
            color: #2c3e50;
            font-size: 16px;
            font-weight: 700;
            line-height: 1.2;
          }
          .company-details p {
            margin: 0;
            font-size: 10px;
            color: #666;
            line-height: 1.3;
          }
          .quotation-header {
            text-align: right;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: flex-end;
            gap: 2px;
            margin-top: -10px;
          }
          .quotation-header h1 {
            margin: 0;
            color: #4a90e2;
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.5px;
            line-height: 1.1;
          }
          .quotation-number {
            font-size: 13px;
            font-weight: 600;
            color: #2c3e50;
            margin: 0;
          }
          .quote-date {
            font-size: 10px;
            color: #666;
            margin: 0;
          }
          .quote-valid {
            font-size: 9px;
            color: #999;
            font-style: italic;
            margin: 2px 0 0 0;
          }
          .customer-info-header {
            display: flex;
            flex-direction: column;
            gap: 6px;
            text-align: right;
          }
          .customer-info-header > div {
            display: flex;
            flex-direction: column;
            gap: 1px;
          }
          .customer-info-header label {
            font-weight: 700;
            color: #4a90e2;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .customer-info-header p {
            margin: 0;
            color: #2c3e50;
            font-size: 11px;
            line-height: 1.3;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-top: 8px;
            text-transform: uppercase;
            width: fit-content;
          }
          .status-draft { 
            background: #f0f0f0; 
            color: #666;
            margin-bottom: 5px;
          }
          .status-sent { 
            background: #d4e6f1; 
            color: #1a5276;
          }
          .status-accepted { 
            background: #d5f4e6; 
            color: #0b5345;
          }
          .status-rejected { 
            background: #fadbd8; 
            color: #78281f;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            background: #4a90e2;
            color: white;
            padding: 12px 16px;
            font-weight: 700;
            font-size: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
            border-radius: 4px 4px 0 0;
            margin-bottom: 0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 0 0 4px 4px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .info-box {
            background: white;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #e5e5e5;
            font-size: 12px;
          }
          .info-box label {
            font-weight: 700;
            color: #4a90e2;
            display: block;
            margin-bottom: 4px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-box p {
            margin: 0;
            color: #2c3e50;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border: 1px solid #e8eef7;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          thead {
            background: #4a90e2;
            color: white;
          }
          th {
            padding: 12px 10px;
            text-align: left;
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          th:last-child {
            text-align: right;
          }
          tbody tr {
            border-bottom: 1px solid #e8eef7;
            transition: background-color 0.2s ease;
          }
          tbody tr:nth-child(even) {
            background: #f8f9fb;
          }
          tbody tr:hover {
            background: #f0f3ff;
          }
          td {
            padding: 12px;
            font-size: 13px;
            color: #2c3e50;
          }
          td:last-child {
            text-align: right;
            font-weight: 600;
          }
          .totals-section {
            margin-top: 20px;
            margin-left: auto;
            width: 100%;
            max-width: 350px;
            display: flex;
            flex-direction: column;
            gap: 0;
          }
          .total-row {
            display: grid;
            grid-template-columns: 1fr 120px;
            align-items: center;
            gap: 10px;
            padding: 5px 16px;
            border: 1px solid #e8eef7;
            border-bottom: none;
            font-size: 13px;
            background: white;
          }
          .total-row:last-child {
            border-bottom: 1px solid #e8eef7;
            border-radius: 0 0 6px 6px;
          }
          .total-row:first-child {
            border-radius: 6px 6px 0 0;
          }
          .total-row.grand-total {
            background: #4a90e2;
            color: white;
            font-weight: 700;
            font-size: 13px;
            padding: 14px;
            border-color: #4a90e2;
            box-shadow: 0 1px 3px rgba(74, 144, 226, 0.15);
          }
          .total-label {
            text-align: left;
          }
          .total-amount {
            text-align: right;
            font-weight: 700;
          }
          .notes-section {
            background: #f0f6fb;
            padding: 14px;
            border-radius: 4px;
            border-left: 3px solid #4a90e2;
            margin-top: 20px;
          }
          .notes-section label {
            font-weight: 700;
            color: #4a90e2;
            display: block;
            margin-bottom: 6px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .notes-section p {
            margin: 0;
            color: #2c3e50;
            font-size: 13px;
            line-height: 1.6;
          }
          .footer {
            text-align: center;
            margin-top: auto;
            padding-top: 15px;
            border-top: 2px solid #ddd;
            color: #999;
            font-size: 10px;
          }
          .footer p {
            margin: 4px 0;
          }


          .info-box-comp {
            display: flex !important;
            flex-direction: row !important;
            justify-content: flex-end !important;
            align-items: center !important;
            gap: 8px !important;
          }

          .info-box-comp label {
            display: inline-block !important;
            text-align: right !important;
            margin: 0 !important;
            font-weight: 600;
            white-space: nowrap;
          }

          .info-box-comp p {
            text-align: left !important;
            display: inline-block !important;
            margin: 0 !important;
          }
           

        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-section">
              <div class="logo-box">
                <img src="/images/Carmantra_Invoice.png" alt="Carmantra Logo" />
              </div>
              <div class="company-details">
                <h2>Car Mantra</h2>
                <p>Premium Auto Care Services</p>
                <p>Email: info@carmantra.com </p>
                <p>Phone: +971 50 123 4567</p>
              </div>
            </div>
           
            <div class="customer-info-header">
              <div>
                <label style={{fontWeight: 'bold', fontSize: '18px'}}>Company Information</label>
                <p><strong>${data.company.name}</strong></p>
              </div>
              
              ${data.company.trn ? `<div class="info-box-comp">
                <label>TRN No:</label>
                <p>${data.company.trn}</p>
              </div>` : ''}
              ${data.company.email || data.company.phone ? `<div class="info-box-comp">
                <p>${data.company.email} | ${data.company.phone} </p>
              </div>` : ''}
              ${data.company.address ? `<div > 
                <p>${[data.company.address, data.company.city, data.company.state, data.company.zipCode].filter(Boolean).join(', ')}</p>
              </div>` : ''}


            </div>

             <div class="quotation-header">
              <h1>QUOTATION</h1>
              <div class="quotation-number">#${data.quotationNumber}</div>
              <div class="quote-date">Date: ${getDateString(data.date)}</div>
              <div class="quote-valid">Valid Until: ${data.validityDate ? getDateString(data.validityDate) : '15 days'}</div>
              <span class="status-badge status-${data.status.toLowerCase()}">${data.status}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">SERVICE DETAILS</div>
            <table>
              <thead>
                <tr>
                  <th>JobCard #</th>
                  <th>Vehicle</th>
                  <th>Plate # | Year</th>
                  <th>Service</th>
                  <th style="text-align: right; width: 100px;">Amount (AED)</th>
                </tr>
              </thead>
              <tbody>
                ${vehicleRows}
              </tbody>
            </table>

            <div class="totals-section">
              <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-amount">AED ${calculatedSubtotal.toFixed(2)}</span>
              </div>
              ${data.showReferralCommission ? `<div class="total-row">
                <span class="total-label">Referral Commission:</span>
                <span class="total-amount">AED ${data.referralTotal.toFixed(2)}</span>
              </div>` : ''}
              <div class="total-row grand-total">
                <span class="total-label">GRAND TOTAL:</span>
                <span class="total-amount">AED ${(data.showReferralCommission ? (calculatedSubtotal + data.referralTotal) : calculatedSubtotal).toFixed(2)}</span>
              </div>
              ${data.paymentTerms ? `<div class="total-row" style="background: #f0f6fb; border: 1px dashed #4a90e2;">
                <span class="total-label" style="font-weight: 600; color: #4a90e2;">Payment Terms:</span>
                <span style="text-align: right; font-size: 12px; white-space: nowrap; ">${data.paymentTerms}</span>
              </div>` : ''}
              
              
            </div>
            <img src="/images/sample-stamp.png" style="width: 130px !important; height: 120px !important; display: block; margin: -5px auto 0 auto; margin-left: auto; margin-right: 0; opacity: 0.6;" alt="Approved Stamp" />
          </div>

          ${data.notes ? `<div class="notes-section">
            <label>NOTES:</label>
            <p>${data.notes}</p>
          </div>` : ''}

          <div class="footer">
            <p>This is a computer-generated quotation. No signature is required.</p>
            <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const element = document.createElement('div');
  element.innerHTML = htmlContent;

  const options = {
    margin: 10,
    filename: `Quotation_${data.quotationNumber}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait' as const, unit: 'mm' as const, format: 'a4' },
  };

  try {
    return new Promise((resolve, reject) => {
      (html2pdf() as any)
        .set(options)
        .from(element)
        .outputPdf('dataurlstring')
        .then((pdf: string) => {
          resolve(pdf);
        })
        .catch((error: any) => {
          console.error('Error generating PDF:', error);
          reject(error);
        });
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};





// INVOICE PDF GENERATOR


export const generateInvoicePDFBlob = async (data: InvoicePDFData): Promise<string> => {
  // Calculate actual subtotal from vehicles, not from stored value
  const calculatedSubtotal = calculateSubtotalFromVehicles(data.vehicles);
  const vehicleRows = data.vehicles
    .map(
      (v) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #4a90e2;">${v.jobCardNo || '-'}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${v.brand} ${v.model}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${v.plate} | ${v.year}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${v.services?.map((svc: any) => svc.description).join(', ') || v.service || data.serviceTitle}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">AED ${v.serviceAmount.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const htmlContent = `
    <html>
      <head>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
            color: #2c3e50;
            background: #f5f7fa;
            line-height: 1.6;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 30px;
            background: white;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }
          .header {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #ddd;
            align-items: flex-start;
          }
          .logo-section {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }
          .logo-box {
            background: #000;
            padding: 6px;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            flex-shrink: 0;
          }
          .logo-box img {
            max-height: 48px;
            width: auto;
            display: block;
            filter: brightness(0) invert(1);
          }
          .company-details {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .company-details h2 {
            margin: 0;
            color: #2c3e50;
            font-size: 16px;
            font-weight: 700;
            line-height: 1.2;
          }
          .company-details p {
            margin: 0;
            font-size: 10px;
            color: #666;
            line-height: 1.3;
          }
          .invoice-header {
            text-align: right;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: flex-end;
            gap: 2px;
            margin-top: -10px;
          }
          .invoice-header h1 {
            margin: 0;
            color: #27ae60;
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.5px;
            line-height: 1.1;
          }
          .invoice-number {
            font-size: 13px;
            font-weight: 600;
            color: #2c3e50;
            margin: 0;
          }
          .invoice-date {
            font-size: 10px;
            color: #666;
            margin: 0;
          }
          .customer-info-header {
            display: flex;
            flex-direction: column;
            gap: 6px;
            text-align: right;
          }
          .customer-info-header > div {
            display: flex;
            flex-direction: column;
            gap: 1px;
          }
          .customer-info-header label {
            font-weight: 700;
            color: #27ae60;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .customer-info-header p {
            margin: 0;
            color: #2c3e50;
            font-size: 11px;
            line-height: 1.3;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-top: 8px;
            text-transform: uppercase;
            width: fit-content;
          }
          .status-draft { 
            background: #f0f0f0; 
            color: #666;
          }
          .status-issued { 
            background: #d4e6f1; 
            color: #1a5276;
          }
          .status-paid { 
            background: #d5f4e6; 
            color: #0b5345;
          }
          .status-pending { 
            background: #fdebd0; 
            color: #7d6608;
          }
          .status-overdue { 
            background: #fadbd8; 
            color: #78281f;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            background: #27ae60;
            color: white;
            padding: 12px 16px;
            font-weight: 700;
            font-size: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
            border-radius: 4px 4px 0 0;
            margin-bottom: 0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 0 0 4px 4px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .info-box {
            background: white;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #e5e5e5;
            font-size: 12px;
          }
          .info-box label {
            font-weight: 700;
            color: #27ae60;
            display: block;
            margin-bottom: 4px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-box p {
            margin: 0;
            color: #2c3e50;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border: 1px solid #e8eef7;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          thead {
            background: #27ae60;
            color: white;
          }
          th {
            padding: 12px 10px;
            text-align: left;
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          th:last-child {
            text-align: right;
          }
          tbody tr {
            border-bottom: 1px solid #e8eef7;
            transition: background-color 0.2s ease;
          }
          tbody tr:nth-child(even) {
            background: #f8f9fb;
          }
          tbody tr:hover {
            background: #f0fdf4;
          }
          td {
            padding: 12px;
            font-size: 13px;
            color: #2c3e50;
          }
          td:last-child {
            text-align: right;
            font-weight: 600;
          }
          .totals-section {
            margin-top: 20px;
            margin-left: auto;
            width: 100%;
            max-width: 350px;
            display: flex;
            flex-direction: column;
            gap: 0;
          }
          .total-row {
            display: grid;
            grid-template-columns: 1fr 120px;
            align-items: center;
            gap: 10px;
            padding: 5px 16px;
            border: 1px solid #e8eef7;
            border-bottom: none;
            font-size: 13px;
            background: white;
          }
          .total-row:last-child {
            border-bottom: 1px solid #e8eef7;
            border-radius: 0 0 6px 6px;
          }
          .total-row:first-child {
            border-radius: 6px 6px 0 0;
          }
          .total-row.grand-total {
            background: #27ae60;
            color: white;
            font-weight: 700;
            font-size: 13px;
            padding: 14px;
            border-color: #27ae60;
            box-shadow: 0 1px 3px rgba(39, 174, 96, 0.15);
          }
          .total-label {
            text-align: left;
          }
          .total-amount {
            text-align: right;
            font-weight: 700;
          }
          .notes-section {
            background: #f0fdf4;
            padding: 14px;
            border-radius: 4px;
            border-left: 3px solid #27ae60;
            margin-top: 20px;
          }
          .notes-section label {
            font-weight: 700;
            color: #27ae60;
            display: block;
            margin-bottom: 6px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .notes-section p {
            margin: 0;
            color: #2c3e50;
            font-size: 13px;
            line-height: 1.6;
          }
          .footer {
            text-align: center;
            margin-top: auto;
            padding-top: 15px;
            border-top: 2px solid #ddd;
            color: #999;
            font-size: 10px;
          }
          .footer p {
            margin: 4px 0;
          }

          .info-box-comp {
            display: flex !important;
            flex-direction: row !important;
            justify-content: flex-end !important;
            align-items: center !important;
            gap: 8px !important;
          }

          .info-box-comp label {
            display: inline-block !important;
            text-align: right !important;
            margin: 0 !important;
            font-weight: 600;
            white-space: nowrap;
          }

          .info-box-comp p {
            text-align: left !important;
            display: inline-block !important;
            margin: 0 !important;
          }


        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-section">
              <div class="logo-box">
                <img src="/images/Carmantra_Invoice.png" alt="Carmantra Logo" />
              </div>
              <div class="company-details">
                <h2>Car Mantra</h2>
                <p>Premium Auto Care Services</p>
                <p>Email: info@carmantra.com </p>
                <p>Phone: +971 50 123 4567</p>
              </div>
            </div>
           
            <div class="customer-info-header">
              <div>
                <label style={{fontWeight: 'bold', fontSize: '18px'}}>Company Information</label>
                <p><strong>${data.company.name}</strong></p>
              </div>
              
              ${data.company.trn ? `<div class="info-box-comp">
                <label>TRN No:</label>
                <p>${data.company.trn}</p>
              </div>` : ''}
              ${data.company.email || data.company.phone ? `<div class="info-box-comp">
                <p>${data.company.email} | ${data.company.phone} </p>
              </div>` : ''}
              ${data.company.address ? `<div > 
                <p>${[data.company.address, data.company.city, data.company.state, data.company.zipCode].filter(Boolean).join(', ')}</p>
              </div>` : ''}

            </div>

             <div class="invoice-header">
              <h1>INVOICE</h1>
              <div class="invoice-number">#${data.invoiceNumber}</div>
              <div class="invoice-date">Date: ${getDateString(data.date)}</div>
              <div class="invoice-date">Due: ${data.dueDate ? getDateString(data.dueDate) : getDateString(new Date(data.date.getTime() + 15 * 24 * 60 * 60 * 1000))}</div>
              <span class="status-badge status-${data.status.toLowerCase()}">${data.status.toUpperCase()}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">SERVICE DETAILS</div>
            <table>
              <thead>
                <tr>
                  <th>JobCard #</th>
                  <th>Vehicle</th>
                  <th>Plate # | Year</th>
                  <th>Service</th>
                  <th style="text-align: right; width: 110px;">Amount(AED)</th>
                </tr>
              </thead>
              <tbody>
                ${vehicleRows}
              </tbody>
            </table>

            <div class="totals-section">
              <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-amount">AED ${calculatedSubtotal.toFixed(2)}</span>
              </div>
              ${data.showReferralCommission ? `<div class="total-row">
                <span class="total-label">Referral Commission:</span>
                <span class="total-amount">AED ${data.referralTotal.toFixed(2)}</span>
              </div>` : ''}
              <div class="total-row grand-total">
                <span class="total-label">TOTAL DUE:</span>
                <span class="total-amount">AED ${(data.showReferralCommission ? (calculatedSubtotal + data.referralTotal) : calculatedSubtotal).toFixed(2)}</span>
              </div>
              ${data.amountStatus ? `<div class="total-row" style="background: #f0f6fb; border: 1px dashed #27ae60;">
                <span class="total-label" style="font-weight: 600; color: #27ae60;">Amount Status:</span>
                <span style="text-align: right; font-size: 12px; text-transform: capitalize;">${data.amountStatus}</span>
              </div>` : ''}
              ${data.amountStatus === 'cancelled' && data.cancellationReason ? `<div class="total-row" style="background: #fef2f2; border: 1px dashed #dc2626;">
                <span class="total-label" style="font-weight: 600; color: #dc2626;">Cancellation Reason:</span>
                <span style="color: #dc2626;">${data.cancellationReason}</span>
              </div>` : ''}
              ${data.paymentMethod ? `<div class="total-row" style="background: #f0f6fb; border: 1px dashed #27ae60;">
                <span class="total-label" style="font-weight: 600; color: #27ae60;">Payment Method:</span>
                <span style="text-align: right; font-size: 12px; white-space: nowrap;">${data.paymentMethod}</span>
              </div>` : ''}
              ${data.validityDate ? `<div class="total-row" style="background: #f0f6fb; border: 1px dashed #27ae60;">
                <span class="total-label" style="font-weight: 600; color: #27ae60;">Valid Until:</span>
                <span style="text-align: right; font-size: 12px;">${getDateString(data.validityDate)}</span>
              </div>` : ''}
            </div>
            <img src="/images/sample-stamp.png" style="width: 130px !important; height: 120px !important; display: block; margin: -5px auto 0 auto; margin-left: auto; margin-right: 0; opacity: 0.6;" alt="Approved Stamp" />
          </div>

          ${data.notes ? `<div class="notes-section">
            <label>NOTES:</label>
            <p>${data.notes}</p>
          </div>` : ''}

          <div class="footer">
            <p>This is a computer-generated invoice.</p>
            <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const element = document.createElement('div');
  element.innerHTML = htmlContent;

  const options = {
    margin: 10,
    filename: `Invoice_${data.invoiceNumber}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait' as const, unit: 'mm' as const, format: 'a4' },
  };

  try {
    return new Promise((resolve, reject) => {
      (html2pdf() as any)
        .set(options)
        .from(element)
        .outputPdf('dataurlstring')
        .then((pdf: string) => {
          resolve(pdf);
        })
        .catch((error: any) => {
          console.error('Error generating PDF:', error);
          reject(error);
        });
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const generateInvoicePDF = async (data: InvoicePDFData) => {
  // Calculate actual subtotal from vehicles, not from stored value
  const calculatedSubtotal = calculateSubtotalFromVehicles(data.vehicles);
  const vehicleRows = data.vehicles
    .map(
      (v) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #4a90e2;">${v.jobCardNo || '-'}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${v.brand} ${v.model}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${v.plate} | ${v.year}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${v.services?.map((svc: any) => svc.description).join(', ') || v.service || data.serviceTitle}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">AED ${v.serviceAmount.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const htmlContent = `
    <html>
      <head>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
            color: #2c3e50;
            background: #f5f7fa;
            line-height: 1.6;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 30px;
            background: white;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }
          .header {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 25px;
            margin-bottom: 25px;
            padding-bottom: 25px;
            border-bottom: 2px solid #ddd;
            align-items: start;
          }
          .logo-section {
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }
          .logo-box {
            background: #27ae60;
            padding: 8px;
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(39, 174, 96, 0.15);
            flex-shrink: 0;
          }
          .logo-box img {
            max-height: 60px;
            width: auto;
            display: block;
            filter: brightness(0) invert(1);
          }
          .company-details h2 {
            margin: 0 0 6px 0;
            color: #2c3e50;
            font-size: 16px;
            font-weight: 700;
          }
          .company-details p {
            margin: 2px 0;
            font-size: 11px;
            color: #666;
            line-height: 1.4;
            margin-top: 4px;
          }
          .invoice-header {
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
          }
          .invoice-header h1 {
            margin: 0;
            color: #27ae60;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .invoice-number {
            font-size: 16px;
            font-weight: 600;
            color: #2c3e50;
            margin: 6px 0;
          }
          .invoice-date {
            font-size: 12px;
            color: #666;
            margin: 3px 0;
          }
          .invoice-paid {
            font-size: 11px;
            color: #999;
            font-style: italic;
            margin: 6px 0 0 0;
          }
          .customer-info-header {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .customer-info-header label {
            font-weight: 700;
            color: #27ae60;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .customer-info-header p {
            margin: 0;
            color: #2c3e50;
            font-size: 11px;
            line-height: 1.4;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-top: 8px;
            text-transform: uppercase;
            width: fit-content;
          }
          .status-draft { 
            background: #f0f0f0; 
            color: #666;
          }
          .status-issued { 
            background: #d4e6f1; 
            color: #1a5276;
          }
          .status-paid { 
            background: #d5f4e6; 
            color: #0b5345;
          }
          .status-pending { 
            background: #fdebd0; 
            color: #7d6608;
          }
          .status-overdue { 
            background: #fadbd8; 
            color: #78281f;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            background: #27ae60;
            color: white;
            padding: 12px 16px;
            font-weight: 700;
            font-size: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
            border-radius: 4px 4px 0 0;
            margin-bottom: 0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 0 0 4px 4px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .info-box {
            background: white;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #e5e5e5;
            font-size: 12px;
          }
          .info-box label {
            font-weight: 700;
            color: #27ae60;
            display: block;
            margin-bottom: 4px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-box p {
            margin: 0;
            color: #2c3e50;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border: 1px solid #e8eef7;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          thead {
            background: #27ae60;
            color: white;
          }
          th {
            padding: 12px 10px;
            text-align: left;
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          th:last-child {
            text-align: right;
          }
          tbody tr {
            border-bottom: 1px solid #e8eef7;
            transition: background-color 0.2s ease;
          }
          tbody tr:nth-child(even) {
            background: #f8f9fb;
          }
          tbody tr:hover {
            background: #f0fdf4;
          }
          td {
            padding: 12px;
            font-size: 13px;
            color: #2c3e50;
          }
          td:last-child {
            text-align: right;
            font-weight: 600;
          }
          .totals-section {
            margin-top: 20px;
            margin-left: auto;
            width: 100%;
            max-width: 350px;
            display: flex;
            flex-direction: column;
            gap: 0;
          }
          .total-row {
            display: grid;
            grid-template-columns: 1fr 120px;
            align-items: center;
            gap: 10px;
            padding: 5px 16px;
            border: 1px solid #e8eef7;
            border-bottom: none;
            font-size: 13px;
            background: white;
          }
          .total-row:last-child {
            border-bottom: 1px solid #e8eef7;
            border-radius: 0 0 6px 6px;
          }
          .total-row:first-child {
            border-radius: 6px 6px 0 0;
          }
          .total-row.grand-total {
            background: #27ae60;
            color: white;
            font-weight: 700;
            font-size: 13px;
            padding: 14px;
            border-color: #27ae60;
            box-shadow: 0 1px 3px rgba(39, 174, 96, 0.15);
          }
          .total-label {
            text-align: left;
          }
          .total-amount {
            text-align: right;
            font-weight: 700;
          }
          .notes-section {
            background: #f0fdf4;
            padding: 14px;
            border-radius: 4px;
            border-left: 3px solid #27ae60;
            margin-top: 20px;
          }
          .notes-section label {
            font-weight: 700;
            color: #27ae60;
            display: block;
            margin-bottom: 6px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .notes-section p {
            margin: 0;
            color: #2c3e50;
            font-size: 13px;
            line-height: 1.6;
          }
          .footer {
            text-align: center;
            margin-top: auto;
            padding-top: 20px;
            border-top: 2px solid #e8eef7;
            color: #999;
            font-size: 11px;
          }
          .footer p {
            margin: 4px 0;
          }

          .info-box-comp {
            display: flex !important;
            flex-direction: row !important;
            justify-content: flex-end !important;
            align-items: center !important;
            gap: 8px !important;
          }

          .info-box-comp label {
            display: inline-block !important;
            text-align: right !important;
            margin: 0 !important;
            font-weight: 600;
            white-space: nowrap;
          }

          .info-box-comp p {
            text-align: left !important;
            display: inline-block !important;
            margin: 0 !important;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-section">
              <div class="logo-box">
                <img src="/images/Carmantra_Invoice.png" alt="Carmantra Logo" />
              </div>
              <div class="company-details">
                <h2>Car Mantra</h2>
                <p>Premium Auto Care Services</p>
                <p>Email: info@carmantra.com </p>
                <p>Phone: +971 50 123 4567</p>
              </div>
            </div>
           
            <div class="customer-info-header">
              <div>
                <label style={{fontWeight: 'bold', fontSize: '18px'}}>Company Information</label>
                <p><strong>${data.company.name}</strong></p>
              </div>
              
              ${data.company.trn ? `<div class="info-box-comp">
                <label>TRN No:</label>
                <p>${data.company.trn}</p>
              </div>` : ''}
              ${data.company.email || data.company.phone ? `<div class="info-box-comp">
                <p>${data.company.email} | ${data.company.phone} </p>
              </div>` : ''}
              ${data.company.address ? `<div > 
                <p>${[data.company.address, data.company.city, data.company.state, data.company.zipCode].filter(Boolean).join(', ')}</p>
              </div>` : ''}
              
            </div>

             <div class="invoice-header">
              <h1>INVOICE</h1>
              <div class="invoice-number">#${data.invoiceNumber}</div>
              <div class="invoice-date">Date: ${getDateString(data.date)}</div>
              <div class="invoice-date">Due: ${data.dueDate ? getDateString(data.dueDate) : getDateString(new Date(data.date.getTime() + 15 * 24 * 60 * 60 * 1000))}</div>
              <span class="status-badge status-${data.status.toLowerCase()}">${data.status.toUpperCase()}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">SERVICE DETAILS</div>
            <table>
              <thead>
                <tr>
                  <th>JobCard #</th>
                  <th>Vehicle</th>
                  <th>Plate # | Year</th>
                  <th>Service</th>
                  <th style="text-align: right; width: 110px;">Amount(AED)</th>
                </tr>
              </thead>
              <tbody>
                ${vehicleRows}
              </tbody>
            </table>

            <div class="totals-section">
              <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-amount">AED ${calculatedSubtotal.toFixed(2)}</span>
              </div>
              ${data.showReferralCommission ? `<div class="total-row">
                <span class="total-label">Referral Commission:</span>
                <span class="total-amount">AED ${data.referralTotal.toFixed(2)}</span>
              </div>` : ''}
              <div class="total-row grand-total">
                <span class="total-label">TOTAL AMOUNT:</span>
                <span class="total-amount">AED ${(data.showReferralCommission ? (calculatedSubtotal + data.referralTotal) : calculatedSubtotal).toFixed(2)}</span>
              </div>
              ${data.amountStatus ? `<div class="total-row" style="background: #f0f6fb; border: 1px dashed #27ae60;">
                <span class="total-label" style="font-weight: 600; color: #27ae60;">Amount Status:</span>
                <span style="text-align: right; font-size: 12px; text-transform: capitalize;">${data.amountStatus}</span>
              </div>` : ''}
              ${data.amountStatus === 'cancelled' && data.cancellationReason ? `<div class="total-row" style="background: #fef2f2; border: 1px dashed #dc2626;">
                <span class="total-label" style="font-weight: 600; color: #dc2626;">Cancellation Reason:</span>
                <span style="color: #dc2626;">${data.cancellationReason}</span>
              </div>` : ''}
              ${data.paymentMethod ? `<div class="total-row" style="background: #f0f6fb; border: 1px dashed #27ae60;">
                <span class="total-label" style="font-weight: 600; color: #27ae60;">Payment Method:</span>
                <span style="text-align: right; font-size: 12px; white-space: nowrap;">${data.paymentMethod}</span>
              </div>` : ''}
              ${data.validityDate ? `<div class="total-row" style="background: #f0f6fb; border: 1px dashed #27ae60;">
                <span class="total-label" style="font-weight: 600; color: #27ae60;">Valid Until:</span>
                <span style="text-align: right; font-size: 12px;">${getDateString(data.validityDate)}</span>
              </div>` : ''}
            </div>
            <img src="/images/sample-stamp.png" style="width: 130px !important; height: 120px !important; display: block; margin: -5px auto 0 auto; margin-left: auto; margin-right: 0; opacity: 0.6;" alt="Approved Stamp" />
          </div>

          ${data.notes ? `<div class="notes-section">
            <label>NOTES:</label>
            <p>${data.notes}</p>
          </div>` : ''}

          <div class="footer">
            <p>This is a computer-generated invoice. No signature is required.</p>
            <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const element = document.createElement('div');
  element.innerHTML = htmlContent;

  const options = {
    margin: 10,
    filename: `Invoice_${data.invoiceNumber}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait' as const, unit: 'mm' as const, format: 'a4' },
  };

  try {
    await (html2pdf() as any).set(options).from(element).save();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
