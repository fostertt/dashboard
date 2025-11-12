/**
 * Migration Script: Habits to Items
 *
 * This script migrates existing habits from the habits table to the items table.
 * It also migrates habit completions to item completions.
 *
 * Usage:
 *   npx tsx scripts/migrate-habits-to-items.ts
 *
 * IMPORTANT: This is a one-way migration. Back up your database before running!
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStats {
  habitsMigrated: number;
  completionsMigrated: number;
  errors: string[];
}

async function migrateHabitsToItems(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    habitsMigrated: 0,
    completionsMigrated: 0,
    errors: [],
  };

  try {
    console.log('=€ Starting migration: Habits ’ Items');
    console.log('=====================================\n');

    // Fetch all habits
    const habits = await prisma.habit.findMany({
      include: {
        habit_completions: true,
      },
    });

    console.log(`=Ê Found ${habits.length} habits to migrate\n`);

    if (habits.length === 0) {
      console.log(' No habits found. Migration complete!');
      return stats;
    }

    // Migrate each habit
    for (const habit of habits) {
      try {
        console.log(`  Migrating habit: "${habit.name}" (ID: ${habit.id})`);

        // Check if item already exists (avoid duplicates)
        const existingItem = await prisma.item.findFirst({
          where: {
            userId: habit.userId,
            name: habit.name,
            itemType: 'habit',
          },
        });

        if (existingItem) {
          console.log(`       Item already exists (ID: ${existingItem.id}), skipping...`);
          stats.errors.push(`Habit "${habit.name}" already exists as item`);
          continue;
        }

        // Create item from habit
        const item = await prisma.item.create({
          data: {
            userId: habit.userId,
            itemType: 'habit',
            name: habit.name,
            description: habit.description,
            scheduleType: habit.scheduleType,
            scheduleDays: habit.scheduleDays,
            scheduledTime: habit.scheduledTime,
            parentItemId: habit.parentHabitId,
            isParent: habit.isParent,
            createdAt: habit.createdAt || new Date().toISOString(),
            updatedAt: habit.updatedAt || new Date().toISOString(),
            isCompleted: false,
            isDismissed: false,
          },
        });

        stats.habitsMigrated++;
        console.log(`     Created item (ID: ${item.id})`);

        // Migrate completions
        if (habit.habit_completions.length > 0) {
          console.log(`    Migrating ${habit.habit_completions.length} completions...`);

          for (const completion of habit.habit_completions) {
            try {
              // Check if completion already exists
              const existingCompletion = await prisma.itemCompletion.findFirst({
                where: {
                  itemId: item.id,
                  completionDate: completion.completionDate,
                },
              });

              if (!existingCompletion) {
                await prisma.itemCompletion.create({
                  data: {
                    itemId: item.id,
                    completionDate: completion.completionDate,
                    createdAt: completion.createdAt || new Date().toISOString(),
                  },
                });
                stats.completionsMigrated++;
              }
            } catch (error) {
              console.error(`       Error migrating completion:`, error);
              stats.errors.push(`Failed to migrate completion for habit "${habit.name}"`);
            }
          }

          console.log(`     Migrated completions`);
        }

        console.log('');
      } catch (error) {
        console.error(`   Error migrating habit "${habit.name}":`, error);
        stats.errors.push(`Failed to migrate habit "${habit.name}": ${error}`);
        console.log('');
      }
    }

    console.log('\n=====================================');
    console.log('=È Migration Summary:');
    console.log(`   Habits migrated: ${stats.habitsMigrated}/${habits.length}`);
    console.log(`   Completions migrated: ${stats.completionsMigrated}`);

    if (stats.errors.length > 0) {
      console.log(`\n   Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    console.log('\n Migration complete!');
    console.log('\n=¡ Next steps:');
    console.log('   1. Verify the migrated items in your dashboard');
    console.log('   2. Test item completion tracking');
    console.log('   3. Once verified, you can optionally remove old habits');
    console.log('      (Keep the habits table for now as a backup)');

  } catch (error) {
    console.error('\nL Fatal error during migration:', error);
    stats.errors.push(`Fatal error: ${error}`);
  } finally {
    await prisma.$disconnect();
  }

  return stats;
}

// Run migration
if (require.main === module) {
  console.log('\n   WARNING: This will migrate habits to items.');
  console.log('   Make sure you have a database backup!\n');

  migrateHabitsToItems()
    .then((stats) => {
      if (stats.errors.length > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateHabitsToItems };
