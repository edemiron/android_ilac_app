/**
 * Composio Service for Ilac Hatirlatici
 * Backend service to handle medication reminders via external channels
 */

const { Composio } = require('composio-core');

class ComposioService {
  constructor() {
    this.composio = new Composio({ 
      apiKey: process.env.COMPOSIO_API_KEY 
    });
  }

  /**
   * Send email medication reminder
   * @param {string} email - Recipient email
   * @param {Object} medicine - Medicine details
   * @param {string} reminderTime - Time to take medicine
   */
  async sendEmailReminder(email, medicine, reminderTime) {
    try {
      const result = await this.composio.actions.execute({
        actionName: 'GMAIL_SEND_EMAIL',
        params: {
          recipient_email: email,
          subject: `💊 İlaç Hatırlatma: ${medicine.name}`,
          body: this.formatEmailBody(medicine, reminderTime),
        },
      });
      
      console.log('Email sent:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('Email send failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Slack notification
   * @param {string} channel - Slack channel
   * @param {Object} medicine - Medicine details
   */
  async sendSlackReminder(channel, medicine) {
    try {
      const result = await this.composio.actions.execute({
        actionName: 'SLACK_CHAT_POST_MESSAGE',
        params: {
          channel: channel,
          text: `💊 *İlaç Hatırlatma*\n\n` +
                `*İlaç:* ${medicine.name}\n` +
                `*Doz:* ${medicine.dosage}\n` +
                `*Saat:* ${medicine.time}\n` +
                `\nİlacınızı almayı unutmayın! 🕐`,
        },
      });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Slack send failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create Google Calendar event for medication
   * @param {Object} medicine - Medicine details
   * @param {Date} dateTime - Event date and time
   */
  async createCalendarEvent(medicine, dateTime) {
    try {
      const endTime = new Date(dateTime.getTime() + 15 * 60000); // +15 minutes
      
      const result = await this.composio.actions.execute({
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
      });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Calendar event creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send WhatsApp message (if available)
   * @param {string} phoneNumber - Recipient phone
   * @param {Object} medicine - Medicine details
   */
  async sendWhatsAppReminder(phoneNumber, medicine) {
    try {
      const result = await this.composio.actions.execute({
        actionName: 'WHATSAPP_SEND_MESSAGE',
        params: {
          phone_number: phoneNumber,
          message: `💊 İlaç Hatırlatma\n\n` +
                   `İlaç: ${medicine.name}\n` +
                   `Doz: ${medicine.dosage}\n` +
                   `Saat: ${medicine.time}\n\n` +
                   `Sağlıklı günler! 🏥`,
        },
      });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('WhatsApp send failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper methods
  formatEmailBody(medicine, reminderTime) {
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

module.exports = ComposioService;
