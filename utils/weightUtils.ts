// Weight utilities - Simplified (No Conversion)

export type WeightUnit = 'g' | 'kg' | 'lb' | 'oz';

export interface WeightValue {
  value: number;
  unit: WeightUnit;
}

export interface WeightDisplay {
  displayValue: number;
  displayUnit: WeightUnit;
  formattedString: string;
}

/**
 * Format weight for display with the specified unit label
 * No conversion - just formats the value with the unit
 */
export function formatWeight(value: number, displayUnit: WeightUnit = 'g'): WeightDisplay {
  let formattedValue: string;

  // Format based on typical precision for each unit
  switch (displayUnit) {
    case 'g':
      formattedValue = value.toFixed(1);
      break;
    case 'kg':
      formattedValue = value.toFixed(2);
      break;
    case 'lb':
      formattedValue = value.toFixed(2);
      break;
    case 'oz':
      formattedValue = value.toFixed(1);
      break;
    default:
      formattedValue = value.toString();
  }

  return {
    displayValue: value,
    displayUnit,
    formattedString: `${formattedValue}${displayUnit}`
  };
}

/**
 * Auto-format weight (legacy function - now just uses formatWeight)
 */
export function formatWeightAuto(value: number, displayUnit: WeightUnit = 'g'): WeightDisplay {
  return formatWeight(value, displayUnit);
}

/**
 * Get weight units for display
 */
export function getWeightUnits(): Array<{ value: WeightUnit; label: string }> {
  return [
    { value: 'g', label: 'Gram (g)' },
    { value: 'oz', label: 'Ounce (oz)' },
    { value: 'lb', label: 'Pound (lb)' },
    { value: 'kg', label: 'Kilogram (kg)' }
  ];
}

/**
 * Get the full name of a weight unit
 */
export function getWeightUnitLabel(unit: WeightUnit): string {
  switch (unit) {
    case 'g':
      return 'gram';
    case 'kg':
      return 'kilogram';
    case 'lb':
      return 'pound';
    case 'oz':
      return 'ounce';
    default:
      return unit;
  }
}

/**
 * Check if a product uses weight-based stock management
 */
export function isWeightBasedProduct(stockManagementType: string): boolean {
  return stockManagementType === 'weight';
}

/**
 * Get appropriate stock status for weight-based products
 */
export function getWeightStockStatus(
  availableWeight: number,
  reorderPoint: number
): { status: string; color: string } {
  if (availableWeight <= 0) {
    return { status: 'Out of Stock', color: 'bg-red-100 text-red-800' };
  } else if (availableWeight <= reorderPoint) {
    return { status: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
  } else {
    return { status: 'In Stock', color: 'bg-green-100 text-green-800' };
  }
}

/**
 * Format weight for input fields
 */
export function formatWeightForInput(value: number, unit: WeightUnit): string {
  if (unit === 'g') {
    return Math.round(value).toString();
  } else if (unit === 'kg') {
    return value.toFixed(2);
  } else {
    return value.toFixed(2);
  }
}

/**
 * Legacy functions for backward compatibility
 */
export function convertToGrams(value: number, unit: WeightUnit | 'grams'): number {
  // No conversion - just return the value as-is
  return value;
}

export function convertFromGrams(grams: number, targetUnit: WeightUnit | 'grams'): number {
  // No conversion - just return the value as-is
  return grams;
}

export function convertWeight(value: number, fromUnit: WeightUnit | 'grams', toUnit: WeightUnit | 'grams'): number {
  // No conversion - just return the value as-is
  return value;
}

export function parseWeightInput(input: string, defaultUnit: WeightUnit = 'g'): WeightValue | null {
  if (!input || input.trim() === '') {
    return null;
  }

  const trimmed = input.trim().toLowerCase();

  // Extract number and unit
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(g|kg|lb|oz)?$/);

  if (!match) {
    return null;
  }

  const value = parseFloat(match[1]);
  let unit: WeightUnit = defaultUnit;

  if (match[2]) {
    unit = match[2] as WeightUnit;
  }

  return { value, unit };
}

export function validateWeight(value: number): { isValid: boolean; error?: string } {
  if (isNaN(value) || value < 0) {
    return { isValid: false, error: 'Weight must be a positive number' };
  }

  return { isValid: true };
}

export function calculateWeightBasedPrice(
  weight: number,
  pricePerUnit: number
): number {
  return weight * pricePerUnit;
}
