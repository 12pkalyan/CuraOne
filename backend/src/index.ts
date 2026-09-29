import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { pool } from './db';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test database connection before binding port
    const client = await pool.connect();
    console.log('✅ PostgreSQL database connected successfully.');
    client.release();

    app.listen(PORT, () => {
      console.log(`🚀 CuraOne API server is running on http://localhost:${PORT}`);
      console.log(`📡 Health & DB Status: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Gracefully shutting down...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Gracefully shutting down...');
  await pool.end();
  process.exit(0);
});

startServer();
