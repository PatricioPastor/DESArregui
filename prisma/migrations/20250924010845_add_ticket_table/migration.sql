-- CreateTable
CREATE TABLE "phones"."ticket" (
    "id" TEXT NOT NULL,
    "issue_type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enterprise" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL,
    "updated" TIMESTAMP(3) NOT NULL,
    "creator" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "category_status" TEXT NOT NULL,
    "replacement_count" INTEGER,
    "is_replacement" BOOLEAN NOT NULL DEFAULT false,
    "is_assignment" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_sync" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_key_key" ON "phones"."ticket"("key");

-- CreateIndex
CREATE INDEX "ticket_key_idx" ON "phones"."ticket"("key");

-- CreateIndex
CREATE INDEX "ticket_label_idx" ON "phones"."ticket"("label");

-- CreateIndex
CREATE INDEX "ticket_status_idx" ON "phones"."ticket"("status");

-- CreateIndex
CREATE INDEX "ticket_creator_idx" ON "phones"."ticket"("creator");

-- CreateIndex
CREATE INDEX "ticket_is_active_idx" ON "phones"."ticket"("is_active");
