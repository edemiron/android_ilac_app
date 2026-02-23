import express, { Request, Response } from 'express';
import composioService, { Medicine } from '../services/composio.service';

const router = express.Router();

/**
 * POST /api/reminders/email
 */
router.post('/email', async (req: Request, res: Response) => {
    try {
        const { email, medicine, reminderTime } = req.body;
        if (!email || !medicine) {
            return res.status(400).json({ error: 'Email and medicine details required' });
        }

        const result = await composioService.sendEmailReminder(
            email as string,
            medicine as Medicine,
            reminderTime as string
        );

        if (result.success) {
            res.json({ success: true, message: 'Reminder email sent successfully', data: result.data });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error: any) {
        console.error('Email reminder error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/reminders/slack
 */
router.post('/slack', async (req: Request, res: Response) => {
    try {
        const { channel, medicine } = req.body;
        if (!channel || !medicine) {
            return res.status(400).json({ error: 'Channel and medicine details required' });
        }

        const result = await composioService.sendSlackReminder(
            channel as string,
            medicine as Medicine
        );

        if (result.success) {
            res.json({ success: true, message: 'Slack reminder sent successfully', data: result.data });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error: any) {
        console.error('Slack reminder error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/reminders/calendar
 */
router.post('/calendar', async (req: Request, res: Response) => {
    try {
        const { medicine, dateTime } = req.body;
        if (!medicine || !dateTime) {
            return res.status(400).json({ error: 'Medicine details and dateTime required' });
        }

        const result = await composioService.createCalendarEvent(
            medicine as Medicine,
            new Date(dateTime as string)
        );

        if (result.success) {
            res.json({ success: true, message: 'Calendar event created successfully', data: result.data });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error: any) {
        console.error('Calendar event error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/reminders/whatsapp
 */
router.post('/whatsapp', async (req: Request, res: Response) => {
    try {
        const { phoneNumber, medicine } = req.body;
        if (!phoneNumber || !medicine) {
            return res.status(400).json({ error: 'Phone number and medicine details required' });
        }

        const result = await composioService.sendWhatsAppReminder(
            phoneNumber as string,
            medicine as Medicine
        );

        if (result.success) {
            res.json({ success: true, message: 'WhatsApp reminder sent successfully', data: result.data });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error: any) {
        console.error('WhatsApp reminder error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/reminders/batch
 */
router.post('/batch', async (req: Request, res: Response) => {
    try {
        const { channels, medicine, reminderTime } = req.body;
        const results = [];

        if (channels?.email) {
            const emailResult = await composioService.sendEmailReminder(
                channels.email,
                medicine as Medicine,
                reminderTime as string
            );
            results.push({ channel: 'email', ...emailResult });
        }

        if (channels?.slack) {
            const slackResult = await composioService.sendSlackReminder(
                channels.slack,
                medicine as Medicine
            );
            results.push({ channel: 'slack', ...slackResult });
        }

        if (channels?.whatsapp) {
            const waResult = await composioService.sendWhatsAppReminder(
                channels.whatsapp,
                medicine as Medicine
            );
            results.push({ channel: 'whatsapp', ...waResult });
        }

        res.json({ success: true, results });
    } catch (error: any) {
        console.error('Batch reminder error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
