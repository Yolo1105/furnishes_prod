-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CostLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "costUsd" REAL NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'chat',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CostLog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CostLog" ("completionTokens", "conversationId", "costUsd", "createdAt", "id", "model", "promptTokens") SELECT "completionTokens", "conversationId", "costUsd", "createdAt", "id", "model", "promptTokens" FROM "CostLog";
DROP TABLE "CostLog";
ALTER TABLE "new_CostLog" RENAME TO "CostLog";
CREATE INDEX "CostLog_conversationId_idx" ON "CostLog"("conversationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
