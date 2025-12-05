# Fixed Weight Label Mismatch

## Date: December 4, 2025

## Issue
The user reported that the weight unit displayed on the "Add Stock Movement" page did not match the value in the database settings table.

## Verification
*   Checked the database directly via a debug API.
*   **Database Value**: `weight_label` = `"oz"` (Ounce).
*   **UI Behavior**: Was likely defaulting to "g" (Gram) due to context loading timing or caching issues.

## Fix Implemented
1.  **Replaced Dropdown**: The weight unit selector is now a read-only display, as requested.
2.  **Forced Refresh**: The component now calls `refreshWeightLabel()` immediately upon mounting to fetch the latest value from the database.
3.  **Loading State**: Added a loading indicator (`...`) to the weight unit display to prevent showing the wrong default value while the correct one is being fetched.

## Result
The page will now correctly display **"Ounce (oz)"** (or whatever is in the DB) next to the Weight Quantity field, matching the system settings.

## Files Modified
*   `admin/app/inventory/stock-movements/add/page.tsx`
