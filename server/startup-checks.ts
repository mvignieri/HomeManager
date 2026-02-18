import { testEmailConnection } from './email.js';
import { db } from './db.js';

/**
 * Run startup checks to verify all systems are configured correctly
 */
export async function runStartupChecks(): Promise<void> {
  console.log('\n========================================');
  console.log('🚀 HOMEMANAGER STARTUP CHECKS');
  console.log('========================================\n');

  // Check 1: Database Connection
  console.log('📊 Checking database connection...');
  try {
    await db.execute('SELECT 1');
    console.log('   ✅ Database connected successfully');
  } catch (error) {
    console.error('   ❌ Database connection failed:', error);
    console.error('   Please check your DATABASE_URL environment variable');
  }

  // Check 2: Environment Variables
  console.log('\n🔐 Checking environment variables...');
  const requiredEnvVars = [
    'DATABASE_URL',
  ];

  const optionalEnvVars = [
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_VAPID_KEY',
  ];

  let missingRequired = false;
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}`);
    } else {
      console.log(`   ❌ ${envVar} - MISSING (REQUIRED)`);
      missingRequired = true;
    }
  }

  console.log('\n   Optional variables:');

  // Special check for FIREBASE_SERVICE_ACCOUNT_KEY JSON validity
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      console.log(`   ✅ FIREBASE_SERVICE_ACCOUNT_KEY (valid JSON)`);
    } catch (error) {
      console.log(`   ❌ FIREBASE_SERVICE_ACCOUNT_KEY (invalid JSON)`);
    }
  } else {
    console.log(`   ⚠️  FIREBASE_SERVICE_ACCOUNT_KEY - not set (push notifications disabled)`);
  }

  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      // Don't log the full value for security
      console.log(`   ✅ ${envVar}`);
    } else {
      console.log(`   ⚠️  ${envVar} - not set`);
    }
  }

  // Check 3: Email Service
  console.log('\n📧 Checking email service...');
  const emailOk = await testEmailConnection();
  if (!emailOk) {
    console.log('   ⚠️  Email service not available');
    if (process.env.RESEND_API_KEY) {
      console.log('   Note: RESEND_API_KEY is set but connection failed');
      console.log('   Check if the API key is valid');
    } else {
      console.log('   Note: RESEND_API_KEY not set - emails will not be sent in production');
      console.log('   In development, make sure Mailhog is running on port 1025');
    }
  }

  // Check 4: Firebase Admin
  console.log('\n🔥 Checking Firebase Admin SDK...');
  try {
    const { getApps } = await import('firebase-admin/app');

    if (getApps().length > 0) {
      console.log('   ✅ Firebase Admin initialized');
    } else {
      console.log('   ⚠️  Firebase Admin not initialized');
      console.log('   Note: This is expected if FIREBASE_SERVICE_ACCOUNT_KEY is not set');
    }
  } catch (error) {
    console.log('   ❌ Firebase Admin error:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Summary
  console.log('\n========================================');
  if (missingRequired) {
    console.log('⚠️  STARTUP CHECKS COMPLETED WITH WARNINGS');
    console.log('   Some required environment variables are missing');
    console.log('   The application may not function correctly');
  } else {
    console.log('✅ STARTUP CHECKS COMPLETED');
    console.log('   All systems ready');
  }
  console.log('========================================\n');
}
