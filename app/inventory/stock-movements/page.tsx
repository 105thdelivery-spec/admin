'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { convertFromGrams, formatWeight } from '@/utils/weightUtils';
import { useWeightLabel } from '@/app/contexts/WeightLabelContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Package,
  TrendingUp,
  TrendingDown,
  Settings,
  RefreshCw,
  Plus,
  ArrowLeft,
  Trash2,
  Search,
  Calendar
} from 'lucide-react';

interface StockMovement {
  id: string;
  productName: string;
  variantTitle?: string;
  movementType: 'in' | 'out' | 'adjustment';
  quantity: number;
  previousQuantity?: number;
  newQuantity?: number;
  weightQuantity?: number;
  previousWeightQuantity?: number;
  newWeightQuantity?: number;
  stockManagementType?: 'quantity' | 'weight';
  baseWeightUnit?: string;
  reason: string;
  location: string;
  createdAt: string;
  reference?: string;
  notes?: string;
  costPrice?: string;
  supplier?: string;
  processedBy?: string;
}

export default function StockMovements() {
  const { weightLabel } = useWeightLabel();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [movementFilter, setMovementFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedMovements, setSelectedMovements] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchStockMovements();
  }, []);

  useEffect(() => {
    filterMovements();
  }, [movements, searchTerm, movementFilter, dateRange]);

  const fetchStockMovements = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/inventory/stock-movements');
      if (response.ok) {
        const data = await response.json();
        setMovements(data);
      } else {
        console.error('Failed to fetch stock movements');
      }
    } catch (error) {
      console.error('Error fetching stock movements:', error);
    }
    setLoading(false);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMovements(new Set(filteredMovements.map(m => m.id)));
    } else {
      setSelectedMovements(new Set());
    }
  };

  const handleSelectMovement = (movementId: string, checked: boolean) => {
    const newSelected = new Set(selectedMovements);
    if (checked) {
      newSelected.add(movementId);
    } else {
      newSelected.delete(movementId);
    }
    setSelectedMovements(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedMovements.size === 0) {
      alert('Please select movements to delete');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedMovements.size} stock movement(s)? This action cannot be undone and will remove audit trail history.`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch('/api/inventory/stock-movements', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedMovements)
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message + (result.warning ? `\n\nWarning: ${result.warning}` : ''));
        await fetchStockMovements();
        setSelectedMovements(new Set());
      } else {
        const error = await response.json();
        alert(`Failed to delete movements: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting movements:', error);
      alert('Failed to delete movements. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const filterMovements = () => {
    let filtered = movements;

    if (searchTerm) {
      filtered = filtered.filter(movement =>
        movement.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.variantTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.reference?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (movementFilter !== 'all') {
      filtered = filtered.filter(movement => movement.movementType === movementFilter);
    }

    if (dateRange.startDate) {
      filtered = filtered.filter(movement =>
        new Date(movement.createdAt) >= new Date(dateRange.startDate)
      );
    }
    if (dateRange.endDate) {
      filtered = filtered.filter(movement =>
        new Date(movement.createdAt) <= new Date(dateRange.endDate)
      );
    }

    setFilteredMovements(filtered);
  };

  const getMovementTypeVariant = (type: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (type) {
      case 'in': return 'default';
      case 'out': return 'destructive';
      case 'adjustment': return 'secondary';
      default: return 'outline';
    }
  };

  const getTotalMovements = () => {
    return {
      in: filteredMovements.filter(m => m.movementType === 'in').reduce((sum, m) => sum + m.quantity, 0),
      out: filteredMovements.filter(m => m.movementType === 'out').reduce((sum, m) => sum + m.quantity, 0),
      adjustments: filteredMovements.filter(m => m.movementType === 'adjustment').length
    };
  };

  const formatWeightDisplay = (weight: number | string | undefined) => {
    const numericWeight = typeof weight === 'number' ? weight : parseFloat(String(weight || '0'));
    return formatWeight(numericWeight, weightLabel).formattedString;
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const totals = getTotalMovements();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Movements</h1>
          <p className="text-muted-foreground">Track all inventory movements and changes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedMovements.size > 0 && (
            <Button
              onClick={handleDeleteSelected}
              disabled={deleting}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? 'Deleting...' : `Delete (${selectedMovements.size})`}
            </Button>
          )}
          <Button
            onClick={fetchStockMovements}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild size="sm">
            <Link href="/inventory/stock-movements/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Movement
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/inventory">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movements</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredMovements.length}</div>
            <p className="text-xs text-muted-foreground">All time records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock In</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{totals.in}</div>
            <p className="text-xs text-muted-foreground">Units added</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Out</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{totals.out}</div>
            <p className="text-xs text-muted-foreground">Units removed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adjustments</CardTitle>
            <Settings className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totals.adjustments}</div>
            <p className="text-xs text-muted-foreground">Manual corrections</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter stock movements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products, reasons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Movement Type</label>
              <select
                value={movementFilter}
                onChange={(e) => setMovementFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">All Movements</option>
                <option value="in">Stock In</option>
                <option value="out">Stock Out</option>
                <option value="adjustment">Adjustments</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={filteredMovements.length > 0 && selectedMovements.size === filteredMovements.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Stock Type</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity/Weight</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length > 0 ? (
                  filteredMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedMovements.has(movement.id)}
                          onChange={(e) => handleSelectMovement(movement.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{new Date(movement.createdAt).toLocaleDateString()}</div>
                        <div className="text-muted-foreground text-xs">
                          {new Date(movement.createdAt).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{movement.productName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {movement.variantTitle || 'Base Product'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={movement.stockManagementType === 'weight' ? 'secondary' : 'outline'}>
                          {movement.stockManagementType === 'weight' ? 'Weight' : 'Quantity'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getMovementTypeVariant(movement.movementType)}>
                          {movement.movementType.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className={`font-semibold ${movement.movementType === 'in' ? 'text-green-600' :
                            movement.movementType === 'out' ? 'text-red-600' : 'text-blue-600'
                            }`}>
                            {movement.movementType === 'in' ? '+' : movement.movementType === 'out' ? '-' : '±'}
                            {movement.quantity}
                          </div>
                          {movement.weightQuantity && movement.stockManagementType === 'weight' && (
                            <div className={`text-sm ${movement.movementType === 'in' ? 'text-green-500' :
                              movement.movementType === 'out' ? 'text-red-500' : 'text-blue-500'
                              }`}>
                              {movement.movementType === 'in' ? '+' : movement.movementType === 'out' ? '-' : '±'}
                              {formatWeightDisplay(movement.weightQuantity)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{movement.reason}</TableCell>
                      <TableCell className="text-sm">{movement.location}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {movement.reference || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      <div className="text-muted-foreground">
                        {searchTerm || movementFilter !== 'all' || dateRange.startDate || dateRange.endDate
                          ? 'No stock movements match your filters'
                          : 'No stock movements recorded yet'
                        }
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}