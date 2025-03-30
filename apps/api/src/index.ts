import express from "express";
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import postgresRoutes from './routes/postgres';
import { auth } from './middleware/auth';
import heliusRoutes from './routes/helius.indexing'
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('authenticate', (data) => {
    socket.data.userId = data.userId;
    console.log(`User ${data.userId} authenticated`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { io };
