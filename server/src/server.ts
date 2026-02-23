import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import remindersRoute from './routes/reminders';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/reminders', remindersRoute);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    service: 'Ilac Hatirlatici API',
    composio: process.env.COMPOSIO_API_KEY ? 'Connected' : 'Not Configured'
  });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Composio: ${process.env.COMPOSIO_API_KEY ? '✅ Connected' : '❌ Not Configured'}`);
});
