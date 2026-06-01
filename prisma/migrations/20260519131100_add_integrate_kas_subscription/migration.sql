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
    "integrateKasSubscrb" BOOLEAN NOT NULL DEFAULT false,
    "integrateKasSubscrbLabel" TEXT NOT NULL DEFAULT 'Subscribe & Save',
    "numberOfRenewals" TEXT NOT NULL DEFAULT 'Unlimited',
    "productSelectionType" TEXT NOT NULL DEFAULT 'ALL_PRODUCTS',
    "selectedProductIds" TEXT,
    "shortcode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Bundle" ("applyOnSubscriptions", "bundleType", "createdAt", "id", "integrateKasSubscrb", "name", "numberOfRenewals", "prioritySequence", "productSelectionType", "selectedProductIds", "shop", "shortcode", "showWidget", "status", "title", "updatedAt") SELECT "applyOnSubscriptions", "bundleType", "createdAt", "id", "integrateKasSubscrb", "name", "numberOfRenewals", "prioritySequence", "productSelectionType", "selectedProductIds", "shop", "shortcode", "showWidget", "status", "title", "updatedAt" FROM "Bundle";
DROP TABLE "Bundle";
ALTER TABLE "new_Bundle" RENAME TO "Bundle";
CREATE INDEX "Bundle_shop_idx" ON "Bundle"("shop");
CREATE INDEX "Bundle_shop_status_idx" ON "Bundle"("shop", "status");
CREATE INDEX "Bundle_shop_bundleType_idx" ON "Bundle"("shop", "bundleType");
CREATE INDEX "Bundle_shop_createdAt_idx" ON "Bundle"("shop", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
