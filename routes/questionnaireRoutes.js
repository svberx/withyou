import express from 'express';
import prisma from '../prismaClient.js';

const router = express.Router();

// Save questionnaire responses
router.post('/submit', async (req, res) => {
  try {
    const {
      userId,
      bmi,
      fever,
      nausea,
      headache,
      diarrhea,
      fatigue,
      jaundice,
      epigastric,
    } = req.body;

    // Check if the user has a questionnaire already
    let questionnaire = await prisma.questionnaire.findFirst({
      where: { userId: parseInt(userId) },
    });

    // If the user doesn't have a questionnaire, create a new one
    if (!questionnaire) {
      questionnaire = await prisma.questionnaire.create({
        data: {
          userId: parseInt(userId),
          bmi,
          fever,
          nausea,
          headache,
          diarrhea,
          fatigue,
          jaundice,
          epigastric,
        },
      });
    } else {
      // If the questionnaire exists, update it
      questionnaire = await prisma.questionnaire.update({
        where: { id: questionnaire.id },
        data: {
          bmi,
          fever,
          nausea,
          headache,
          diarrhea,
          fatigue,
          jaundice,
          epigastric,
        },
      });
    }

    res.status(200).json({ message: 'Questionnaire saved successfully', questionnaire });
  } catch (error) {
    console.error('Error saving questionnaire:', error.message);
    res.status(500).json({ error: 'Error saving questionnaire' });
  }
});

export default router;
