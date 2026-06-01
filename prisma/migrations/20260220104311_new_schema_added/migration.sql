/*
  Warnings:

  - You are about to drop the `Shop` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `badgeText` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `bundlePrice` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `endsAt` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `freeProductId` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `freeVariantId` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `handle` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `originalPrice` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `savings` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `shopId` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `compareAtPrice` on the `BundleItem` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `BundleItem` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `BundleItem` table. All the data in the column will be lost.
  - You are about to drop the column `cancelledAt` on the `BundleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `BundleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `discountAmount` on the `BundleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `discountTypeApplied` on the `BundleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `discountValueApplied` on the `BundleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `freeProductApplied` on the `BundleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `fulfilledAt` on the `BundleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `itemsSnapshot` on the `BundleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `orderStatus` on the `BundleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `orderedAt` on the `BundleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `shopId` on the `BundleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyCustomerId` on the `BundleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyOrderName` on the `BundleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `BundleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `BundleOrder` table. All the data in the column will be lost.
  - Added the required column `shop` to the `Bundle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricePaid` to the `BundleOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `BundleOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shop` to the `BundleOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopifyLineItemId` to the `BundleOrder` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Shop";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "bundleProductTag" TEXT NOT NULL DEFAULT 'bundle',
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "showBundleComponents" BOOLEAN NOT NULL DEFAULT true,
    "webhooksRegistered" BOOLEAN NOT NULL DEFAULT false,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "shopifyProductId" TEXT,
    "shopifyVariantId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "discountType" TEXT NOT NULL DEFAULT 'NONE',
    "discountValue" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL,
    "compareAtPrice" REAL,
    "image" TEXT,
    "metafieldId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Bundle" ("createdAt", "description", "discountType", "discountValue", "id", "shopifyProductId", "shopifyVariantId", "status", "title", "updatedAt") SELECT "createdAt", "description", coalesce("discountType", 'NONE') AS "discountType", coalesce("discountValue", 0) AS "discountValue", "id", "shopifyProductId", "shopifyVariantId", "status", "title", "updatedAt" FROM "Bundle";
DROP TABLE "Bundle";
ALTER TABLE "new_Bundle" RENAME TO "Bundle";
CREATE INDEX "Bundle_shop_idx" ON "Bundle"("shop");
CREATE INDEX "Bundle_shopifyProductId_idx" ON "Bundle"("shopifyProductId");
CREATE TABLE "new_BundleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bundleId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "shopifyVariantId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "variantTitle" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" REAL NOT NULL,
    "sku" TEXT,
    "imageUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BundleItem" ("bundleId", "id", "imageUrl", "position", "price", "productTitle", "quantity", "shopifyProductId", "shopifyVariantId", "sku", "variantTitle") SELECT "bundleId", "id", "imageUrl", "position", "price", "productTitle", "quantity", "shopifyProductId", "shopifyVariantId", "sku", "variantTitle" FROM "BundleItem";
DROP TABLE "BundleItem";
ALTER TABLE "new_BundleItem" RENAME TO "BundleItem";
CREATE INDEX "BundleItem_bundleId_idx" ON "BundleItem"("bundleId");
CREATE INDEX "BundleItem_shopifyVariantId_idx" ON "BundleItem"("shopifyVariantId");
CREATE TABLE "new_BundleOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bundleId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "shopifyLineItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePaid" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BundleOrder_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BundleOrder" ("bundleId", "id", "shopifyOrderId") SELECT "bundleId", "id", "shopifyOrderId" FROM "BundleOrder";
DROP TABLE "BundleOrder";
ALTER TABLE "new_BundleOrder" RENAME TO "BundleOrder";
CREATE INDEX "BundleOrder_bundleId_idx" ON "BundleOrder"("bundleId");
CREATE INDEX "BundleOrder_shopifyOrderId_idx" ON "BundleOrder"("shopifyOrderId");
CREATE INDEX "BundleOrder_shop_idx" ON "BundleOrder"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ShopSettings_shop_key" ON "ShopSettings"("shop");
