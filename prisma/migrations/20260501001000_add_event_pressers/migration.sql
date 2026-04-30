-- CreateTable
CREATE TABLE "event_pressers" (
    "eventId" INTEGER NOT NULL,
    "presserId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" INTEGER NOT NULL,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,

    CONSTRAINT "event_pressers_pkey" PRIMARY KEY ("eventId","presserId")
);

-- CreateIndex
CREATE INDEX "event_pressers_presserId_idx" ON "event_pressers"("presserId");

-- CreateIndex
CREATE INDEX "event_pressers_deletedAt_idx" ON "event_pressers"("deletedAt");

-- AddForeignKey
ALTER TABLE "event_pressers" ADD CONSTRAINT "event_pressers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_pressers" ADD CONSTRAINT "event_pressers_presserId_fkey" FOREIGN KEY ("presserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_pressers" ADD CONSTRAINT "event_pressers_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
