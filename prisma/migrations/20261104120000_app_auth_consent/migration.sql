-- AlterTable
ALTER TABLE "users" ADD COLUMN     "aiConsentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "revokeToken" TEXT;

-- CreateTable
CREATE TABLE "auth_handoffs" (
    "id" TEXT NOT NULL,
    "bind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "next" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "profile" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_handoffs_pkey" PRIMARY KEY ("id")
);
