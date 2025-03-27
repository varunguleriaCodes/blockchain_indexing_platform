import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { auth } from '../middleware/auth';
import prisma from '../lib/prisma';
import router from '../lib/router';

// Register route
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({ user, token });
  } catch (error) {
    res.status(500).json({ error: 'Error creating user' });
  }
});

// Login route
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Protected route example
router.get('/profile', auth, async (req: any, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching profile' });
  }
});

export default router; 