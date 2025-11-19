/*
  Warnings:

  - You are about to alter the column `token` on the `flask_dance_oauth` table. The data in that column could be lost. The data in that column will be cast from `Json` to `Unsupported("json")`.

*/
-- AlterTable
ALTER TABLE "flask_dance_oauth" ALTER COLUMN "token" SET DATA TYPE json;

-- CreateTable
CREATE TABLE "lists" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "list_type" TEXT NOT NULL,
    "filter_criteria" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_items" (
    "id" SERIAL NOT NULL,
    "list_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "is_checked" BOOLEAN NOT NULL DEFAULT false,
    "task_id" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "list_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lists_user_id_idx" ON "lists"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "list_items_task_id_key" ON "list_items"("task_id");

-- CreateIndex
CREATE INDEX "list_items_list_id_idx" ON "list_items"("list_id");

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
