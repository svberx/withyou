import express from 'express';
import multer from 'multer';
import path from 'path';
import Tesseract from 'tesseract.js';
import prisma from '../prismaClient.js';
import fs from 'fs';
import pdf2img from 'pdf2img';
import OpenAI from 'openai'; // or whatever AI service you're using

const router = express.Router();

// Initialize OpenAI (replace with your preferred AI service)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure to set this in your .env file
});

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Helper function to extract medical values from text
const extractMedicalValues = (text) => {
  const patterns = {
    alb: /alb(?:umin)?[:\s]*([\d.]+)/i,
    alp: /alp[:\s]*([\d.]+)/i,
    che: /che[:\s]*([\d.]+)/i,
    bil: /bil(?:irubin)?[:\s]*([\d.]+)/i,
    ast: /ast[:\s]*([\d.]+)/i,
    alt: /alt[:\s]*([\d.]+)/i,
    chol: /chol(?:esterol)?[:\s]*([\d.]+)/i,
    crea: /crea(?:tinine)?[:\s]*([\d.]+)/i,
    ggt: /ggt[:\s]*([\d.]+)/i,
    prot: /prot(?:ein)?[:\s]*([\d.]+)/i,
  };

  const extractedValues = {};

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    extractedValues[key] = match ? parseFloat(match[1]) : null;
  }

  return extractedValues;
};

// Helper function to generate AI feedback
const generateAIFeedback = async (extractedValues, extractedText) => {
  try {
    // Filter out null values for the prompt
    const validValues = Object.entries(extractedValues)
      .filter(([key, value]) => value !== null)
      .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
      .join(', ');

    if (!validValues) {
      return "No medical values were detected in the uploaded document. Please ensure the document contains clear medical test results.";
    }

    const prompt = `
    You are a medical assistant analyzing laboratory test results. Based on the following extracted values, provide a brief, informative feedback about the results. Be professional and remind the user to consult with their healthcare provider for proper interpretation.

    Extracted Medical Values: ${validValues}

    Please provide:
    1. A brief interpretation of the values (if they appear normal, elevated, or low)
    2. General health implications (if any)
    3. A reminder to consult with a healthcare professional

    Keep the response concise (2-3 paragraphs) and educational, not diagnostic.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // or "gpt-4" if you have access
      messages: [
        {
          role: "system",
          content: "You are a helpful medical assistant that provides educational information about lab results. Always remind users to consult healthcare professionals."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating AI feedback:', error);
    return "Unable to generate AI feedback at this time. Please try again later or consult with your healthcare provider for result interpretation.";
  }
};

// Helper function to process extracted text and values
const processAnalysis = async (userId, fileName, filePath, extractedText) => {
  // Extract medical values from text
  const extractedValues = extractMedicalValues(extractedText);
  
  // Generate AI feedback
  const aiFeedback = await generateAIFeedback(extractedValues, extractedText);

  // Save the medical analysis data with AI feedback
  const analysis = await prisma.medicalAnalysis.create({
    data: {
      userId: parseInt(userId),
      fileName: fileName,
      text: extractedText,
      filePath: filePath,
      aiFeedback: aiFeedback,
      ...extractedValues,
    },
  });

  return {
    analysisId: analysis.id,
    extractedText: extractedText,
    values: extractedValues,
    aiFeedback: aiFeedback,
  };
};

// Upload and process file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { userId } = req.body;
    const filePath = path.join('uploads', req.file.filename);

    // Detect if it's a PDF or PNG
    if (req.file.mimetype === 'application/pdf') {
      console.log("PDF detected, converting to image...");
      pdf2img.setOptions({
        type: 'png',
        density: 300,
        outputdir: 'uploads/',
        outputname: req.file.filename.split('.')[0],
        page: null,
      });

      pdf2img.convert(filePath, async (err, info) => {
        if (err) {
          console.error('PDF conversion failed:', err.message);
          return res.status(500).json({ error: 'Error processing PDF' });
        }
        console.log("PDF successfully converted to images:", info);

        try {
          const imagePath = info.message[0];
          const { data: { text: extractedText } } = await Tesseract.recognize(imagePath, 'eng');
          fs.unlinkSync(imagePath); // Clean up converted image

          const result = await processAnalysis(userId, req.file.filename, filePath, extractedText);

          res.status(200).json({
            message: 'File processed successfully',
            ...result,
          });
        } catch (processingError) {
          console.error('Error processing PDF analysis:', processingError);
          res.status(500).json({ error: 'Error processing file analysis' });
        }
      });

    } else {
      console.log("Image detected, extracting text...");
      const { data: { text: extractedText } } = await Tesseract.recognize(filePath, 'eng');

      const result = await processAnalysis(userId, req.file.filename, filePath, extractedText);

      res.status(200).json({
        message: 'File processed successfully',
        ...result,
      });
    }

  } catch (error) {
    console.error('Error processing file:', error.message);
    res.status(500).json({ error: 'Error processing file' });
  }
});

// Get user's analysis history
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const analyses = await prisma.medicalAnalysis.findMany({
      where: {
        userId: parseInt(userId),
      },
      select: {
        id: true,
        fileName: true,
        createdAt: true,
        aiFeedback: true,
        alb: true,
        alp: true,
        che: true,
        bil: true,
        ast: true,
        alt: true,
        chol: true,
        crea: true,
        ggt: true,
        prot: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    const totalCount = await prisma.medicalAnalysis.count({
      where: {
        userId: parseInt(userId),
      },
    });

    res.status(200).json({
      analyses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    res.status(500).json({ error: 'Error fetching analysis history' });
  }
});

// Get specific analysis by ID
router.get('/analysis/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;

    const analysis = await prisma.medicalAnalysis.findUnique({
      where: {
        id: parseInt(analysisId),
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.status(200).json({ analysis });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'Error fetching analysis' });
  }
});

// Delete analysis
router.delete('/analysis/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;

    // Get the analysis to find the file path
    const analysis = await prisma.medicalAnalysis.findUnique({
      where: {
        id: parseInt(analysisId),
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Delete the file from filesystem
    if (fs.existsSync(analysis.filePath)) {
      fs.unlinkSync(analysis.filePath);
    }

    // Delete the analysis from database
    await prisma.medicalAnalysis.delete({
      where: {
        id: parseInt(analysisId),
      },
    });

    res.status(200).json({ message: 'Analysis deleted successfully' });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({ error: 'Error deleting analysis' });
  }
});

// Regenerate AI feedback for existing analysis
router.post('/regenerate-feedback/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;

    const analysis = await prisma.medicalAnalysis.findUnique({
      where: {
        id: parseInt(analysisId),
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Extract values for AI feedback
    const extractedValues = {
      alb: analysis.alb,
      alp: analysis.alp,
      che: analysis.che,
      bil: analysis.bil,
      ast: analysis.ast,
      alt: analysis.alt,
      chol: analysis.chol,
      crea: analysis.crea,
      ggt: analysis.ggt,
      prot: analysis.prot,
    };

    // Generate new AI feedback
    const newAiFeedback = await generateAIFeedback(extractedValues, analysis.text);

    // Update the analysis with new feedback
    const updatedAnalysis = await prisma.medicalAnalysis.update({
      where: {
        id: parseInt(analysisId),
      },
      data: {
        aiFeedback: newAiFeedback,
      },
    });

    res.status(200).json({
      message: 'AI feedback regenerated successfully',
      aiFeedback: newAiFeedback,
    });
  } catch (error) {
    console.error('Error regenerating AI feedback:', error);
    res.status(500).json({ error: 'Error regenerating AI feedback' });
  }
});

export default router;