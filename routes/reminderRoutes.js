import express from 'express';
import prisma from '../prismaClient.js';
import schedule from 'node-schedule';
import nodemailer from 'nodemailer';

const router = express.Router();

// === Email setup ===
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});


// === Create a new reminder ===
router.post('/create', async (req, res) => {
  try {
    const { message, date, userId } = req.body;
    
    // Validate the date
    const reminderDate = new Date(date);
    if (isNaN(reminderDate)) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO 8601 format.' });
    }
    
    // Validate user existence
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    // Create the reminder
    const reminder = await prisma.reminder.create({
      data: {
        message,
        date: reminderDate,
        userId,
      },
    });
    
    // Schedule the reminder email
    schedule.scheduleJob(reminderDate, async () => {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Reminder Notification',
                text: `Hello ${user.name},\n\nThis is a reminder for: "${message}".\n\nBest regards,\nYour App Team`,
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log('Error sending email:', error);
              } else {
                console.log('Reminder email sent:', info.response);
              }
            });
          });
          
          res.status(201).json(reminder);
        } catch (error) {
          console.error('Error creating reminder:', error.message);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });
      
      // === Get all reminders for a user ===
      router.get('/:userId', async (req, res) => {
        try {
          const { userId } = req.params;
          
          const reminders = await prisma.reminder.findMany({
            where: { userId: parseInt(userId) },
          });
          
          res.json(reminders);
        } catch (error) {
          console.error('Error fetching reminders:', error.message);
          res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  export default router;
  