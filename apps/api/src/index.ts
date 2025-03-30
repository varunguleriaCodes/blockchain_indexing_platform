import express from "express";
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import postgresRoutes from './routes/postgres';
import { auth } from './middleware/auth';
import heliusRoutes from './routes/helius.indexing'
import cors from 'cors';
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api/auth', authRoutes);
app.use('/api/postgres' ,postgresRoutes);
app.use('/api/helius',heliusRoutes);
app.get('/api/protected', auth, (req, res) => {
  res.json({ message: 'This is a protected route' });
});
app.get('/',(req,res)=>{
  res.send("working")
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
