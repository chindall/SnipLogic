-- CreateEnum
CREATE TYPE "VariableScope" AS ENUM ('USER', 'WORKSPACE');

-- CreateTable
CREATE TABLE "Variable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "scope" "VariableScope" NOT NULL,
    "userId" TEXT,
    "workspaceId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Variable_organizationId_idx" ON "Variable"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Variable_name_scope_userId_workspaceId_key" ON "Variable"("name", "scope", "userId", "workspaceId");

-- AddForeignKey
ALTER TABLE "Variable" ADD CONSTRAINT "Variable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variable" ADD CONSTRAINT "Variable_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variable" ADD CONSTRAINT "Variable_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
