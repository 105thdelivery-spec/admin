# Weight-Based Variable Products - Stock Management Guide

## Overview

This document explains how stock management works for **weight-based variable products** in the admin system.

## Key Concept

For weight-based variable products:
- **Inventory is tracked at the PRODUCT level**, not at the variant level
- **Variants represent different package sizes** for ordering/display purposes only
- **All stock movements** affect the main product inventory

## Product Configuration

### Product Type: Variable
When you create a product with:
- **Product Type**: `Variable Product (with variations)`
- **Stock Management Type**: `Weight-Based`

The system automatically manages inventory at the product level.

### Example Product Setup

**Product**: Premium Coffee Beans
- **Type**: Variable Product
- **Stock Management**: Weight-Based
- **Main Inventory**: 10,000g (10kg)

**Variants** (for ordering):
- 100g package - $5.00
- 250g package - $12.00
- 500g package - $23.00
- 1kg package - $45.00

## Stock Management Workflow

### Adding Stock (`/inventory/stock-movements/add`)

1. **Select Product**: Choose your weight-based variable product
2. **Variant Selection**: 
   - For weight-based variable products, the variant dropdown is **disabled**
   - You'll see a message: "Stock managed at product level"
3. **Enter Weight**: Add the weight quantity (e.g., 5000g)
4. **Submit**: Stock is added to the main product inventory

### Stock Movement Behavior

#### ✅ Correct Behavior
```
Product: Premium Coffee Beans (10kg total)
Action: Add 5kg stock
Result: Main product inventory = 15kg
Variants: All variants can now sell from this 15kg pool
```

#### ❌ Incorrect Behavior (Old System)
```
Product: Premium Coffee Beans
Action: Add 5kg to "500g package" variant
Result: Only "500g package" has stock
Problem: Other variants (100g, 250g, 1kg) show as out of stock
```

## Frontend Order Processing

When a customer orders a variant on the frontend:

1. Customer selects: "250g package" of Premium Coffee Beans
2. System checks: Main product inventory (15kg available)
3. Order placed: 250g deducted from main product inventory
4. New inventory: 14.75kg (14,750g)

## Database Schema

### Products Table
```sql
products
  - id
  - name
  - productType: 'variable'
  - stockManagementType: 'weight'
  - pricePerUnit: price per gram
  - baseWeightUnit: 'g' or 'kg'
```

### Product Inventory Table
```sql
product_inventory
  - id
  - productId: reference to main product
  - variantId: NULL (for weight-based variable products)
  - weightQuantity: total weight in grams
  - availableWeight: available weight in grams
```

### Stock Movements Table
```sql
stock_movements
  - id
  - productId: reference to main product
  - variantId: NULL (for weight-based variable products)
  - weightQuantity: weight moved in grams
  - movementType: 'in', 'out', 'adjustment'
```

## Code Implementation

### Key Files Modified

1. **`/app/inventory/stock-movements/add/page.tsx`**
   - Disables variant selection for weight-based variable products
   - Shows informational message
   - Ensures variantId is null when submitting

2. **`/app/api/inventory/stock-movements/route.ts`**
   - Detects weight-based variable products
   - Forces inventory lookup at product level
   - Ensures variantId is null in all operations

### Logic Flow

```typescript
// Detect weight-based variable product
const isWeightBasedVariable = 
  isWeightBased && productType === 'variable';

// Force product-level inventory
if (isWeightBasedVariable) {
  variantId = null; // Always null for these products
}
```

## Benefits

### ✅ Advantages

1. **Simplified Inventory**: One inventory pool for all variants
2. **Accurate Stock**: No confusion about which variant has stock
3. **Flexible Ordering**: Customers can order any variant size
4. **Easy Restocking**: Add stock once, available for all variants
5. **Realistic Model**: Matches real-world bulk inventory management

### 🎯 Use Cases

Perfect for:
- Coffee beans (sold in various package sizes)
- Bulk foods (rice, flour, sugar)
- Liquids (oils, syrups, beverages)
- Cannabis products (sold by weight in different amounts)
- Any product sold by weight in multiple package sizes

## Testing

### Test Scenario 1: Add Stock
1. Create a weight-based variable product with 3 variants
2. Go to `/inventory/stock-movements/add`
3. Select the product
4. Verify variant dropdown is disabled
5. Add 1000g stock
6. Check database: `variantId` should be NULL

### Test Scenario 2: Frontend Order
1. Customer orders 250g variant
2. Check stock deduction from main product
3. Verify all variants still show as available
4. Confirm inventory reduced by 250g

## Troubleshooting

### Issue: Variant dropdown is not disabled
**Solution**: Check that product has:
- `productType = 'variable'`
- `stockManagementType = 'weight'`

### Issue: Stock not updating
**Solution**: Verify inventory record has:
- Correct `productId`
- `variantId = NULL`
- `weightQuantity` in grams

### Issue: Frontend shows out of stock
**Solution**: Ensure order processing checks:
- Main product inventory (not variant inventory)
- Uses `variantId = NULL` for lookup

## Migration Notes

No database migration required. The existing schema supports this approach through:
- Nullable `variantId` fields in `product_inventory`
- Nullable `variantId` fields in `stock_movements`

## Future Enhancements

Potential improvements:
1. Add visual indicator on product list for weight-based variable products
2. Show variant breakdown in inventory reports (for reference only)
3. Add bulk import for stock movements
4. Create inventory alerts based on total weight

## Support

For questions or issues:
1. Check this documentation
2. Review code comments in modified files
3. Verify database records match expected schema
4. Test with sample products before production use

---

**Last Updated**: December 4, 2025
**Version**: 1.0
