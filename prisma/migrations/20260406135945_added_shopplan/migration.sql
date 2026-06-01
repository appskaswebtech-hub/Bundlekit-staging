/*
  Warnings:

  - You are about to drop the column `salesLineItemGroupId` on the `BundleOrder` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "ShopPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "planName" TEXT NOT NULL DEFAULT 'free',
    "subscriptionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
INSERT INTO "new_BundleOrder" ("bundleId", "createdAt", "id", "pricePaid", "quantity", "shop", "shopifyLineItemId", "shopifyOrderId") SELECT "bundleId", "createdAt", "id", "pricePaid", "quantity", "shop", "shopifyLineItemId", "shopifyOrderId" FROM "BundleOrder";
DROP TABLE "BundleOrder";
ALTER TABLE "new_BundleOrder" RENAME TO "BundleOrder";
CREATE INDEX "BundleOrder_bundleId_idx" ON "BundleOrder"("bundleId");
CREATE INDEX "BundleOrder_shopifyOrderId_idx" ON "BundleOrder"("shopifyOrderId");
CREATE INDEX "BundleOrder_shop_idx" ON "BundleOrder"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ShopPlan_shop_key" ON "ShopPlan"("shop");
