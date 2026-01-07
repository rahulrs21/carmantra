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

interface BookingConfirmationEmailProps {
  customerName: string;
  jobCardNo: string;
  service: string;
  scheduledDate: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  phone: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const BookingConfirmationEmail = ({
  customerName,
  jobCardNo,
  service,
  scheduledDate,
  vehicleBrand,
  vehicleModel,
  vehiclePlate,
  phone,
}: BookingConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Service Booking Confirmed - Job Card #{jobCardNo}</Preview>
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
            🎉 Service Booking Confirmed!
          </Heading>
          <Text style={greetingText}>Dear {customerName},</Text>
          <Text style={bodyText}>
            Thank you for booking our services! Your booking has been confirmed. 
            Here are your booking details:
          </Text>

          {/* Booking Details Card */}
          <Section style={detailsCard}>
            <Row>
              <Column style={detailsColumn}>
                <Text style={detailLabel}>Job Card No:</Text>
                <Text style={detailValue}>{jobCardNo}</Text>
              </Column>
              <Column style={detailsColumn}>
                <Text style={detailLabel}>Service:</Text>
                <Text style={detailValue}>{service}</Text>
              </Column>
            </Row>

            <Hr style={divider} />

            <Row>
              <Column style={detailsColumn}>
                <Text style={detailLabel}>Scheduled Date & Time:</Text>
                <Text style={detailValue}>
                  {new Date(scheduledDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </Column>
            </Row>

            <Hr style={divider} />

            <Row>
              <Column style={detailsColumn}>
                <Text style={detailLabel}>Vehicle Details:</Text>
                <Text style={detailValue}>
                  {vehicleBrand} {vehicleModel}
                </Text>
                <Text style={plateBadge}>{vehiclePlate}</Text>
              </Column>
              <Column style={detailsColumn}>
                <Text style={detailLabel}>Contact:</Text>
                <Text style={detailValue}>{phone}</Text>
              </Column>
            </Row>
          </Section>

          {/* Important Notice */}
          <Section style={noticeSection}>
            <Text style={noticeTitle}>⏰ Important Information</Text>
            <Text style={noticeText}>
              • Please arrive <strong>10 minutes before</strong> your scheduled time
            </Text>
            <Text style={noticeText}>
              • Bring your vehicle documents and registration papers
            </Text>
            <Text style={noticeText}>
              • Make sure your vehicle has sufficient fuel
            </Text>
          </Section>

          {/* CTA Button */}
          {/* <Section style={ctaSection}>
            <Button style={ctaButton} href={`${baseUrl}/admin/book-service`}>
              View Booking Details
            </Button>
          </Section> */}

          {/* Need Help */}
          <Section style={helpSection}>
            <Text style={helpTitle}>Need to reschedule or cancel?</Text>
            <Text style={helpText}>
              Please contact us as soon as possible at:
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
            Best regards,<br />
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

export default BookingConfirmationEmail;

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
  backgroundColor: 'linear-gradient(90deg, #ea580c 0%, #f97316 100%)',
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

const detailsCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const detailsColumn = {
  paddingRight: '20px',
  paddingBottom: '15px',
};

const detailLabel = {
  color: '#374151',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '0 0 5px 0',
};

const detailValue = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
};

const plateBadge = {
  color: '#ea580c',
  fontSize: '12px',
  fontWeight: 'bold',
  backgroundColor: '#fed7aa',
  padding: '4px 8px',
  borderRadius: '4px',
  display: 'inline-block',
  marginTop: '5px',
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '15px 0',
};

const noticeSection = {
  backgroundColor: '#fef3c7',
  borderLeft: '4px solid #f59e0b',
  padding: '15px',
  borderRadius: '4px',
  margin: '20px 0',
};

const noticeTitle = {
  color: '#92400e',
  fontSize: '13px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const noticeText = {
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
  backgroundColor: '#ea580c',
  color: '#ffffff',
  padding: '12px 30px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  display: 'inline-block',
};

const helpSection = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const helpTitle = {
  color: '#1e40af',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const helpText = {
  color: '#1e40af',
  fontSize: '13px',
  margin: '0 0 10px 0',
};

const contactInfo = {
  color: '#1e40af',
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
