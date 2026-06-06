-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CONSTRUCTION_COMPANY', 'SUPERVISION', 'TESTING_ORG');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('DRAFT', 'WITNESSED', 'SUBMITTED', 'TESTED', 'RECTIFICATION', 'ARCHIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SampleSealStatus" AS ENUM ('CREATED', 'SUBMITTED', 'RECEIVED', 'TESTED');

-- CreateEnum
CREATE TYPE "ReportResult" AS ENUM ('PASS', 'FAIL', 'PENDING');

-- CreateEnum
CREATE TYPE "RectificationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'REINSPECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "orgName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialBatch" (
    "id" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "specification" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "supplier" TEXT,
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "constructionSite" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'DRAFT',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "materialList" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WitnessRecord" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "witnessDate" TIMESTAMP(3) NOT NULL,
    "witnessBy" TEXT NOT NULL,
    "witnessName" TEXT NOT NULL,
    "sitePhotos" TEXT[],
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WitnessRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleSeal" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sampleNo" TEXT NOT NULL,
    "sealNo" TEXT NOT NULL,
    "sampleName" TEXT NOT NULL,
    "specification" TEXT,
    "quantity" INTEGER NOT NULL,
    "samplingPoint" TEXT,
    "sampledBy" TEXT NOT NULL,
    "samplingDate" TIMESTAMP(3) NOT NULL,
    "status" "SampleSealStatus" NOT NULL DEFAULT 'CREATED',
    "sealedBy" TEXT,
    "sealDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SampleSeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionOrder" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "submitDate" TIMESTAMP(3) NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "testingOrg" TEXT NOT NULL,
    "testingItems" TEXT[],
    "status" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3),
    "receivedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionOrderItem" (
    "id" TEXT NOT NULL,
    "inspectionOrderId" TEXT NOT NULL,
    "sampleSealId" TEXT NOT NULL,
    "testingItems" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestReport" (
    "id" TEXT NOT NULL,
    "reportNo" TEXT NOT NULL,
    "inspectionOrderId" TEXT NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "testedBy" TEXT NOT NULL,
    "result" "ReportResult" NOT NULL DEFAULT 'PENDING',
    "conclusion" TEXT NOT NULL,
    "reportFile" TEXT,
    "testItems" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rectification" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rectificationMeasures" TEXT,
    "deadline" TIMESTAMP(3),
    "status" "RectificationStatus" NOT NULL DEFAULT 'OPEN',
    "createdBy" TEXT NOT NULL,
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "reInspectionReportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rectification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationLog" (
    "id" TEXT NOT NULL,
    "batchId" TEXT,
    "operation" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "operatorName" TEXT NOT NULL,
    "operatorRole" "UserRole" NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialBatch_batchNo_key" ON "MaterialBatch"("batchNo");

-- CreateIndex
CREATE UNIQUE INDEX "SampleSeal_sealNo_key" ON "SampleSeal"("sealNo");

-- CreateIndex
CREATE UNIQUE INDEX "SampleSeal_batchId_sampleNo_key" ON "SampleSeal"("batchId", "sampleNo");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionOrder_orderNo_key" ON "InspectionOrder"("orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "TestReport_reportNo_key" ON "TestReport"("reportNo");

-- AddForeignKey
ALTER TABLE "WitnessRecord" ADD CONSTRAINT "WitnessRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MaterialBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleSeal" ADD CONSTRAINT "SampleSeal_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MaterialBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionOrder" ADD CONSTRAINT "InspectionOrder_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MaterialBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionOrderItem" ADD CONSTRAINT "InspectionOrderItem_inspectionOrderId_fkey" FOREIGN KEY ("inspectionOrderId") REFERENCES "InspectionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionOrderItem" ADD CONSTRAINT "InspectionOrderItem_sampleSealId_fkey" FOREIGN KEY ("sampleSealId") REFERENCES "SampleSeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestReport" ADD CONSTRAINT "TestReport_inspectionOrderId_fkey" FOREIGN KEY ("inspectionOrderId") REFERENCES "InspectionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rectification" ADD CONSTRAINT "Rectification_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MaterialBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rectification" ADD CONSTRAINT "Rectification_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "TestReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationLog" ADD CONSTRAINT "OperationLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MaterialBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
