/**
 * Script to configure CORS for Google Cloud Storage bucket
 * Run with: npx tsx server/configure-cors.ts
 */

import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';

dotenv.config();

async function configureCORS() {
  try {
    // Initialize Google Cloud Storage
    let storage: Storage;

    if (process.env.GOOGLE_CLOUD_CREDENTIALS_JSON) {
      // Use credentials from environment variable (for Render/production)
      const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON);
      storage = new Storage({
        projectId: credentials.project_id || process.env.GOOGLE_CLOUD_PROJECT_ID,
        credentials: credentials,
      });
      console.log('\u2713 Using credentials from environment variable');
    } else if (process.env.GOOGLE_CLOUD_KEYFILE) {
      // Use keyfile path (for local development)
      storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_CLOUD_KEYFILE,
      });
      console.log('\u2713 Using credentials from keyfile:', process.env.GOOGLE_CLOUD_KEYFILE);
    } else {
      // Use Application Default Credentials
      storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      });
      console.log('\u2713 Using Application Default Credentials');
    }

    const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'myapp-media-affiliate';
    const bucket = storage.bucket(bucketName);

    // CORS configuration
    const corsConfiguration = [
      {
        origin: [
          "https://affiliatexchange.onrender.com",
          "https://affiliatexchangemarket.onrender.com",
          "http://localhost:3000",
          "http://localhost:5000"
          // Add specific Vercel deployment URLs here as needed
          // Example: "https://your-app-abc123.vercel.app"
        ],
        method: ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
        responseHeader: [
          "Content-Type",
          "Access-Control-Allow-Origin",
          "Content-Length",
          "Content-Range",
          "Accept-Ranges"
        ],
        maxAgeSeconds: 3600
      },
    ];

    console.log('\nConfiguring CORS for bucket:', bucketName);
    console.log('CORS configuration:', JSON.stringify(corsConfiguration, null, 2));

    await bucket.setCorsConfiguration(corsConfiguration);

    console.log('\n\u2705 CORS configuration applied successfully!');
    console.log('\nYou can now upload files from:');
    corsConfiguration[0].origin.forEach(origin => {
      console.log(`  - ${origin}`);
    });
    console.log('\n\u26A0\uFE0F  Note: GCS does not support wildcard origins.');
    console.log('    Add each specific Vercel URL to the origin array.');

    // Verify the configuration
    const [metadata] = await bucket.getMetadata();
    console.log('\nVerified CORS configuration:');
    console.log(JSON.stringify(metadata.cors, null, 2));

  } catch (error: any) {
    console.error('\u274C Error configuring CORS:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.errors) {
      console.error('Details:', error.errors);
    }
    process.exit(1);
  }
}

configureCORS();