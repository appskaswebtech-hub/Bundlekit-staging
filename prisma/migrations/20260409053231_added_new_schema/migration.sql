/*
  Warnings:

  - You are about to drop the `BundleProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Shop` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShopPlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShopSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `applyOnPreOrders` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `combineOrderDiscounts` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `combineProductDiscounts` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `combineShippingDiscounts` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `scheduleEnabled` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledEnd` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledStart` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `sealSubscriptionsEnabled` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `shopId` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `freeShippingEnabled` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `minQuantity` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `quantityType` on the `QuantityBreak` table. All the data in the column will be lost.
  - Added the required column `shop` to the `Bundle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shop` to the `QuantityBreak` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "BundleProduct_bundleId_shopifyProductId_shopifyVariantId_key";

-- DropIndex
DROP INDEX "BundleProduct_bundleId_idx";

-- DropIndex
DROP INDEX "Shop_shopDomain_idx";

-- DropIndex
DROP INDEX "Shop_shopDomain_key";

-- DropIndex
DROP INDEX "ShopPlan_shop_key";

-- DropIndex
DROP INDEX "ShopSetting_shopId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BundleProduct";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Shop";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ShopPlan";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ShopSetting";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "DiscountCombination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "productDiscounts" BOOLEAN NOT NULL DEFAULT true,
    "orderDiscounts" BOOLEAN NOT NULL DEFAULT true,
    "shippingDiscounts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiscountCombination_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WidgetSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "colors" TEXT NOT NULL DEFAULT '{"primary":"#5C6AC4","secondary":"#47C1BF","accent":"#00848E"}',
    "enableVariantPicker" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WidgetSettings_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bundleType" TEXT NOT NULL DEFAULT 'QUANTITY_BREAKS',
    "prioritySequence" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "showWidget" BOOLEAN NOT NULL DEFAULT true,
    "applyOnSubscriptions" BOOLEAN NOT NULL DEFAULT false,
    "numberOfRenewals" TEXT NOT NULL DEFAULT 'Unlimited',
    "productSelectionType" TEXT NOT NULL DEFAULT 'ALL_PRODUCTS',
    "selectedProductIds" TEXT,
    "shortcode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Bundle" ("applyOnSubscriptions", "bundleType", "createdAt", "id", "name", "numberOfRenewals", "prioritySequence", "productSelectionType", "showWidget", "status", "title", "updatedAt") SELECT "applyOnSubscriptions", "bundleType", "createdAt", "id", "name", coalesce("numberOfRenewals", 'Unlimited') AS "numberOfRenewals", "prioritySequence", "productSelectionType", "showWidget", "status", "title", "updatedAt" FROM "Bundle";
DROP TABLE "Bundle";
ALTER TABLE "new_Bundle" RENAME TO "Bundle";
CREATE INDEX "Bundle_shop_idx" ON "Bundle"("shop");
CREATE INDEX "Bundle_shop_status_idx" ON "Bundle"("shop", "status");
CREATE INDEX "Bundle_shop_bundleType_idx" ON "Bundle"("shop", "bundleType");
CREATE INDEX "Bundle_shop_createdAt_idx" ON "Bundle"("shop", "createdAt");
CREATE TABLE "new_QuantityBreak" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FIXED_QUANTITY',
    "quantity" INTEGER NOT NULL,
    "maxQuantity" INTEGER,
    "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" REAL NOT NULL,
    "savingsText" TEXT NOT NULL DEFAULT 'Save {{discount_value}}{{discount_unit}}',
    "description" TEXT NOT NULL,
    "freeShipping" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuantityBreak_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_QuantityBreak" ("bundleId", "createdAt", "description", "discountType", "discountValue", "id", "maxQuantity", "quantity", "savingsText", "sortOrder", "updatedAt") SELECT "bundleId", "createdAt", "description", "discountType", "discountValue", "id", "maxQuantity", "quantity", "savingsText", "sortOrder", "updatedAt" FROM "QuantityBreak";
DROP TABLE "QuantityBreak";
ALTER TABLE "new_QuantityBreak" RENAME TO "QuantityBreak";
CREATE INDEX "QuantityBreak_shop_idx" ON "QuantityBreak"("shop");
CREATE INDEX "QuantityBreak_shop_bundleId_idx" ON "QuantityBreak"("shop", "bundleId");
CREATE INDEX "QuantityBreak_bundleId_sortOrder_idx" ON "QuantityBreak"("bundleId", "sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCombination_bundleId_key" ON "DiscountCombination"("bundleId");

-- CreateIndex
CREATE INDEX "DiscountCombination_shop_idx" ON "DiscountCombination"("shop");

-- CreateIndex
CREATE INDEX "DiscountCombination_shop_bundleId_idx" ON "DiscountCombination"("shop", "bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetSettings_bundleId_key" ON "WidgetSettings"("bundleId");

-- CreateIndex
CREATE INDEX "WidgetSettings_shop_idx" ON "WidgetSettings"("shop");

-- CreateIndex
CREATE INDEX "WidgetSettings_shop_bundleId_idx" ON "WidgetSettings"("shop", "bundleId");
