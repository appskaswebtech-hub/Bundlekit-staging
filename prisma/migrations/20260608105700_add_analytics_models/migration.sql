-- CreateTable
CREATE TABLE "AnalyticsSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "collectOrderData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "orderName" TEXT,
    "orderTotal" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSetting_shop_key" ON "AnalyticsSetting"("shop");

-- CreateIndex
CREATE INDEX "AnalyticsSetting_shop_idx" ON "AnalyticsSetting"("shop");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shop_idx" ON "AnalyticsEvent"("shop");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shop_createdAt_idx" ON "AnalyticsEvent"("shop", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsEvent_shop_shopifyOrderId_key" ON "AnalyticsEvent"("shop", "shopifyOrderId");
