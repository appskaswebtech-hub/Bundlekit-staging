-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShopSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL DEFAULT 'volume',
    "primaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "secondaryColor" TEXT NOT NULL DEFAULT '#4a4a6a',
    "accentColor" TEXT NOT NULL DEFAULT '#1d4ed8',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "brandingRemoved" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ShopSetting_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ShopSetting" ("accentColor", "backgroundColor", "brandingRemoved", "id", "primaryColor", "secondaryColor", "shopId") SELECT "accentColor", "backgroundColor", "brandingRemoved", "id", "primaryColor", "secondaryColor", "shopId" FROM "ShopSetting";
DROP TABLE "ShopSetting";
ALTER TABLE "new_ShopSetting" RENAME TO "ShopSetting";
CREATE UNIQUE INDEX "ShopSetting_shopId_widgetType_key" ON "ShopSetting"("shopId", "widgetType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
