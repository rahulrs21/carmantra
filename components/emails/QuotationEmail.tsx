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

interface QuotationEmailProps {
  customerName: string;
  jobCardNo: string;
  quotationNumber: string;
  total: number;
  validityDays?: number;
  companyName?: string;
  contactName?: string;
  vehicles?: Array<{
    plate: string;
    brand: string;
    model: string;
    year: number;
    serviceAmount: number;
  }>;
  serviceTitle?: string;
  companyAddress?: string;
  companyCity?: string;
  companyEmail?: string;
  companyPhone?: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const QuotationEmail = ({
  customerName,
  jobCardNo,
  quotationNumber,
  total,
  validityDays = 30,
  companyName,
  contactName,
  vehicles = [],
  serviceTitle = 'Service',
  companyAddress,
  companyCity,
  companyEmail,
  companyPhone,
}: QuotationEmailProps) => {
  const displayName = companyName || contactName || customerName;

  

  return (
    <Html>
      <Head />
      <Preview>Quotation Ready for Review - Job Card #{jobCardNo}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header Section */}
          <Section style={headerSection}>
            <Row style={headerRow}>
              <Column>
                <Heading style={headerHeading}>Car Mantra</Heading>
                <Text style={headerSubtext}>Premium Auto Care Services</Text>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={contentSection}>
            <Heading style={mainHeading}>
              📋 Quotation Ready!
            </Heading>
            <Text style={greetingText}>Dear {displayName},</Text>
            <Text style={bodyText}>
              Your quotation for {serviceTitle} has been prepared and is ready for review. 
              Please find the complete details below including all vehicles and service costs.
            </Text>

            {/* Quotation Summary Card */}
            <Section style={summaryCard}>
              <Row>
                <Column style={summaryItemColumn}>
                  <Text style={summaryLabel}>Quotation #</Text>
                  <Text style={summaryValue}>{quotationNumber}</Text>
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
                  <Text style={summaryLabel}>Valid For</Text>
                  <Text style={summaryValue}>{validityDays} days</Text>
                </Column>
              </Row>
            </Section>

            {/* Vehicles Section */}
            {vehicles && vehicles.length > 0 && (
              <Section style={vehiclesSection}>
                <Text style={sectionTitle}>🚗 Vehicles Included</Text>
                {vehicles.map((vehicle, idx) => (
                  <Section key={idx} style={vehicleCard}>
                    <Row>
                      <Column>
                        <Text style={vehicleName}>
                          {vehicle.brand} {vehicle.model} ({vehicle.year})
                        </Text>
                        <Text style={vehicleDetail}>
                          Plate: <strong>{vehicle.plate}</strong>
                        </Text>
                      </Column>
                      <Column style={{ textAlign: 'right' as const }}>
                        <Text style={vehicleAmount}>
                          AED {vehicle.serviceAmount.toFixed(2)}
                        </Text>
                      </Column>
                    </Row>
                  </Section>
                ))}
              </Section>
            )}

            {/* Info Box */}
            <Section style={infoBox}>
              <Text style={infoTitle}>
                📎 Quotation Attached
              </Text>
              <Text style={infoText}>
                Please find the detailed quotation attached to this email. 
                Review all items, rates, and terms carefully.
              </Text>
            </Section>

            {/* Next Steps */}
            <Section style={stepsSection}>
              <Text style={stepsTitle}>📝 Next Steps:</Text>
              <Text style={stepItem}>
                1. Review the quotation carefully
              </Text>
              <Text style={stepItem}>
                2. Contact us to confirm or discuss any modifications
              </Text>
              <Text style={stepItem}>
                3. Once approved, we will proceed with the service
              </Text>
            </Section>

            {/* CTA Button */}
            {/* <Section style={ctaSection}>
              <Button style={ctaButton} href={`${baseUrl}/admin/quotation`}>
                View Full Quotation
              </Button>
            </Section> */}

            {/* Questions Section */}
            <Section style={questionsSection}>
              <Text style={questionsTitle}>Questions about this quotation?</Text>
              <Text style={questionsText}>
                We're here to help. Contact us:
              </Text>
              <Text style={contactInfo}>
                📞 Phone: <Link href="tel:+971123456">+971 (0) 4 XXX XXXX</Link>
              </Text>
              <Text style={contactInfo}>
                📧 Email: <Link href="mailto:support@carmantra.ae">support@carmantra.ae</Link>
              </Text>
            </Section>

            {/* Footer Message */}
            <Text style={footerMessage}>
              Thank you for considering Car Mantra!<br />
              <strong>Car Mantra Team</strong>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Hr style={footerDivider} />
            <Text style={footerText}>
              © {new Date().getFullYear()} Car Mantra. All rights reserved.
            </Text>
            <Text style={footerSubtext}>
              info@carmantra.ae | +971 (0) 4 XXX XXXX
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default QuotationEmail;

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
  background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
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
  backgroundColor: '#f0f9ff',
  border: '1px solid #bfdbfe',
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
  color: '#3b82f6',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
};

const divider = {
  borderColor: '#bfdbfe',
  margin: '15px 0',
};

const infoBox = {
  backgroundColor: '#dbeafe',
  borderLeft: '4px solid #3b82f6',
  padding: '15px',
  borderRadius: '4px',
  margin: '20px 0',
};

const infoTitle = {
  color: '#1e40af',
  fontSize: '13px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const infoText = {
  color: '#1e40af',
  fontSize: '13px',
  margin: '0',
};

const stepsSection = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const stepsTitle = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 15px 0',
};

const stepItem = {
  color: '#374151',
  fontSize: '13px',
  margin: '8px 0',
  lineHeight: '1.6',
};

const ctaSection = {
  textAlign: 'center' as const,
  marginTop: '30px',
  marginBottom: '30px',
};

const ctaButton = {
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  padding: '12px 30px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  display: 'inline-block',
};

const questionsSection = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const questionsTitle = {
  color: '#1e40af',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const questionsText = {
  color: '#1e40af',
  fontSize: '13px',
  margin: '0 0 10px 0',
};

const contactInfo = {
  color: '#1e40af',
  fontSize: '13px',
  margin: '5px 0',
};

const vehiclesSection = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const sectionTitle = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 15px 0',
};

const vehicleCard = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '12px',
  margin: '10px 0',
};

const vehicleName = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 5px 0',
};

const vehicleDetail = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0',
};

const vehicleAmount = {
  color: '#3b82f6',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
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
