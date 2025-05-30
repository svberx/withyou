import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient.js';  // Adjust the path as needed
import jwt from 'jsonwebtoken';

const router = express.Router();

// Get User by ID Route
router.get('/user/:id', async (req, res) => {
    const { id } = req.params;
    
    // Convert string ID to number
    const userId = parseInt(id);
    
    // Validate if ID is a valid number
    if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { 
                id: true, 
                email: true, 
                name: true, 
                age: true, 
                gender: true 
                // Don't return password
            }
        });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Sign Up Route
router.post('/signup', async (req, res) => {
    const { email, password, name, age, gender } = req.body;

    // Check if user exists
    const userExists = await prisma.user.findUnique({
        where: { email },
    });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            age,
            gender,
        },
    });

    res.status(201).json(newUser);
});

// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: '1h',
    });

    // res.json({ token });
     res.json({
        message: 'Login successful',
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            age: user.age,
            gender: user.gender,
        },
    });
});

export default router;
