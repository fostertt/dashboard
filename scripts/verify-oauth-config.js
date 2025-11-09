#!/usr/bin/env node

/**
 * Verify OAuth configuration matches what Google Cloud Console expects
 */

require('dotenv').config();

console.log('\n🔍 Verifying OAuth Configuration\n');
console.log('=' .repeat(60));

// Check environment variables
console.log('\n📋 ENVIRONMENT VARIABLES:\n');

const requiredVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET'
];

let allPresent = true;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName.includes('SECRET')) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...${value.substring(value.length - 5)}`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: MISSING`);
    allPresent = false;
  }
});

console.log('\n' + '=' .repeat(60));
console.log('\n🎯 REQUIRED GOOGLE CLOUD CONSOLE SETTINGS:\n');

const nextauthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const callbackUrl = `${nextauthUrl}/api/auth/callback/google`;

console.log('In Google Cloud Console, your OAuth 2.0 Client must have:\n');
console.log('📍 Authorized redirect URIs:');
console.log(`   ${callbackUrl}`);
console.log('');
console.log('🌐 Authorized JavaScript origins:');
console.log(`   ${nextauthUrl}`);
console.log('');

console.log('=' .repeat(60));
console.log('\n💡 INSTRUCTIONS:\n');
console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
console.log(`2. Find OAuth 2.0 Client with ID: ${process.env.GOOGLE_CLIENT_ID?.split('.')[0] || '(CLIENT_ID not found)'}`);
console.log('3. Click on it to edit');
console.log('4. Add the redirect URI shown above to "Authorized redirect URIs"');
console.log('5. Add the JavaScript origin shown above to "Authorized JavaScript origins"');
console.log('6. Click SAVE');
console.log('7. Wait 5 minutes for changes to propagate');
console.log('8. Restart your dev server: npm run dev\n');

console.log('=' .repeat(60));
console.log('\n⚠️  COMMON MISTAKES:\n');
console.log('❌ Wrong: http://localhost:3000/');
console.log('❌ Wrong: http://localhost:3000/api/auth/callback');
console.log(`✅ Right: ${callbackUrl}`);
console.log('');
console.log('❌ Wrong: https://localhost:3000 (https instead of http)');
console.log(`✅ Right: ${nextauthUrl} (http for localhost)`);
console.log('');
console.log('❌ Wrong: Adding to wrong OAuth client');
console.log('✅ Right: Add to the client matching GOOGLE_CLIENT_ID in .env\n');

console.log('=' .repeat(60));

if (!allPresent) {
  console.log('\n❌ MISSING ENVIRONMENT VARIABLES!\n');
  console.log('Make sure your .env file has all required variables.\n');
  process.exit(1);
} else {
  console.log('\n✅ All environment variables present!\n');
}
