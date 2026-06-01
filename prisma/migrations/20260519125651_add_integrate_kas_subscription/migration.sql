/*
  Warnings:

  - You are about to drop the column `accentColor` on the `ShopSetting` table. All the data in the column will be lost.
  - You are about to drop the column `backgroundColor` on the `ShopSetting` table. All the data in the column will be lost.
  - You are about to drop the column `primaryColor` on the `ShopSetting` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryColor` on the `ShopSetting` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShopSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL DEFAULT 'volume',
    "primary_color" TEXT NOT NULL DEFAULT '#1a1a2e',
    "selected_bg" TEXT NOT NULL DEFAULT '#f0f4ff',
    "badge_bg" TEXT NOT NULL DEFAULT '#1a1a2e',
    "badge_text" TEXT NOT NULL DEFAULT '#ffffff',
    "text_color" TEXT NOT NULL DEFAULT '#333333',
    "border_color" TEXT NOT NULL DEFAULT '#e0e0e0',
    "original_price_color" TEXT NOT NULL DEFAULT '#999999',
    "margin_top" INTEGER NOT NULL DEFAULT 16,
    "margin_bottom" INTEGER NOT NULL DEFAULT 16,
    "brandingRemoved" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ShopSetting_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ShopSetting" ("brandingRemoved", "id", "shopId", "widgetType") SELECT "brandingRemoved", "id", "shopId", "widgetType" FROM "ShopSetting";
DROP TABLE "ShopSetting";
ALTER TABLE "new_ShopSetting" RENAME TO "ShopSetting";
CREATE UNIQUE INDEX "ShopSetting_shopId_widgetType_key" ON "ShopSetting"("shopId", "widgetType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
