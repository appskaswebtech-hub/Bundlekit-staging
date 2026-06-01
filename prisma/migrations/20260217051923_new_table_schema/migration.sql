-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT,
    "plan" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "handle" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "shopifyProductId" TEXT,
    "shopifyVariantId" TEXT,
    "imageUrl" TEXT,
    "badgeText" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "discountType" TEXT,
    "discountValue" REAL,
    "freeProductId" TEXT,
    "freeVariantId" TEXT,
    "originalPrice" REAL,
    "bundlePrice" REAL,
    "savings" REAL,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bundle_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BundleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bundleId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "shopifyVariantId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "variantTitle" TEXT,
    "sku" TEXT,
    "imageUrl" TEXT,
    "price" REAL NOT NULL,
    "compareAtPrice" REAL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BundleOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bundleId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "shopifyOrderName" TEXT NOT NULL,
    "shopifyCustomerId" TEXT,
    "discountTypeApplied" TEXT,
    "discountValueApplied" REAL,
    "freeProductApplied" TEXT,
    "subtotal" REAL NOT NULL,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "itemsSnapshot" TEXT NOT NULL,
    "orderStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "fulfilledAt" DATETIME,
    "cancelledAt" DATETIME,
    "orderedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BundleOrder_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Bundle_shopId_status_idx" ON "Bundle"("shopId", "status");

-- CreateIndex
CREATE INDEX "Bundle_shopId_position_idx" ON "Bundle"("shopId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Bundle_shopId_handle_key" ON "Bundle"("shopId", "handle");

-- CreateIndex
CREATE INDEX "BundleItem_bundleId_idx" ON "BundleItem"("bundleId");

-- CreateIndex
CREATE INDEX "BundleItem_shopifyProductId_idx" ON "BundleItem"("shopifyProductId");

-- CreateIndex
CREATE INDEX "BundleOrder_shopId_idx" ON "BundleOrder"("shopId");

-- CreateIndex
CREATE INDEX "BundleOrder_bundleId_idx" ON "BundleOrder"("bundleId");

-- CreateIndex
CREATE INDEX "BundleOrder_shopifyOrderId_idx" ON "BundleOrder"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "BundleOrder_shopifyCustomerId_idx" ON "BundleOrder"("shopifyCustomerId");
