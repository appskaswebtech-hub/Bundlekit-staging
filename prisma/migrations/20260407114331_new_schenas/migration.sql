-- CreateTable
CREATE TABLE "QuantityBreak" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "bundleName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "showWidget" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "applyOnSubs" BOOLEAN NOT NULL DEFAULT true,
    "renewalCount" INTEGER NOT NULL DEFAULT -1,
    "combineProduct" BOOLEAN NOT NULL DEFAULT true,
    "combineOrder" BOOLEAN NOT NULL DEFAULT true,
    "combineShipping" BOOLEAN NOT NULL DEFAULT true,
    "variantPickerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "productSelectionType" TEXT NOT NULL DEFAULT 'SPECIFIC',
    "allowCombineProducts" BOOLEAN NOT NULL DEFAULT false,
    "shopifyDiscountId" TEXT,
    "shopifyFunctionId" TEXT,
    "metafieldId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QuantityBreakTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quantityBreakId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "tierType" TEXT NOT NULL DEFAULT 'FIXED_QUANTITY',
    "quantity" INTEGER NOT NULL,
    "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" REAL NOT NULL DEFAULT 0,
    "savingsText" TEXT NOT NULL DEFAULT 'Save {{discount_value}}{{discount_unit}}',
    "description" TEXT NOT NULL DEFAULT 'Buy {{quantity}} and get a discount!',
    "freeShipping" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "QuantityBreakTier_quantityBreakId_fkey" FOREIGN KEY ("quantityBreakId") REFERENCES "QuantityBreak" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuantityBreakProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quantityBreakId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "imageUrl" TEXT,
    "shopifyVariantId" TEXT,
    "variantTitle" TEXT,
    CONSTRAINT "QuantityBreakProduct_quantityBreakId_fkey" FOREIGN KEY ("quantityBreakId") REFERENCES "QuantityBreak" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuantityBreakOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quantityBreakId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "shopifyLineItemId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "shopifyVariantId" TEXT NOT NULL,
    "tierQuantity" INTEGER NOT NULL,
    "discountValue" REAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePaid" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuantityBreakOrder_quantityBreakId_fkey" FOREIGN KEY ("quantityBreakId") REFERENCES "QuantityBreak" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "QuantityBreak_shop_idx" ON "QuantityBreak"("shop");

-- CreateIndex
CREATE INDEX "QuantityBreak_shopifyDiscountId_idx" ON "QuantityBreak"("shopifyDiscountId");

-- CreateIndex
CREATE INDEX "QuantityBreakTier_quantityBreakId_idx" ON "QuantityBreakTier"("quantityBreakId");

-- CreateIndex
CREATE INDEX "QuantityBreakProduct_quantityBreakId_idx" ON "QuantityBreakProduct"("quantityBreakId");

-- CreateIndex
CREATE INDEX "QuantityBreakProduct_shopifyProductId_idx" ON "QuantityBreakProduct"("shopifyProductId");

-- CreateIndex
CREATE INDEX "QuantityBreakOrder_quantityBreakId_idx" ON "QuantityBreakOrder"("quantityBreakId");

-- CreateIndex
CREATE INDEX "QuantityBreakOrder_shopifyOrderId_idx" ON "QuantityBreakOrder"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "QuantityBreakOrder_shop_idx" ON "QuantityBreakOrder"("shop");
