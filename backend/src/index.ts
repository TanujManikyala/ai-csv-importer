import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { importBatchHandler, importFileHandler } from './controllers/importController.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS
app.use(cors({
  origin: '*', // Allow all origins for simplicity/internship project, can be restricted if needed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configure Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer memory storage for direct file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// JSON batch mapping endpoint (used by frontend for chunked import)
app.post('/api/import', importBatchHandler);

// Direct file upload endpoint
app.post('/api/import-file', upload.single('file'), importFileHandler);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'An unknown error occurred'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[GrowEasy CRM Backend] Server is running on http://localhost:${PORT}`);
});
