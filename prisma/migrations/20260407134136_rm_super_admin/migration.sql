/*
  Warnings:

  - The values [SUPER_ADMIN] on the enum `AdminRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdminRole_new" AS ENUM ('ADMIN');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "AdminRole_new" USING ("role"::text::"AdminRole_new");
ALTER TYPE "AdminRole" RENAME TO "AdminRole_old";
ALTER TYPE "AdminRole_new" RENAME TO "AdminRole";
DROP TYPE "AdminRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
COMMIT;
