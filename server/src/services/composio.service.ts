import { Composio } from 'composio-core';

export interface Medicine {
  name: string;
  dosage: string;
  time?: string;
  instructions?: string;
}

/**
 * Executes a function with automatic retries for stability
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      console.warn(`Attempt ${attempt} failed.`);
      if (attempt >= retries) throw error;
      await new Promise(res => setTimeout(res, delayMs * attempt)); // exponential backoff
    }
  }
  throw new Error("Retry failed");
}

class ComposioService {
  private composio: any;

  constructor() {
    this.composio = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY || ''
    } as any);
  }

  async sendEmailReminder(email: string, medicine: Medicine, reminderTime: string) {
    try {
      const result = await withRetry(() => this.composio.actions.execute({
        actionName: 'GMAIL_SEND_EMAIL',
        params: {
          recipient_email: email,
          subject: `💊 İlaç Hatırlatma: ${medicine.name}`,
          body: this.formatEmailBody(medicine, reminderTime),
        },
      }));
      console.log('Email sent:', result);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Email send failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendSlackReminder(channel: string, medicine: Medicine) {
    try {
      const result = await withRetry(() => this.composio.actions.execute({
        actionName: 'SLACK_CHAT_POST_MESSAGE',
        params: {
          channel: channel,
          text: `💊 *İlaç Hatırlatma*\n\n` +
            `*İlaç:* ${medicine.name}\n` +
            `*Doz:* ${medicine.dosage}\n` +
            `*Saat:* ${medicine.time}\n` +
            `\nİlacınızı almayı unutmayın! 🕐`,
        },
      }));
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Slack send failed:', error);
      return { success: false, error: error.message };
    }
  }

  async createCalendarEvent(medicine: Medicine, dateTime: Date) {
    try {
      const endTime = new Date(dateTime.getTime() + 15 * 60000); // +15 minutes
      const result = await withRetry(() => this.composio.actions.execute({
        actionName: 'GOOGLECALENDAR_CREATE_EVENT',
        params: {
          summary: `💊 ${medicine.name} (${medicine.dosage})`,
          description: `İlaç hatırlatma\n\n` +
            `İlaç: ${medicine.name}\n` +
            `Doz: ${medicine.dosage}\n` +
            `Talimat: ${medicine.instructions || 'Yemeklerden sonra'}`,
          start_time: dateTime.toISOString(),
          end_time: endTime.toISOString(),
        },
      }));
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Calendar event creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWhatsAppReminder(phoneNumber: string, medicine: Medicine) {
    try {
      const result = await withRetry(() => this.composio.actions.execute({
        actionName: 'WHATSAPP_SEND_MESSAGE',
        params: {
          phone_number: phoneNumber,
          message: `💊 İlaç Hatırlatma\n\n` +
            `İlaç: ${medicine.name}\n` +
            `Doz: ${medicine.dosage}\n` +
            `Saat: ${medicine.time}\n\n` +
            `Sağlıklı günler! 🏥`,
        },
      }));
      return { success: true, data: result };
    } catch (error: any) {
      console.error('WhatsApp send failed:', error);
      return { success: false, error: error.message };
    }
  }

  private formatEmailBody(medicine: Medicine, reminderTime: string): string {
    return `
      <h2>💊 İlaç Hatırlatma</h2>
      <p>Sayın Kullanıcı,</p>
      <p><strong>${reminderTime}</strong> saatinde ilacınızı almanın zamanı geldi!</p>
      
      <h3>İlaç Bilgileri:</h3>
      <ul>
        <li><strong>İlaç Adı:</strong> ${medicine.name}</li>
        <li><strong>Doz:</strong> ${medicine.dosage}</li>
        <li><strong>Talimat:</strong> ${medicine.instructions || 'Yemeklerden sonra'}</li>
      </ul>
      
      <p>İlacınızı aldıktan sonra uygulamadan onaylayabilirsiniz.</p>
      
      <hr>
      <p><small>Bu mesaj İlaç Hatırlatıcı uygulaması tarafından otomatik gönderilmiştir.</small></p>
    `;
  }
}

export default new ComposioService();
