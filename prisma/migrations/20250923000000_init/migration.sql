-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "main_auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "phones";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "support";

-- CreateEnum
CREATE TYPE "phones"."device_status" AS ENUM ('NEW', 'ASSIGNED', 'USED', 'REPAIRED', 'NOT_REPAIRED', 'LOST');

-- CreateEnum
CREATE TYPE "support"."assignment_type" AS ENUM ('ASSIGN', 'UNASSIGN');

-- CreateTable
CREATE TABLE "main_auth"."user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main_auth"."session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main_auth"."account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main_auth"."verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phones"."phone_model" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "color" TEXT DEFAULT '',
    "sku" TEXT,
    "storage_gb" INTEGER,

    CONSTRAINT "phone_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phones"."distributor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "distributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phones"."purchase" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "distributor_id" TEXT NOT NULL,
    "invoice_number" TEXT,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phones"."device" (
    "id" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "assigned_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "distributor_id" TEXT,
    "model_id" TEXT NOT NULL,
    "purchase_id" TEXT,
    "ticket_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "phones"."device_status" NOT NULL DEFAULT 'NEW',

    CONSTRAINT "device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phones"."assignment" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_to" TEXT,
    "device_id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "type" "support"."assignment_type" NOT NULL,

    CONSTRAINT "assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phones"."soti_device" (
    "id" TEXT NOT NULL,
    "device_name" TEXT NOT NULL,
    "assigned_user" TEXT,
    "model" TEXT,
    "imei" TEXT NOT NULL,
    "route" TEXT,
    "registration_time" TEXT,
    "enrollment_time" TEXT,
    "connection_date" TEXT,
    "disconnection_date" TEXT,
    "phone" TEXT,
    "bssid_network" TEXT,
    "ssid_network" TEXT,
    "jira_ticket_id" TEXT,
    "custom_phone" TEXT,
    "custom_email" TEXT,
    "android_enter_email" TEXT,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_sync" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "soti_device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support"."incident" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support"."procedure" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support"."incident_procedure" (
    "incident_id" TEXT NOT NULL,
    "procedure_id" TEXT NOT NULL,

    CONSTRAINT "incident_procedure_pkey" PRIMARY KEY ("incident_id","procedure_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "main_auth"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "main_auth"."session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "phone_model_brand_model_storage_gb_color_key" ON "phones"."phone_model"("brand", "model", "storage_gb", "color");

-- CreateIndex
CREATE UNIQUE INDEX "distributor_name_key" ON "phones"."distributor"("name");

-- CreateIndex
CREATE INDEX "purchase_distributor_id_idx" ON "phones"."purchase"("distributor_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_imei_key" ON "phones"."device"("imei");

-- CreateIndex
CREATE INDEX "device_model_id_idx" ON "phones"."device"("model_id");

-- CreateIndex
CREATE INDEX "device_status_idx" ON "phones"."device"("status");

-- CreateIndex
CREATE INDEX "device_assigned_to_idx" ON "phones"."device"("assigned_to");

-- CreateIndex
CREATE INDEX "device_ticket_id_idx" ON "phones"."device"("ticket_id");

-- CreateIndex
CREATE INDEX "assignment_device_id_at_idx" ON "phones"."assignment"("device_id", "at");

-- CreateIndex
CREATE UNIQUE INDEX "soti_device_device_name_key" ON "phones"."soti_device"("device_name");

-- CreateIndex
CREATE UNIQUE INDEX "soti_device_imei_key" ON "phones"."soti_device"("imei");

-- CreateIndex
CREATE INDEX "soti_device_imei_idx" ON "phones"."soti_device"("imei");

-- CreateIndex
CREATE INDEX "soti_device_device_name_idx" ON "phones"."soti_device"("device_name");

-- CreateIndex
CREATE INDEX "soti_device_assigned_user_idx" ON "phones"."soti_device"("assigned_user");

-- CreateIndex
CREATE INDEX "soti_device_is_active_idx" ON "phones"."soti_device"("is_active");

-- AddForeignKey
ALTER TABLE "main_auth"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "main_auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_auth"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "main_auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phones"."purchase" ADD CONSTRAINT "purchase_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "phones"."distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phones"."device" ADD CONSTRAINT "device_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "phones"."distributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phones"."device" ADD CONSTRAINT "device_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "phones"."phone_model"("id") ON DELETE SET DEFAULT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phones"."device" ADD CONSTRAINT "device_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "phones"."purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phones"."assignment" ADD CONSTRAINT "assignment_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "phones"."device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support"."incident_procedure" ADD CONSTRAINT "incident_procedure_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "support"."incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support"."incident_procedure" ADD CONSTRAINT "incident_procedure_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "support"."procedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

