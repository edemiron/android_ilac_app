/**
 * API Routes for Medication Reminders
 * POST /api/reminders/send
 */

const express = require('express');
const router = express.Router();
const ComposioService = require('../composio-service');

const composioService = new ComposioService();

/**
 * POST /api/reminders/email
 * Send medication reminder via email
 */
router.post('/email', async (req, res) => {
  try {
    const { email, medicine, reminderTime } = req.body;
    
    if (!email || !medicine) {
      return res.status(400).json({ 
        error: 'Email and medicine details required' 
      });
    }

    const result = await composioService.sendEmailReminder(
      email, 
      medicine, 
      reminderTime
    );

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Reminder email sent successfully',
        data: result.data 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Email reminder error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/reminders/slack
 * Send medication reminder via Slack
 */
router.post('/slack', async (req, res) => {
  try {
    const { channel, medicine } = req.body;
    
    if (!channel || !medicine) {
      return res.status(400).json({ 
        error: 'Channel and medicine details required' 
      });
    }

    const result = await composioService.sendSlackReminder(channel, medicine);

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Slack reminder sent successfully',
        data: result.data 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Slack reminder error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/reminders/calendar
 * Add medication to Google Calendar
 */
router.post('/calendar', async (req, res) => {
  try {
    const { medicine, dateTime } = req.body;
    
    if (!medicine || !dateTime) {
      return res.status(400).json({ 
        error: 'Medicine details and dateTime required' 
      });
    }

    const result = await composioService.createCalendarEvent(
      medicine, 
      new Date(dateTime)
    );

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Calendar event created successfully',
        data: result.data 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Calendar event error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/reminders/whatsapp
 * Send WhatsApp reminder
 */
router.post('/whatsapp', async (req, res) => {
  try {
    const { phoneNumber, medicine } = req.body;
    
    if (!phoneNumber || !medicine) {
      return res.status(400).json({ 
        error: 'Phone number and medicine details required' 
      });
    }

    const result = await composioService.sendWhatsAppReminder(
      phoneNumber, 
      medicine
    );

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'WhatsApp reminder sent successfully',
        data: result.data 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('WhatsApp reminder error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/reminders/batch
 * Send reminders through multiple channels
 */
router.post('/batch', async (req, res) => {
  try {
    const { channels, medicine, reminderTime } = req.body;
    // channels: { email: 'user@example.com', slack: '#channel', whatsapp: '+90555...' }
    
    const results = [];
    
    if (channels.email) {
      const emailResult = await composioService.sendEmailReminder(
        channels.email, 
        medicine, 
        reminderTime
      );
      results.push({ channel: 'email', ...emailResult });
    }
    
    if (channels.slack) {
      const slackResult = await composioService.sendSlackReminder(
        channels.slack, 
        medicine
      );
      results.push({ channel: 'slack', ...slackResult });
    }
    
    if (channels.whatsapp) {
      const waResult = await composioService.sendWhatsAppReminder(
        channels.whatsapp, 
        medicine
      );
      results.push({ channel: 'whatsapp', ...waResult });
    }

    res.json({ 
      success: true, 
      results 
    });
  } catch (error) {
    console.error('Batch reminder error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
