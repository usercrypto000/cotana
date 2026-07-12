ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

CREATE TYPE "UserRole_new" AS ENUM ('USER', 'ADMIN');

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE
      WHEN "role"::text = 'DEVELOPER_PORTAL' THEN 'USER'
      ELSE "role"::text
    END
  )::"UserRole_new";

ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
