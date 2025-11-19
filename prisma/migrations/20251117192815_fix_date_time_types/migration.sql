/*
  Warnings:

  - You are about to alter the column `token` on the `flask_dance_oauth` table. The data in that column could be lost. The data in that column will be cast from `Json` to `Unsupported("json")`.
  - The `due_date` column on the `items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `reminder_datetime` column on the `items` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "flask_dance_oauth" ALTER COLUMN "token" SET DATA TYPE json;

-- AlterTable
ALTER TABLE "items" DROP COLUMN "due_date",
ADD COLUMN     "due_date" TIMESTAMP(3),
ALTER COLUMN "due_time" SET DATA TYPE TEXT,
DROP COLUMN "reminder_datetime",
ADD COLUMN     "reminder_datetime" TIMESTAMP(3);
