import express from 'express';
import tesseract from 'tesseract.js';

const router = express.Router();

// Text extraction from image route
router.post('/extract-text', async (req, res) => {
    const { filePath } = req.body;

    if (!filePath) {
        return res.status(400).json({ message: 'File path is required' });
    }

    try {
        const result = await tesseract.recognize(filePath, 'eng', {
            logger: (m) => console.log(m),
        });

        res.json({ text: result.data.text });
    } catch (error) {
        res.status(500).json({ message: 'Error processing image', error });
    }
});

export default router;
