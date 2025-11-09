#!/usr/bin/env node

/**
 * Script to verify and set up NextAuth database tables
 * This checks if the required tables exist and provides instructions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
  console.log('🔍 Checking database tables...\n');

  try {
    // Try to query each NextAuth table
    const checks = {
      accounts: false,
      sessions: false,
      users: false,
      verification_tokens: false
    };

    try {
      await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'`;
      const result = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'`;
      checks.accounts = result.length > 0;
    } catch (e) {
      checks.accounts = false;
    }

    try {
      const result = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'`;
      checks.sessions = result.length > 0;
    } catch (e) {
      checks.sessions = false;
    }

    try {
      const result = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`;
      checks.users = result.length > 0;
    } catch (e) {
      checks.users = false;
    }

    try {
      const result = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='verification_tokens'`;
      checks.verification_tokens = result.length > 0;
    } catch (e) {
      checks.verification_tokens = false;
    }

    // Display results
    console.log('Table Status:');
    console.log(`  ✓ users: ${checks.users ? '✅ exists' : '❌ missing'}`);
    console.log(`  ✓ accounts: ${checks.accounts ? '✅ exists' : '❌ missing'}`);
    console.log(`  ✓ sessions: ${checks.sessions ? '✅ exists' : '❌ missing'}`);
    console.log(`  ✓ verification_tokens: ${checks.verification_tokens ? '✅ exists' : '❌ missing'}`);

    const allExist = checks.accounts && checks.sessions && checks.users && checks.verification_tokens;

    if (!allExist) {
      console.log('\n❌ Some tables are missing!');
      console.log('\n📝 To fix this, run:');
      console.log('   npx prisma db push\n');
      console.log('This will create the missing tables in your database.');
      return false;
    } else {
      console.log('\n✅ All NextAuth tables exist!');

      // Check if there are any users
      const userCount = await prisma.user.count();
      console.log(`\n👥 Users in database: ${userCount}`);

      // Check if there are any sessions
      const sessionCount = await prisma.session.count();
      console.log(`🔐 Active sessions: ${sessionCount}`);

      if (sessionCount === 0) {
        console.log('\n💡 No active sessions. Try signing in with Google OAuth.');
      }

      return true;
    }

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

checkTables().then(success => {
  process.exit(success ? 0 : 1);
});
