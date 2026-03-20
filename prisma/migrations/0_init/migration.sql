-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AiStatus" AS ENUM ('Perspektive', 'NeedsClarification', 'LowPotential');

-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "instagram_id" TEXT NOT NULL,
    "type" TEXT,
    "dimensions" TEXT,
    "style" TEXT,
    "materials" TEXT,
    "budget" TEXT,
    "timeline" TEXT,
    "wishes" TEXT,
    "ai_status" "AiStatus",
    "status_history" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lead_id" INTEGER NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manager" (
    "id" SERIAL NOT NULL,
    "telegram_id" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "Manager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" SERIAL NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lead_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "History" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_instagram_id_key" ON "Lead"("instagram_id");

-- CreateIndex
CREATE UNIQUE INDEX "Manager_telegram_id_key" ON "Manager"("telegram_id");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "History" ADD CONSTRAINT "History_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

