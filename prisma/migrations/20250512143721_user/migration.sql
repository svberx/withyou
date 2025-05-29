/*
  Warnings:

  - You are about to drop the `_filetouser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `file` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_filetouser` DROP FOREIGN KEY `_FileToUser_A_fkey`;

-- DropForeignKey
ALTER TABLE `_filetouser` DROP FOREIGN KEY `_FileToUser_B_fkey`;

-- DropTable
DROP TABLE `_filetouser`;

-- DropTable
DROP TABLE `file`;

-- CreateTable
CREATE TABLE `MedicalAnalysis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `alb` DOUBLE NULL,
    `alp` DOUBLE NULL,
    `che` DOUBLE NULL,
    `bil` DOUBLE NULL,
    `ast` DOUBLE NULL,
    `alt` DOUBLE NULL,
    `chol` DOUBLE NULL,
    `crea` DOUBLE NULL,
    `ggt` DOUBLE NULL,
    `prot` DOUBLE NULL,
    `text` VARCHAR(191) NOT NULL,
    `aiFeedback` VARCHAR(191) NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MedicalAnalysis` ADD CONSTRAINT `MedicalAnalysis_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
