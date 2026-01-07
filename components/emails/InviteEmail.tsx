import React from 'react';

interface InviteEmailProps {
  displayName: string;
  email: string;
  inviteLink: string;
  inviteExpiresIn: number; // days
  senderName?: string;
}

export default function InviteEmail({
  displayName,
  email,
  inviteLink,
  inviteExpiresIn = 7,
  senderName = 'Car Mantra Admin',
}: InviteEmailProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(90deg, #1e3a8a, #2563eb)',
          color: 'white',
          padding: '30px 20px',
          textAlign: 'center',
          borderRadius: '10px 10px 0 0',
        }}
      >
        <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', fontWeight: 'bold' }}>
          You're Invited to Join!
        </h1>
        <p style={{ margin: '0', fontSize: '14px', opacity: 0.9 }}>
          Car Mantra CRM Platform
        </p>
      </div>

      {/* Body */}
      <div style={{ backgroundColor: '#f9fafb', padding: '30px 20px' }}>
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {/* Greeting */}
          <p style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#111827', lineHeight: '1.6' }}>
            Hi <strong>{displayName}</strong>,
          </p>

          {/* Welcome Message */}
          <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
            {senderName} has invited you to join the <strong>Car Mantra CRM</strong> platform. You're just one step away from getting started!
          </p>

          {/* Info Box */}
          <div style={{ backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '6px', marginBottom: '20px', borderLeft: '4px solid #2563eb' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6b7280' }}>
              <strong>Email:</strong> {email}
            </p>
            <p style={{ margin: '0', fontSize: '13px', color: '#6b7280' }}>
              <strong>Expires in:</strong> {inviteExpiresIn} days
            </p>
          </div>

          {/* CTA Button */}
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <a
              href={inviteLink}
              style={{
                display: 'inline-block',
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '12px 32px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '16px',
                transition: 'background-color 0.3s',
              }}
            >
              Accept Invitation
            </a>
          </div>

          {/* Alternative Link */}
          <p style={{ margin: '20px 0 15px 0', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
            Or copy and paste this link in your browser:
          </p>
          <div
            style={{
              backgroundColor: '#f3f4f6',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              wordBreak: 'break-all',
              fontSize: '12px',
              color: '#374151',
              fontFamily: 'monospace',
              border: '1px solid #e5e7eb',
            }}
          >
            <a href={inviteLink} style={{ color: '#2563eb', textDecoration: 'none' }}>
              {inviteLink}
            </a>
          </div>

          {/* Instructions */}
          <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '6px', marginBottom: '20px', borderLeft: '4px solid #0ea5e9' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0369a1', fontWeight: 'bold' }}>
              ℹ️ What happens next?
            </p>
            <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '13px', color: '#374151' }}>
              <li style={{ marginBottom: '6px' }}>Click the "Accept Invitation" button above</li>
              <li style={{ marginBottom: '6px' }}>Create your own password</li>
              <li>Start using Car Mantra CRM!</li>
            </ol>
          </div>

          {/* Warning */}
          <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#dc2626', fontStyle: 'italic' }}>
            ⚠️ This invitation link will expire in {inviteExpiresIn} days. Please accept it soon.
          </p>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '20px 0 15px 0' }}></div>

          {/* Closing */}
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#111827' }}>
            If you didn't expect this invitation or have any questions, please contact{' '}
            <span style={{ color: '#2563eb' }}>support@carmantra.com</span>
          </p>

          <p style={{ margin: '0', fontSize: '14px', color: '#111827' }}>
            Best regards,<br />
            <strong>Car Mantra Team</strong>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: '#f3f4f6', textAlign: 'center', padding: '15px', fontSize: '12px', color: '#6b7280', borderRadius: '0 0 10px 10px' }}>
        © {new Date().getFullYear()} Car Mantra. All rights reserved.
        <br />
        <a href="https://carmantra.com" style={{ color: '#2563eb', textDecoration: 'none' }}>
          Visit Our Website
        </a>
      </div>
    </div>
  );
}
