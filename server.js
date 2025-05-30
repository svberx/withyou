// === Dependencies ===
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import prisma from './prismaClient.js';
import authRoutes from './routes/authRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import schedule from 'node-schedule';
import nodemailer from 'nodemailer';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the server!');
});

// === Routes ===
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reminders', reminderRoutes);

// === Email Notification Setup ===
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// === Schedule Email Notifications ===
const scheduleReminders = async () => {
    const reminders = await prisma.reminder.findMany({
        where: { date: { gte: new Date() }},
        include: { user: true }
    });

    reminders.forEach(reminder => {
        schedule.scheduleJob(reminder.date, async () => {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: reminder.user.email,
                subject: 'Reminder Notification',
                text: `Hello ${reminder.user.name},\n\nThis is a reminder for: "${reminder.message}".\n\nBest regards,\nYour App Team`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) console.log('Error sending email:', error);
                else console.log('Reminder email sent:', info.response);
            });
        });
    });
};

scheduleReminders();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
