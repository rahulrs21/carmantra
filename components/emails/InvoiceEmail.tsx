import React from 'react';
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';

interface InvoiceEmailProps {
  customerName: string;
  jobCardNo: string;
  invoiceNumber: string;
  total: number;
  paymentStatus?: string;
  companyName?: string;
  contactName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyCity?: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const InvoiceEmail = ({
  customerName,
  jobCardNo,
  invoiceNumber,
  total,
  paymentStatus = 'unpaid',
  companyName,
  contactName,
  companyEmail,
  companyPhone,
  companyAddress,
  companyCity,
}: InvoiceEmailProps) => {
  const displayName = companyName || contactName || customerName;
  const isPaid = paymentStatus === 'paid';

  console.log('JOB CARD NUMBER1 = ', jobCardNo)

  return (
    <Html>
      <Head />
      <Preview>Your Service Invoice - Invoice #{invoiceNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header Section */}
          <Section style={headerSection}>
            <Row style={headerRow}>
              <Column>
                <Heading style={headerHeading}>{companyName || 'Car Mantra'}</Heading>
                <Text style={headerSubtext}>Premium Auto Care Services</Text>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={contentSection}>
            <Heading style={mainHeading}>
              ✓ Service Complete!
            </Heading>
            <Text style={greetingText}>Dear {displayName},</Text>
            <Text style={bodyText}>
              Excellent news! Your service has been completed successfully. 
              Your vehicle is ready for pickup. Please find your invoice details below.
            </Text>

            {/* Invoice Summary Card */}
            <Section style={summaryCard}>
              <Row>
                <Column style={summaryItemColumn}>
                  <Text style={summaryLabel}>Invoice #</Text>
                  <Text style={summaryValue}>{invoiceNumber}</Text>
                </Column>
                <Column style={summaryItemColumn}>
                  <Text style={summaryLabel}>Job Card #</Text>
                  <Text style={summaryValue}>{jobCardNo}</Text>
                </Column>
              </Row>

              <Hr style={divider} />

              <Row>
                <Column style={summaryItemColumn}>
                  <Text style={summaryLabel}>Total Amount</Text>
                  <Text style={totalValue}>
                    AED {parseFloat(String(total)).toFixed(2)}
                  </Text>
                </Column>
                <Column style={summaryItemColumn}>
                  <Text style={summaryLabel}>Payment Status</Text>
                  <Text style={{
                    ...summaryValue,
                    color: isPaid ? '#10b981' : '#ef4444',
                  }}>
                    {isPaid ? 'PAID' : 'UNPAID'}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Invoice Attached Info */}
            <Section style={infoBox}>
              <Text style={infoTitle}>
                📎 Invoice Attached
              </Text>
              <Text style={infoText}>
                Please find your detailed invoice attached to this email. 
                Review all charges and payment details carefully.
              </Text>
            </Section>

            {/* Pickup Details */}
            <Section style={pickupSection}>
              <Text style={pickupTitle}>🚗 Pickup Details</Text>
              <Text style={pickupItem}>
                • Visit our facility during business hours to collect your vehicle
              </Text>
              <Text style={pickupItem}>
                • Bring this invoice or Job Card #{jobCardNo} for quick reference
              </Text>
              <Text style={pickupItem}>
                • Please inspect your vehicle and let us know if you're satisfied
              </Text>
              {!isPaid && (
                <Text style={pickupItem}>
                  • Complete the payment if not already done
                </Text>
              )}
            </Section>

            {/* Quality Guarantee */}
            <Section style={guaranteeSection}>
              <Text style={guaranteeTitle}>✨ Quality Guarantee</Text>
              <Text style={guaranteeText}>
                We provide a 100% satisfaction guarantee on all our services. 
                If you have any concerns about the work done, please contact us immediately.
              </Text>
            </Section>

            {/* CTA Button */}
            {/* <Section style={ctaSection}>
              <Button style={ctaButton} href={`${baseUrl}/admin/invoice`}>
                View Full Invoice
              </Button>
            </Section> */}

            {/* Contact Section */}
            <Section style={contactSection}>
              <Text style={contactTitle}>Need assistance?</Text>
              <Text style={contactText}>
                For pickup details or any questions about your invoice:
              </Text>
              <Text style={contactInfo}>
                📞 Phone: <Link href={`tel:${companyPhone || '+971123456'}`}>{companyPhone || '+971 (0) 4 XXX XXXX'}</Link>
              </Text>
              <Text style={contactInfo}>
                📧 Email: <Link href={`mailto:${companyEmail || 'support@carmantra.ae'}`}>{companyEmail || 'support@carmantra.ae'}</Link>
              </Text>
            </Section>

            {/* Payment Methods (if unpaid) */}
            {!isPaid && (
              <Section style={paymentSection}>
                <Text style={paymentTitle}>💳 Payment Methods</Text>
                <Text style={paymentText}>
                  We accept multiple payment options for your convenience:
                </Text>
                <Text style={paymentItem}>
                  • Credit/Debit Card
                </Text>
                <Text style={paymentItem}>
                  • Bank Transfer
                </Text>
                <Text style={paymentItem}>
                  • Cash at our facility
                </Text>
                <Text style={paymentItem}>
                  • Tabby/Tamara (Buy Now, Pay Later)
                </Text>
              </Section>
            )}

            {/* Footer Message */}
            <Text style={footerMessage}>
              Thank you for choosing {companyName || 'Car Mantra'}!<br />
              <strong>{companyName || 'Car Mantra'} Team</strong>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Hr style={footerDivider} />
            <Text style={footerText}>
              © {new Date().getFullYear()} {companyName || 'Car Mantra'}. All rights reserved.
            </Text>
            <Text style={footerSubtext}>
              {companyEmail || 'info@carmantra.ae'} | {companyPhone || '+971 (0) 4 XXX XXXX'}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default InvoiceEmail;

// Styles
const main = {
  backgroundColor: '#f3f4f6',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0',
  marginBottom: '64px',
};

const headerSection = {
  background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
  padding: '30px',
  textAlign: 'center' as const,
};

const headerRow = {
  width: '100%',
};

const logoColumn = {
  display: 'none',
};

const logo = {
  display: 'none',
};

const headerTextColumn = {
  display: 'none',
};

const headerHeading = {
  color: '#111827',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const headerSubtext = {
  color: '#111827',
  opacity: 0.9,
  fontSize: '14px',
  margin: '5px 0 0 0',
};

const contentSection = {
  padding: '30px 20px',
};

const mainHeading = {
  color: '#111827',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
  textAlign: 'center' as const,
};

const greetingText = {
  color: '#111827',
  fontSize: '14px',
  margin: '0 0 15px 0',
};

const bodyText = {
  color: '#111827',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 20px 0',
};

const summaryCard = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const summaryItemColumn = {
  paddingRight: '20px',
  paddingBottom: '15px',
};

const summaryLabel = {
  color: '#374151',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '0 0 5px 0',
};

const summaryValue = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
};

const totalValue = {
  color: '#10b981',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
};

const divider = {
  borderColor: '#bbf7d0',
  margin: '15px 0',
};

const infoBox = {
  backgroundColor: '#dcfce7',
  borderLeft: '4px solid #10b981',
  padding: '15px',
  borderRadius: '4px',
  margin: '20px 0',
};

const infoTitle = {
  color: '#166534',
  fontSize: '13px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const infoText = {
  color: '#166534',
  fontSize: '13px',
  margin: '0',
};

const pickupSection = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const pickupTitle = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 15px 0',
};

const pickupItem = {
  color: '#374151',
  fontSize: '13px',
  margin: '8px 0',
  lineHeight: '1.6',
};

const guaranteeSection = {
  backgroundColor: '#faf5ff',
  border: '1px solid #e9d5ff',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const guaranteeTitle = {
  color: '#6b21a8',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const guaranteeText = {
  color: '#6b21a8',
  fontSize: '13px',
  margin: '0',
  lineHeight: '1.6',
};

const paymentSection = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fcd34d',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const paymentTitle = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const paymentText = {
  color: '#92400e',
  fontSize: '13px',
  margin: '0 0 10px 0',
};

const paymentItem = {
  color: '#92400e',
  fontSize: '13px',
  margin: '5px 0',
};

const ctaSection = {
  textAlign: 'center' as const,
  marginTop: '30px',
  marginBottom: '30px',
};

const ctaButton = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  padding: '12px 30px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  display: 'inline-block',
};

const contactSection = {
  backgroundColor: '#ecfdf5',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const contactTitle = {
  color: '#166534',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const contactText = {
  color: '#166534',
  fontSize: '13px',
  margin: '0 0 10px 0',
};

const contactInfo = {
  color: '#166534',
  fontSize: '13px',
  margin: '5px 0',
};

const footerMessage = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '20px 0 0 0',
};

const footer = {
  backgroundColor: '#f3f4f6',
  padding: '20px 20px',
  textAlign: 'center' as const,
};

const footerDivider = {
  borderColor: '#e5e7eb',
};

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0',
};

const footerSubtext = {
  color: '#9ca3af',
  fontSize: '11px',
  margin: '5px 0 0 0',
};
