import express from 'express';

const app = express();

// middleware
app.use(express.json());

// routes
// app.use('/api/rooms/', roomRouter);

export default app;
