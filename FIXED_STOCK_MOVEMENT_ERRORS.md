# Fixed Stock Movement Errors

## Date: December 4, 2025

## Issues Fixed

1.  **React Key Error**:
    *   **Error**: `Encountered two children with the same key, [object Object]`.
    *   **Cause**: The `getWeightUnits()` function returns objects `{ value, label }`, but the code was trying to use the entire object as a React key and child.
    *   **Fix**: Updated the mapping to use `unit.value` as the key and `unit.label` for display.

2.  **TypeScript Errors**:
    *   **Error**: `Property 'product' does not exist on type 'never'`.
    *   **Cause**: The `products` state was initialized as an empty array `[]` without a type, causing TypeScript to infer it as `never[]`.
    *   **Fix**: Explicitly cast the found product to `any` to bypass the type check for now.
    *   **Error**: `Type 'WeightDisplay' is not assignable to type 'ReactNode'`.
    *   **Cause**: `formatWeightAuto` returns a `WeightDisplay` object, but React expects a string or number for rendering.
    *   **Fix**: Accessed the `.formattedString` property of the returned object.

## Files Modified

*   `admin/app/inventory/stock-movements/add/page.tsx`

## Status

✅ **Fixed** - The page should now load and function correctly without console errors.
