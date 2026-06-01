export interface PriceCalculation {
  originalPrice: number;
  discountedPrice: number;
  savings: number;
  savingsPercentage: number;
  discountAmount: number;
}

export function calculateDiscountedPrice(
  basePrice: number,
  quantity: number,
  discountType: string,
  discountValue: number
): PriceCalculation {
  const originalPrice = basePrice * quantity;
  let discountedPrice = originalPrice;
  let discountAmount = 0;

  switch (discountType) {
    case "PERCENTAGE":
      discountAmount = (originalPrice * discountValue) / 100;
      discountedPrice = originalPrice - discountAmount;
      break;

    case "FIXED_AMOUNT":
      discountAmount = discountValue;
      discountedPrice = Math.max(0, originalPrice - discountValue);
      break;

    case "FIXED_PRICE":
      // Set price to fixed value per item
      discountedPrice = discountValue * quantity;
      discountAmount = originalPrice - discountedPrice;
      break;
  }

  const savings = originalPrice - discountedPrice;
  const savingsPercentage = originalPrice > 0
    ? (savings / originalPrice) * 100
    : 0;

  return {
    originalPrice,
    discountedPrice: Math.max(0, discountedPrice),
    savings: Math.max(0, savings),
    savingsPercentage: Math.max(0, savingsPercentage),
    discountAmount: Math.max(0, discountAmount),
  };
}

export function formatPrice(price: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatSavingsText(
  template: string,
  discountType: string,
  discountValue: number,
  calculation: PriceCalculation
): string {
  let text = template;

  // Replace discount value
  text = text.replace(/\{\{discount_value\}\}/g, discountValue.toString());

  // Replace discount unit
  const unit = discountType === "PERCENTAGE" ? "%" : "";
  text = text.replace(/\{\{discount_unit\}\}/g, unit);

  // Replace savings amount
  text = text.replace(/\{\{savings_amount\}\}/g, formatPrice(calculation.savings));

  // Replace savings percentage
  text = text.replace(/\{\{savings_percentage\}\}/g, Math.round(calculation.savingsPercentage).toString());

  return text;
}
