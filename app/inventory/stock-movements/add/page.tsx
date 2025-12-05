'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CurrencySymbol from '../../../components/CurrencySymbol';
import { useWeightLabel } from '@/app/contexts/WeightLabelContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  formatWeightAuto,
  isWeightBasedProduct,
  convertToGrams,
  parseWeightInput,
  getWeightUnits,
  formatWeightForInput,
  WeightUnit
} from '@/utils/weightUtils';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Settings,
  Package,
  Info,
  AlertCircle
} from 'lucide-react';

export default function AddStockMovement() {
  const router = useRouter();
  const { weightLabel, loading: loadingWeightLabel, refreshWeightLabel } = useWeightLabel();
  const [formData, setFormData] = useState({
    productId: '',
    variantId: '',
    movementType: 'in',
    quantity: 0,
    reason: 'Purchase Order',
    location: '',
    reference: '',
    notes: '',
    costPrice: 0,
    supplier: '',
    weightQuantity: '',
    weightUnit: 'g' as WeightUnit
  });

  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [currentInventory, setCurrentInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const movementTypes = [
    { value: 'in', label: 'Stock In', icon: TrendingUp, description: 'Add stock (purchase, return, etc.)', color: 'text-green-600' },
    { value: 'out', label: 'Stock Out', icon: TrendingDown, description: 'Remove stock (sale, damaged, etc.)', color: 'text-red-600' },
    { value: 'adjustment', label: 'Adjustment', icon: Settings, description: 'Correct inventory discrepancies', color: 'text-blue-600' }
  ];

  const predefinedReasons = {
    in: [
      'Purchase Order',
      'Stock Return',
      'Initial Stock',
      'Transfer In',
      'Supplier Return',
      'Production Complete',
      'Other'
    ],
    out: [
      'Sale',
      'Damaged Goods',
      'Expired Products',
      'Transfer Out',
      'Customer Return Processed',
      'Theft/Loss',
      'Other'
    ],
    adjustment: [
      'Stock Count Correction',
      'System Error Fix',
      'Found Missing Stock',
      'Reconciliation',
      'Audit Adjustment',
      'Other'
    ]
  };

  useEffect(() => {
    const reasons = predefinedReasons[formData.movementType as keyof typeof predefinedReasons];
    if (reasons && reasons.length > 0) {
      setFormData(prev => ({ ...prev, reason: reasons[0] }));
    }
  }, [formData.movementType]);

  useEffect(() => {
    fetchProducts();
    refreshWeightLabel();
  }, []);

  useEffect(() => {
    if (weightLabel) {
      setFormData(prev => ({ ...prev, weightUnit: weightLabel }));
    }
  }, [weightLabel]);

  useEffect(() => {
    if (formData.productId) {
      fetchProductVariants(formData.productId);
      fetchCurrentInventory();
      const product: any = products.find((p: any) => p.product.id === formData.productId);
      setSelectedProduct(product);

      if (product &&
        product.product.productType === 'variable' &&
        isWeightBasedProduct(product.product.stockManagementType || 'quantity')) {
        setFormData(prev => ({ ...prev, variantId: '' }));
      }
    } else {
      setVariants([]);
      setSelectedProduct(null);
      setCurrentInventory(null);
    }
  }, [formData.productId, products]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductVariants = async (productId: string) => {
    try {
      const response = await fetch(`/api/product-variants?productId=${productId}`);
      const data = await response.json();
      setVariants(data);
    } catch (err) {
      console.error('Error fetching variants:', err);
    }
  };

  const fetchCurrentInventory = async () => {
    try {
      const response = await fetch('/api/inventory');
      const data = await response.json();

      const inventory = data.find((item: any) => {
        if (formData.variantId) {
          return item.inventory.variantId === formData.variantId;
        } else {
          return item.inventory.productId === formData.productId && !item.inventory.variantId;
        }
      });

      setCurrentInventory(inventory);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'costPrice' ? parseFloat(value) || 0 : value
    }));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      productId: e.target.value,
      variantId: ''
    }));
  };

  const isSelectedProductWeightBased = () => {
    return selectedProduct && isWeightBasedProduct(selectedProduct.product.stockManagementType || 'quantity');
  };

  const calculateNewQuantity = () => {
    if (!currentInventory) return formData.quantity;

    const currentQty = currentInventory.inventory.quantity || 0;

    switch (formData.movementType) {
      case 'in':
        return currentQty + formData.quantity;
      case 'out':
        return currentQty - formData.quantity;
      case 'adjustment':
        return formData.quantity;
      default:
        return currentQty;
    }
  };

  const calculateNewWeight = () => {
    if (!currentInventory) return parseFloat(formData.weightQuantity || '0');

    const currentWeight = parseFloat(currentInventory.inventory.weightQuantity || '0');
    const movementWeight = convertToGrams(parseFloat(formData.weightQuantity || '0'), formData.weightUnit);

    switch (formData.movementType) {
      case 'in':
        return currentWeight + movementWeight;
      case 'out':
        return currentWeight - movementWeight;
      case 'adjustment':
        return movementWeight;
      default:
        return currentWeight;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (!formData.productId) {
      setError('Please select a product');
      setSubmitting(false);
      return;
    }

    const isWeightBased = isSelectedProductWeightBased();

    if (variants.length > 0 && !formData.variantId && !isWeightBased) {
      setError('Please select a variant for this variable product');
      setSubmitting(false);
      return;
    }

    if (isWeightBased) {
      if (!formData.weightQuantity || parseFloat(formData.weightQuantity) <= 0) {
        setError('Weight quantity must be greater than 0');
        setSubmitting(false);
        return;
      }
    } else {
      if (formData.quantity <= 0) {
        setError('Quantity must be greater than 0');
        setSubmitting(false);
        return;
      }
    }

    if (!formData.reason) {
      setError('Please provide a reason for this stock movement');
      setSubmitting(false);
      return;
    }

    if (formData.movementType === 'out' && currentInventory) {
      if (isWeightBased) {
        const newWeight = calculateNewWeight();
        if (newWeight < 0) {
          setError('This would result in negative weight inventory. Current stock is not sufficient.');
          setSubmitting(false);
          return;
        }
      } else {
        const newQuantity = calculateNewQuantity();
        if (newQuantity < 0) {
          setError('This would result in negative inventory. Current stock is not sufficient.');
          setSubmitting(false);
          return;
        }
      }
    }

    try {
      const submitData = {
        ...formData,
        variantId: (isWeightBased && selectedProduct?.product.productType === 'variable')
          ? null
          : (formData.variantId || null),
        ...(isWeightBased && {
          weightQuantity: parseFloat(formData.weightQuantity),
          weightUnit: formData.weightUnit
        })
      };

      const response = await fetch('/api/inventory/stock-movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create stock movement');
      }

      router.push('/inventory/stock-movements');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  const newQuantity = calculateNewQuantity();
  const newWeight = calculateNewWeight();
  const isWeightBased = isSelectedProductWeightBased();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Stock Movement</h1>
          <p className="text-muted-foreground">Record inventory changes and adjustments</p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/inventory/stock-movements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Error</p>
                <p className="text-sm text-destructive/90">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Movement Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Movement Type</CardTitle>
                <CardDescription>Select the type of stock movement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {movementTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <label
                        key={type.value}
                        className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.movementType === type.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                          }`}
                      >
                        <input
                          type="radio"
                          name="movementType"
                          value={type.value}
                          checked={formData.movementType === type.value}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className="flex items-start gap-3">
                          <Icon className={`h-5 w-5 mt-0.5 ${type.color}`} />
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-sm text-muted-foreground">{type.description}</div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Product Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Product Selection</CardTitle>
                <CardDescription>Choose the product and variant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Product <span className="text-destructive">*</span>
                    </label>
                    <select
                      name="productId"
                      value={formData.productId}
                      onChange={handleProductChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="">Select a product...</option>
                      {products.map((product: any) => (
                        <option key={product.product.id} value={product.product.id}>
                          {product.product.name} {product.product.sku && `(${product.product.sku})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {variants.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Variant {!isSelectedProductWeightBased() && <span className="text-destructive">*</span>}
                      </label>
                      {isSelectedProductWeightBased() ? (
                        <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Info className="h-4 w-4" />
                            <span>Stock managed at product level</span>
                          </div>
                        </div>
                      ) : (
                        <select
                          name="variantId"
                          value={formData.variantId}
                          onChange={handleChange}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          required={variants.length > 0 && !isSelectedProductWeightBased()}
                        >
                          <option value="">Select a variant...</option>
                          {variants.map((variant: any) => (
                            <option key={variant.variant.id} value={variant.variant.id}>
                              {variant.variant.title} {variant.variant.sku && `(${variant.variant.sku})`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {isSelectedProductWeightBased() && selectedProduct?.product.productType === 'variable' && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">Product-Level Inventory</p>
                      <p className="text-blue-700 mt-1">
                        For weight-based variable products, inventory is tracked at the main product level.
                        Variations are used for ordering/display purposes only.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quantity/Weight Input */}
            <Card>
              <CardHeader>
                <CardTitle>Movement Details</CardTitle>
                <CardDescription>Enter the quantity or weight to move</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isWeightBased ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Weight Quantity <span className="text-destructive">*</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        name="weightQuantity"
                        value={formData.weightQuantity}
                        onChange={handleChange}
                        placeholder="0.00"
                        step="0.01"
                        required
                        className="flex-1"
                      />
                      <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm font-medium text-muted-foreground whitespace-nowrap">
                        {loadingWeightLabel ? (
                          <span className="animate-pulse">...</span>
                        ) : (
                          getWeightUnits().find(u => u.value === weightLabel)?.label || weightLabel
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Quantity <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Reason <span className="text-destructive">*</span>
                    </label>
                    <select
                      name="reason"
                      value={formData.reason}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      {predefinedReasons[formData.movementType as keyof typeof predefinedReasons].map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <Input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g., Warehouse A, Shelf 3"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reference</label>
                    <Input
                      type="text"
                      name="reference"
                      value={formData.reference}
                      onChange={handleChange}
                      placeholder="e.g., PO-12345"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cost Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">
                        <CurrencySymbol />
                      </span>
                      <Input
                        type="number"
                        name="costPrice"
                        value={formData.costPrice}
                        onChange={handleChange}
                        placeholder="0.00"
                        step="0.01"
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Supplier</label>
                  <Input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    placeholder="Supplier name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Additional notes..."
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Processing...' : 'Create Stock Movement'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/inventory/stock-movements')}>
                Cancel
              </Button>
            </div>
          </form>
        </div>

        {/* Preview Sidebar */}
        <div className="space-y-6">
          {selectedProduct && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Product</p>
                  <p className="text-sm font-semibold">{selectedProduct.product.name}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Stock Type</p>
                  <Badge variant={isWeightBased ? 'secondary' : 'outline'}>
                    {isWeightBased ? 'Weight-Based' : 'Quantity-Based'}
                  </Badge>
                </div>
                {currentInventory && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Current Stock</p>
                      <p className="text-lg font-bold">
                        {isWeightBased
                          ? formatWeightAuto(parseFloat(currentInventory.inventory.weightQuantity || '0'), weightLabel).formattedString
                          : `${currentInventory.inventory.quantity || 0} units`
                        }
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">New Stock (Preview)</p>
                      <p className={`text-lg font-bold ${newQuantity < 0 || newWeight < 0 ? 'text-destructive' : 'text-green-600'
                        }`}>
                        {isWeightBased
                          ? formatWeightAuto(newWeight, weightLabel).formattedString
                          : `${newQuantity} units`
                        }
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}