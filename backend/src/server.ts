import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

import app from './app.js';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});
