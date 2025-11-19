/*
  Warnings:

  - You are about to alter the column `token` on the `flask_dance_oauth` table. The data in that column could be lost. The data in that column will be cast from `Json` to `Unsupported("json")`.
  - You are about to alter the column `scheduled_time` on the `items` table. The data in that column could be lost. The data in that column will be cast from `Time(6)` to `Unsupported("time")`.
  - You are about to alter the column `due_time` on the `items` table. The data in that column could be lost. The data in that column will be cast from `Time(6)` to `Unsupported("time")`.

*/
-- DropForeignKey
ALTER TABLE "public"."items" DROP CONSTRAINT "items_parent_item_id_fkey";

-- AlterTable
ALTER TABLE "flask_dance_oauth" ALTER COLUMN "token" SET DATA TYPE json;

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "duration" TEXT,
ADD COLUMN     "effort" TEXT,
ADD COLUMN     "focus" TEXT,
ALTER COLUMN "scheduled_time" SET DATA TYPE time,
ALTER COLUMN "due_time" SET DATA TYPE time;

-- CreateIndex
CREATE INDEX "items_parent_item_id_idx" ON "items"("parent_item_id");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_parent_item_id_fkey" FOREIGN KEY ("parent_item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
