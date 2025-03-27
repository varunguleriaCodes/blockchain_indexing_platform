import express from "express";
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import { auth } from './middleware/auth';

// Load environment variables
dotenv.config();

const app = express();

app.use(express.json());


app.use('/api/auth', authRoutes);

app.get('/api/protected', auth, (req, res) => {
  res.json({ message: 'This is a protected route' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
