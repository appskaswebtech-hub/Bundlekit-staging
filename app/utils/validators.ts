export type BundleType =
  | "CLASSIC"
  | "QUANTITY_BREAKS"
  | "VOLUME_DISCOUNT"
  | "MIX_MATCH"
  | "SECTIONED_MIX_MATCH"
  | "TIERED_MIX_MATCH";

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "FIXED_PRICE";

export type BundleStatus = "ACTIVE" | "PAUSED" | "DRAFT";

export type ProductSelectionType = "ALL_PRODUCTS" | "SPECIFIC_PRODUCTS";

export interface QuantityBreakFormData {
  id?: string;
  quantity: number;
  discountType: DiscountType;
  discountValue: number;
  description: string;
  savingsText: string;
  freeShipping: boolean;
  sortOrder: number;
}

export interface BundleFormData {
  name: string;
  title: string;
  bundleType: BundleType;
  prioritySequence: number;
  status: BundleStatus;
  showWidget: boolean;
  productSelectionType: ProductSelectionType;
  selectedProductIds?: string[];
  quantityBreaks: QuantityBreakFormData[];
}

// Validation functions
export function validateBundle(data: any): { valid: boolean; errors: Array<{ message: string; path?: string[] }> } {
  const errors: Array<{ message: string; path?: string[] }> = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push({ message: "Bundle name is required", path: ["name"] });
  }
  if (data.name && data.name.length > 100) {
    errors.push({ message: "Bundle name must be less than 100 characters", path: ["name"] });
  }

  if (!data.title || data.title.trim().length === 0) {
    errors.push({ message: "Title is required", path: ["title"] });
  }
  if (data.title && data.title.length > 200) {
    errors.push({ message: "Title must be less than 200 characters", path: ["title"] });
  }

  if (!data.bundleType) {
    errors.push({ message: "Bundle type is required", path: ["bundleType"] });
  }

  if (!data.quantityBreaks || data.quantityBreaks.length === 0) {
    errors.push({ message: "At least one quantity break is required", path: ["quantityBreaks"] });
  }

  if (data.prioritySequence && (data.prioritySequence < 1 || data.prioritySequence > 1000)) {
    errors.push({ message: "Priority sequence must be between 1 and 1000", path: ["prioritySequence"] });
  }

  // Validate quantity breaks
  if (data.quantityBreaks && Array.isArray(data.quantityBreaks)) {
    data.quantityBreaks.forEach((qb: any, index: number) => {
      if (!qb.quantity || qb.quantity < 1) {
        errors.push({
          message: `Quantity must be at least 1`,
          path: ["quantityBreaks", index.toString(), "quantity"]
        });
      }
      if (qb.discountValue === undefined || qb.discountValue < 0) {
        errors.push({
          message: `Discount value must be positive`,
          path: ["quantityBreaks", index.toString(), "discountValue"]
        });
      }
      if (!qb.description || qb.description.trim().length === 0) {
        errors.push({
          message: `Description is required`,
          path: ["quantityBreaks", index.toString(), "description"]
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateQuantityBreak(data: any): { valid: boolean; errors: Array<{ message: string }> } {
  const errors: Array<{ message: string }> = [];

  if (!data.quantity || data.quantity < 1) {
    errors.push({ message: "Quantity must be at least 1" });
  }

  if (!data.discountType) {
    errors.push({ message: "Discount type is required" });
  }

  if (data.discountValue === undefined || data.discountValue < 0) {
    errors.push({ message: "Discount value must be positive" });
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.push({ message: "Description is required" });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
