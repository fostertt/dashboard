/*
  Warnings:

  - You are about to alter the column `token` on the `flask_dance_oauth` table. The data in that column could be lost. The data in that column will be cast from `Json` to `Unsupported("json")`.
  - You are about to alter the column `due_time` on the `items` table. The data in that column could be lost. The data in that column will be cast from `Time(6)` to `Unsupported("time")`.

*/
-- AlterTable
ALTER TABLE "flask_dance_oauth" ALTER COLUMN "token" SET DATA TYPE json;

-- AlterTable
ALTER TABLE "items" ALTER COLUMN "scheduled_time" SET DATA TYPE TEXT,
ALTER COLUMN "due_date" SET DATA TYPE TEXT,
ALTER COLUMN "due_time" SET DATA TYPE time;
