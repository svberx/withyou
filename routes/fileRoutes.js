import express from 'express';
import multer from 'multer';
import path from 'path';
import Tesseract from 'tesseract.js';
import prisma from '../prismaClient.js';
import fs from 'fs';
import pdf2img from 'pdf2img';
import axios from 'axios';

const router = express.Router();

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

// Upload and process file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { userId, bmi, fever, nausea, headache, diarrhea, fatigue, jaundice, epigastric } = req.body;
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

        const imagePath = info.message[0];
        const { data: { text: extractedText } } = await Tesseract.recognize(imagePath, 'eng');
        fs.unlinkSync(imagePath);

        // Extract medical values from text
        const extractedValues = extractMedicalValues(extractedText);

        // Save the questionnaire data
        const questionnaire = await prisma.questionnaire.create({
          data: {
            userId: parseInt(userId),
            bmi: Boolean(bmi),
            fever: Boolean(fever),
            nausea: Boolean(nausea),
            headache: Boolean(headache),
            diarrhea: Boolean(diarrhea),
            fatigue: Boolean(fatigue),
            jaundice: Boolean(jaundice),
            epigastric: Boolean(epigastric),
          },
        });

        // Save the medical analysis data
        const analysis = await prisma.medicalAnalysis.create({
          data: {
            userId: parseInt(userId),
            fileName: req.file.filename,
            text: extractedText,
            filePath: filePath,
            aiFeedback: null,  // AI feedback will be added later
            ...extractedValues,
          },
        });

        res.status(200).json({
          message: 'File processed successfully',
          analysisId: analysis.id,
          questionnaireId: questionnaire.id,
          extractedText: extractedText,
          values: extractedValues,
        });
      });

    } else {
      console.log("Image detected, extracting text...");
      const { data: { text: extractedText } } = await Tesseract.recognize(filePath, 'eng');

      // Extract medical values from text
      const extractedValues = extractMedicalValues(extractedText);

      // Save the questionnaire data
      const questionnaire = await prisma.questionnaire.create({
        data: {
          userId: parseInt(userId),
          bmi: Boolean(bmi),
          fever: Boolean(fever),
          nausea: Boolean(nausea),
          headache: Boolean(headache),
          diarrhea: Boolean(diarrhea),
          fatigue: Boolean(fatigue),
          jaundice: Boolean(jaundice),
          epigastric: Boolean(epigastric),
        },
      });

      // Save the medical analysis data
      const analysis = await prisma.medicalAnalysis.create({
        data: {
          userId: parseInt(userId),
          fileName: req.file.filename,
          text: extractedText,
          filePath: filePath,
          aiFeedback: null,  // AI feedback will be added later
          ...extractedValues,
        },
      });

      res.status(200).json({
        message: 'File processed successfully',
        analysisId: analysis.id,
        questionnaireId: questionnaire.id,
        extractedText: extractedText,
        values: extractedValues,
      });
    }

  } catch (error) {
    console.error('Error processing file:', error.message);
    res.status(500).json({ error: 'Error processing file' });
  }
});

export default router;
