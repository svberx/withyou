/*
  Warnings:

  - Made the column `bmi` on table `questionnaire` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `questionnaire` MODIFY `bmi` BOOLEAN NOT NULL;
