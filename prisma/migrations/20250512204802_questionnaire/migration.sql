-- CreateTable
CREATE TABLE `Questionnaire` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `bmi` DOUBLE NULL,
    `fever` BOOLEAN NOT NULL,
    `nausea` BOOLEAN NOT NULL,
    `headache` BOOLEAN NOT NULL,
    `diarrhea` BOOLEAN NOT NULL,
    `fatigue` BOOLEAN NOT NULL,
    `jaundice` BOOLEAN NOT NULL,
    `epigastric` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
