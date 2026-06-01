/*
  Warnings:

  - You are about to drop the `BundleItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BundleOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuantityBreakOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuantityBreakProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuantityBreakTier` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShopSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `compareAtPrice` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `discountType` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `discountValue` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `metafieldId` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `shop` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyProductId` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyVariantId` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `allowCombineProducts` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `applyOnSubs` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `bundleName` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `combineOrder` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `combineProduct` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `combineShipping` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `endsAt` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `metafieldId` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `productSelectionType` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `renewalCount` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `scheduleEnabled` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `shop` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyDiscountId` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyFunctionId` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `showWidget` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `QuantityBreak` table. All the data in the column will be lost.
  - You are about to drop the column `variantPickerEnabled` on the `QuantityBreak` table. All the data in the column will be lost.
  - Added the required column `name` to the `Bundle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopId` to the `Bundle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bundleId` to the `QuantityBreak` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `QuantityBreak` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "BundleItem_shopifyVariantId_idx";

-- DropIndex
DROP INDEX "BundleItem_bundleId_idx";

-- DropIndex
DROP INDEX "BundleOrder_shop_idx";

-- DropIndex
DROP INDEX "BundleOrder_shopifyOrderId_idx";

-- DropIndex
DROP INDEX "BundleOrder_bundleId_idx";

-- DropIndex
DROP INDEX "QuantityBreakOrder_shop_idx";

-- DropIndex
DROP INDEX "QuantityBreakOrder_shopifyOrderId_idx";

-- DropIndex
DROP INDEX "QuantityBreakOrder_quantityBreakId_idx";

-- DropIndex
DROP INDEX "QuantityBreakProduct_shopifyProductId_idx";

-- DropIndex
DROP INDEX "QuantityBreakProduct_quantityBreakId_idx";

-- DropIndex
DROP INDEX "QuantityBreakTier_quantityBreakId_idx";

-- DropIndex
DROP INDEX "ShopSettings_shop_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BundleItem";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BundleOrder";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "QuantityBreakOrder";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "QuantityBreakProduct";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "QuantityBreakTier";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ShopSettings";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "email" TEXT,
    "planName" TEXT NOT NULL DEFAULT 'free',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShopSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#1a1a2e',
    "secondaryColor" TEXT NOT NULL DEFAULT '#4a4a6a',
    "accentColor" TEXT NOT NULL DEFAULT '#3a9e5f',
    "backgroundColor" TEXT NOT NULL DEFAULT '#f5f0e8',
    "brandingRemoved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopSetting_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BundleProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bundleId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "shopifyVariantId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BundleProduct_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bundleType" TEXT NOT NULL DEFAULT 'QUANTITY_BREAK',
    "prioritySequence" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "showWidget" BOOLEAN NOT NULL DEFAULT true,
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduledStart" DATETIME,
    "scheduledEnd" DATETIME,
    "applyOnSubscriptions" BOOLEAN NOT NULL DEFAULT true,
    "applyOnPreOrders" BOOLEAN NOT NULL DEFAULT true,
    "numberOfRenewals" INTEGER,
    "combineProductDiscounts" BOOLEAN NOT NULL DEFAULT true,
    "combineOrderDiscounts" BOOLEAN NOT NULL DEFAULT true,
    "combineShippingDiscounts" BOOLEAN NOT NULL DEFAULT true,
    "productSelectionType" TEXT NOT NULL DEFAULT 'ALL_PRODUCTS',
    "sealSubscriptionsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bundle_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Bundle" ("createdAt", "id", "status", "title", "updatedAt") SELECT "createdAt", "id", "status", "title", "updatedAt" FROM "Bundle";
DROP TABLE "Bundle";
ALTER TABLE "new_Bundle" RENAME TO "Bundle";
CREATE INDEX "Bundle_shopId_idx" ON "Bundle"("shopId");
CREATE INDEX "Bundle_shopId_status_idx" ON "Bundle"("shopId", "status");
CREATE TABLE "new_QuantityBreak" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bundleId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "quantityType" TEXT NOT NULL DEFAULT 'FIXED',
    "quantity" INTEGER NOT NULL,
    "minQuantity" INTEGER,
    "maxQuantity" INTEGER,
    "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" REAL NOT NULL DEFAULT 0,
    "savingsText" TEXT NOT NULL DEFAULT 'Save {{discount_value}}{{discount_unit}}',
    "description" TEXT NOT NULL DEFAULT 'Buy {{quantity}} and get a discount!',
    "freeShippingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuantityBreak_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_QuantityBreak" ("createdAt", "id", "updatedAt") SELECT "createdAt", "id", "updatedAt" FROM "QuantityBreak";
DROP TABLE "QuantityBreak";
ALTER TABLE "new_QuantityBreak" RENAME TO "QuantityBreak";
CREATE INDEX "QuantityBreak_bundleId_idx" ON "QuantityBreak"("bundleId");
CREATE INDEX "QuantityBreak_bundleId_sortOrder_idx" ON "QuantityBreak"("bundleId", "sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shopDomain_key" ON "Shop"("shopDomain");

-- CreateIndex
CREATE INDEX "Shop_shopDomain_idx" ON "Shop"("shopDomain");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSetting_shopId_key" ON "ShopSetting"("shopId");

-- CreateIndex
CREATE INDEX "BundleProduct_bundleId_idx" ON "BundleProduct"("bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "BundleProduct_bundleId_shopifyProductId_shopifyVariantId_key" ON "BundleProduct"("bundleId", "shopifyProductId", "shopifyVariantId");
