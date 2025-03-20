export interface Email {
  id?: string;
  subject: string;
  body: string;
  recipients: string[]; // Array of email addresses
  senderName: string;
  senderEmail: string;
  sentAt?: Date;
  status?: 'pending' | 'sent' | 'failed';
} 