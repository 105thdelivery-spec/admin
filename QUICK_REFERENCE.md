# Quick Reference: Weight-Based Variable Products

## 🎯 What Changed?

For **weight-based variable products**, stock is now managed at the **PRODUCT level**, not the variant level.

## 📦 Product Types Affected

Only products with BOTH:
- ✅ Product Type: **Variable Product**
- ✅ Stock Management: **Weight-Based**

## 🔧 How to Add Stock

### Step-by-Step:
1. Go to **Inventory → Stock Movements → Add Stock Movement**
2. Select your weight-based variable product
3. **Variant dropdown will be DISABLED** ✨
4. You'll see: "Stock managed at product level"
5. Enter the weight amount (e.g., 5000g)
6. Click "Record Stock Movement"

### ✅ Result:
- Stock added to main product inventory
- ALL variants can now be ordered from this inventory pool

## 💡 Key Concepts

### Variants = Package Sizes (Not Separate Stock)
```
Product: Premium Coffee Beans (10kg total)
├── 100g package ($5)   ┐
├── 250g package ($12)  │ All share the
├── 500g package ($23)  │ same 10kg pool
└── 1kg package ($45)   ┘
```

### Customer Orders
```
Customer orders: 250g package
↓
System deducts: 250g from main inventory
↓
New total: 9.75kg
↓
All variants still available ✅
```

## 🚫 What NOT to Do

❌ Don't try to add stock to individual variants
❌ Don't expect variant-level inventory tracking
❌ Don't be confused when variant dropdown is disabled

## ✅ What TO Do

✅ Add all stock to the main product
✅ Let customers order any variant size
✅ Monitor total product inventory
✅ Restock when main inventory is low

## 🔍 How to Identify These Products

In product list, look for:
- Product Type: **Variable**
- Stock Type: **⚖️ Weight-based**

## 📊 Database Check

To verify stock is at product level:
```sql
SELECT p.name, pi.weightQuantity, pi.variantId
FROM products p
JOIN product_inventory pi ON p.id = pi.productId
WHERE p.productType = 'variable' 
  AND p.stockManagementType = 'weight';
```

Expected: `variantId` should be **NULL** ✅

## 🎓 Real-World Examples

Perfect for:
- ☕ Coffee beans (sold in 100g, 250g, 500g, 1kg bags)
- 🌾 Bulk foods (rice, flour, sugar)
- 🛢️ Liquids (oils, syrups)
- 🌿 Cannabis products
- Any product sold by weight in multiple sizes

## 🆘 Troubleshooting

### Variant dropdown is NOT disabled?
→ Check product settings:
  - Product Type = 'variable'
  - Stock Management = 'weight'

### Stock not updating?
→ Verify database:
  - `product_inventory.variantId` = NULL
  - `product_inventory.weightQuantity` updated

### Frontend shows out of stock?
→ Check order processing uses:
  - Main product inventory lookup
  - variantId = NULL

## 📚 Full Documentation

See: `WEIGHT_BASED_VARIABLE_PRODUCTS_GUIDE.md`

---

**Quick Tip**: Think of variants as different "serving sizes" from the same bulk container! 🎯
