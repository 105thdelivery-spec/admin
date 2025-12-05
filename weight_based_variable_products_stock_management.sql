-- Migration: Weight-Based Variable Products - Stock Management at Product Level
-- Date: 2025-12-04
-- Description: This migration documents the stock management approach for weight-based variable products.
--              For these products, inventory is tracked at the PRODUCT level, not at the VARIANT level.
--              Variants are used only for ordering/display purposes (e.g., different package sizes).

-- IMPORTANT NOTES:
-- 1. Weight-based variable products have:
--    - products.productType = 'variable'
--    - products.stockManagementType = 'weight'
--
-- 2. For these products:
--    - Stock is stored in product_inventory with variantId = NULL
--    - Stock movements are recorded with variantId = NULL
--    - When customers order a variant, the stock is deducted from the main product inventory
--
-- 3. This approach is necessary because:
--    - Weight-based products are sold in variable quantities (e.g., 100g, 250g, 500g)
--    - The actual inventory is a bulk quantity (e.g., 10kg total)
--    - Variants represent different package sizes, not separate inventory pools
--
-- 4. Example:
--    Product: "Premium Coffee Beans" (weight-based, variable)
--    Main Inventory: 10,000g (10kg) stored at product level
--    Variants: 100g package, 250g package, 500g package, 1kg package
--    When customer orders "250g package", 250g is deducted from the 10kg main inventory

-- No actual schema changes needed - this is a documentation migration
-- The existing schema already supports this approach through nullable variantId fields

-- Verification queries to check weight-based variable products:
-- SELECT p.id, p.name, p.productType, p.stockManagementType, 
--        pi.weightQuantity, pi.variantId
-- FROM products p
-- LEFT JOIN product_inventory pi ON p.id = pi.productId
-- WHERE p.productType = 'variable' AND p.stockManagementType = 'weight';

-- Expected result: variantId should be NULL for all weight-based variable products
