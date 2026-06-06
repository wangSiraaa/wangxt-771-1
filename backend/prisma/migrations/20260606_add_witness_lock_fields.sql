-- 添加见证锁定相关字段到 MaterialBatch 表
ALTER TABLE "MaterialBatch" 
ADD COLUMN "isWitnessLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "witnessLockedBy" TEXT,
ADD COLUMN "witnessLockedAt" TIMESTAMP(3),
ADD COLUMN "witnessLockReason" TEXT,
ADD COLUMN "witnessUnlockReason" TEXT,
ADD COLUMN "witnessUnlockedBy" TEXT,
ADD COLUMN "witnessUnlockedAt" TIMESTAMP(3);

-- 添加见证锁定相关字段到 SampleSeal 表
ALTER TABLE "SampleSeal" 
ADD COLUMN "isWitnessLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "witnessLockedAt" TIMESTAMP(3);

-- 添加见证锁定相关字段到 InspectionOrder 表
ALTER TABLE "InspectionOrder" 
ADD COLUMN "isWitnessLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "witnessLockedAt" TIMESTAMP(3);

-- 创建索引以优化锁定状态查询
CREATE INDEX "MaterialBatch_isWitnessLocked_idx" ON "MaterialBatch"("isWitnessLocked");
CREATE INDEX "SampleSeal_isWitnessLocked_idx" ON "SampleSeal"("isWitnessLocked");
CREATE INDEX "InspectionOrder_isWitnessLocked_idx" ON "InspectionOrder"("isWitnessLocked");
