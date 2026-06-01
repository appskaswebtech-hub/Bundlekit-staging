/*
  Warnings:

  - A unique constraint covering the columns `[shopifyOrderId,salesLineItemGroupId]` on the table `BundleOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BundleOrder" ADD COLUMN "salesLineItemGroupId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BundleOrder_shopifyOrderId_salesLineItemGroupId_key" ON "BundleOrder"("shopifyOrderId", "salesLineItemGroupId");
