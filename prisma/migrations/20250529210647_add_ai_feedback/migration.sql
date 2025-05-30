/*
  Warnings:

  - Added the required column `updatedAt` to the `MedicalAnalysis` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `medicalanalysis` DROP FOREIGN KEY `MedicalAnalysis_userId_fkey`;

-- AlterTable
ALTER TABLE `medicalanalysis` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `text` TEXT NOT NULL,
    MODIFY `aiFeedback` TEXT NULL;

-- CreateIndex
CREATE INDEX `MedicalAnalysis_createdAt_idx` ON `MedicalAnalysis`(`createdAt`);

-- AddForeignKey
ALTER TABLE `MedicalAnalysis` ADD CONSTRAINT `MedicalAnalysis_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `medicalanalysis` RENAME INDEX `MedicalAnalysis_userId_fkey` TO `MedicalAnalysis_userId_idx`;
