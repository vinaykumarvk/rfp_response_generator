import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Check if SendGrid API key is available
if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY is not set. Email functionality will not work.');
}

// Initialize SendGrid with API key if available
try {
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }
} catch (error) {
  console.error('Error initializing SendGrid:', error);
}

/**
 * Send an email with attachments using SendGrid
 */
export async function sendEmail({
  to,
  from = 'noreply@yourdomain.com', // This should be a verified sender in SendGrid
  subject,
  text,
  html,
  attachments = [],
}: {
  to: string | string[];
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    content: string;
    filename: string;
    type?: string;
    disposition?: 'attachment' | 'inline';
  }[];
}): Promise<{ success: boolean; message: string }> {
  if (!process.env.SENDGRID_API_KEY) {
    return {
      success: false,
      message: 'SendGrid API key not configured',
    };
  }

  try {
    // Prepare the email message
    const msg = {
      to,
      from,
      subject,
      text: text || 'Please view this email with an HTML-compatible email viewer.',
      html: html || '<p>Please view this email with an HTML-compatible email viewer.</p>',
      attachments,
    };

    // Send the email
    await sgMail.send(msg);

    return {
      success: true,
      message: 'Email sent successfully',
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      message: `Failed to send email: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Create a temporary file and return its path
 */
export function createTempFile(content: string, filename: string): string {
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, filename);
  
  fs.writeFileSync(tempFilePath, content);
  
  return tempFilePath;
}

/**
 * Convert a file to base64 for SendGrid attachment
 */
export function fileToBase64Attachment(filePath: string, filename: string, type = 'text/markdown') {
  const content = fs.readFileSync(filePath).toString('base64');
  
  return {
    content,
    filename,
    type,
    disposition: 'attachment' as const,
  };
}