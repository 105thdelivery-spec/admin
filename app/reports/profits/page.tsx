'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CurrencySymbol from '../../components/CurrencySymbol';
import DateFilter from '../../components/DateFilter';
import {
  calculateItemProfit,
  formatProfitDisplay,
  getProfitStatus,
  getProfitMarginTier,
  getDateRanges
} from '@/utils/profitUtils';
import { useCurrency } from '@/app/contexts/CurrencyContext';

interface ProfitReportData {
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalDriverPayments: number;
    totalCostWithDriver: number;
    totalProfit: number;
    averageMargin: number;
    profitableItems: number;
    lossItems: number;
    totalItems: number;
  };
  orders: Array<{
    id: string;
    orderNumber: string;
    email: string;
    status: string;
    orderType: string;
    createdAt: string;
    items: Array<{
      id: string;
      productName: string;
      variantTitle?: string;
      quantity: number;
      price: number;
      costPrice?: number;
      totalPrice: number;
      totalCost?: number;
      profit: {
        revenue: number;
        cost: number;
        driverPayment: number;
        totalCost: number;
        profit: number;
        margin: number;
        isProfit: boolean;
      };
    }>;
    orderSummary: {
      totalRevenue: number;
      totalCost: number;
      totalDriverPayments: number;
      totalCostWithDriver: number;
      totalProfit: number;
      averageMargin: number;
    };
  }>;
}

export default function ProfitsReport() {
  const { currentCurrency } = useCurrency();

  // Format date and time to "Aug 5, 2025 at 5:57 PM" format
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleDateString('en-US', options).replace(',', ' at');
  };
  const [data, setData] = useState<ProfitReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());


  const dateRanges = getDateRanges();

  useEffect(() => {
    fetchProfitData();
  }, []);

  useEffect(() => {
    fetchProfitData();
  }, [startDate, endDate]);



  const fetchProfitData = async () => {
    setLoading(true);
    setError('');

    try {
      const baseParams = new URLSearchParams();
      if (startDate) baseParams.append('startDate', startDate);
      if (endDate) baseParams.append('endDate', endDate);

      // Fetch all orders data
      const allResponse = await fetch(`/api/reports/profits?${baseParams.toString()}`);
      if (!allResponse.ok) {
        throw new Error('Failed to fetch profit data');
      }
      const allResult = await allResponse.json();
      setData(allResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('export', 'csv');

    window.open(`/api/reports/profits?${params.toString()}`, '_blank');
  };

  const handleExportPDF = async () => {
    if (!data) return;

    try {
      // Dynamic import to avoid build issues
      const { jsPDF } = await import('jspdf');

      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      const reportTitle = 'Profit & Loss Report';
      doc.text(reportTitle, 20, 20);

      // Date range
      if (startDate || endDate) {
        doc.setFontSize(12);
        const dateText = `Period: ${startDate || 'All time'} to ${endDate || 'Present'}`;
        doc.text(dateText, 20, 30);
      }

      // Summary
      doc.setFontSize(14);
      doc.text('Summary', 20, 45);
      doc.setFontSize(10);
      doc.text(`Total Revenue: $${data.summary.totalRevenue.toFixed(2)}`, 20, 55);
      doc.text(`Product Costs: $${data.summary.totalCost.toFixed(2)}`, 20, 62);
      doc.text(`Driver Payments: -$${data.summary.totalDriverPayments.toFixed(2)}`, 20, 69);
      doc.text(`Total Costs: $${data.summary.totalCostWithDriver.toFixed(2)}`, 20, 76);
      doc.text(`Total Profit: $${data.summary.totalProfit.toFixed(2)}`, 20, 83);
      doc.text(`Average Margin: ${data.summary.averageMargin.toFixed(1)}%`, 20, 90);
      doc.text(`Profitable Items: ${data.summary.profitableItems}`, 20, 97);
      doc.text(`Loss Items: ${data.summary.lossItems}`, 20, 104);

      // Orders data (simplified without table plugin)
      let yPosition = 115;
      doc.setFontSize(12);
      doc.text('Orders:', 20, yPosition);
      yPosition += 10;

      data.orders.slice(0, 10).forEach((order, index) => {
        doc.setFontSize(8);
        const orderText = `${order.orderNumber} | ${new Date(order.createdAt).toLocaleDateString()} | $${order.orderSummary.totalRevenue.toFixed(2)} | $${order.orderSummary.totalProfit.toFixed(2)}`;
        doc.text(orderText, 20, yPosition);
        yPosition += 5;

        if (yPosition > 270) { // Prevent overflow
          return;
        }
      });

      doc.save(`profit-loss-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const setPresetDateRange = (preset: keyof typeof dateRanges) => {
    const range = dateRanges[preset];
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  if (loading) return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading profit data...</p>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
            </svg>
            <h1 className="text-3xl font-bold text-gray-800">Profit & Loss Report</h1>
          </div>
          <p className="text-gray-600 mt-1">Analyze profitability and margins across orders</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!data}
          >
            📊 Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!data}
          >
            📄 Export PDF
          </button>
          <Link
            href="/reports"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Reports
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 Filters</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

        </div>

        {/* Preset Date Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(dateRanges).map(([key, range]) => (
            <button
              key={key}
              onClick={() => setPresetDateRange(key as keyof typeof dateRanges)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            >
              {range.label}
            </button>
          ))}
          <button
            onClick={clearFilters}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
          >
            Clear All
          </button>
        </div>

        {/* Active Filters Display */}
        {(startDate || endDate) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Active Filters:</span>
              {startDate && ` From ${new Date(startDate).toLocaleDateString()}`}
              {endDate && ` To ${new Date(endDate).toLocaleDateString()}`}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            Error: {error}
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">
                    <CurrencySymbol />{data.summary.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="text-3xl">💰</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Product Costs</p>
                  <p className="text-2xl font-bold text-orange-600">
                    <CurrencySymbol />{data.summary.totalCost.toFixed(2)}
                  </p>
                </div>
                <div className="text-3xl">📦</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Driver Payments</p>
                  <p className="text-2xl font-bold text-red-600">
                    -<CurrencySymbol />{data.summary.totalDriverPayments.toFixed(2)}
                  </p>
                </div>
                <div className="text-3xl">🚚</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Profit</p>
                  <p className={`text-2xl font-bold ${data.summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <CurrencySymbol />{data.summary.totalProfit.toFixed(2)}
                  </p>
                </div>
                <div className="text-3xl">
                  {data.summary.totalProfit >= 0 ? '📈' : '📉'}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Margin</p>
                  <p className={`text-2xl font-bold ${data.summary.averageMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.summary.averageMargin.toFixed(2)}%
                  </p>
                </div>
                <div className="text-3xl">📊</div>
              </div>
            </div>
          </div>

          {/* Profit Overview */}
          <div className="bg-white rounded-xl shadow-lg border p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Profit Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{data.summary.profitableItems}</div>
                <div className="text-sm text-green-700">Profitable Items</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{data.summary.lossItems}</div>
                <div className="text-sm text-red-700">Loss Items</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{data.summary.totalItems}</div>
                <div className="text-sm text-blue-700">Total Items</div>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="bg-white rounded-xl shadow-lg border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-800">📋 Orders with Profit Analysis</h3>
              <p className="text-sm text-gray-600 mt-1">
                Showing {data.orders.length} orders with profit breakdown
              </p>
            </div>

            <div className="overflow-x-auto">
              {data.orders.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {data.orders.map((order) => {
                    const isExpanded = expandedOrders.has(order.id);
                    const profitStatus = getProfitStatus(order.orderSummary.totalProfit);
                    const marginTier = getProfitMarginTier(order.orderSummary.averageMargin);

                    return (
                      <div key={order.id} className="p-6">
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg p-2"
                          onClick={() => toggleOrderExpansion(order.id)}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="text-lg">
                              {isExpanded ? '📂' : '📁'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-gray-900">{order.orderNumber}</div>
                                <span className={`px-2 py-1 text-xs rounded-full ${order.orderType === 'pickup'
                                  ? 'bg-purple-100 text-purple-700'
                                  : order.orderType === 'delivery'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                                  }`}>
                                  {order.orderType === 'pickup' ? '🏪 Pickup' :
                                    order.orderType === 'delivery' ? '🚚 Delivery' :
                                      '📦 Shipping'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatDateTime(order.createdAt)} • {order.email}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            {order.orderType === 'delivery' && order.orderSummary.totalDriverPayments > 0 && (
                              <div className="text-right">
                                <div className="text-sm text-gray-600">Driver Cost</div>
                                <div className="font-medium text-red-600">
                                  -<CurrencySymbol />{order.orderSummary.totalDriverPayments.toFixed(2)}
                                </div>
                              </div>
                            )}
                            <div className="text-right">
                              <div className="text-sm text-gray-600">Profit</div>
                              <div className={`font-medium ${profitStatus.color.split(' ')[0]}`}>
                                <CurrencySymbol />{order.orderSummary.totalProfit.toFixed(2)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-600">Margin</div>
                              <div className={`px-2 py-1 rounded-full text-xs ${marginTier.color}`}>
                                {order.orderSummary.averageMargin.toFixed(2)}%
                              </div>
                            </div>
                            <div className="text-2xl">{profitStatus.icon}</div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 ml-8">
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product Cost</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Driver Payment</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {order.items.map((item) => {
                                    const itemProfitStatus = getProfitStatus(item.profit.profit);
                                    return (
                                      <tr key={item.id}>
                                        <td className="px-4 py-2">
                                          <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                                          {item.variantTitle && (
                                            <div className="text-xs text-gray-500">{item.variantTitle}</div>
                                          )}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                          <CurrencySymbol />{item.profit.revenue.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                          <CurrencySymbol />{item.profit.cost.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-red-600">
                                          {item.profit.driverPayment > 0 ? '-' : ''}<CurrencySymbol />{item.profit.driverPayment.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                          <CurrencySymbol />{item.profit.totalCost.toFixed(2)}
                                        </td>
                                        <td className={`px-4 py-2 text-sm font-medium ${itemProfitStatus.color.split(' ')[0]}`}>
                                          {itemProfitStatus.icon} <CurrencySymbol />{item.profit.profit.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                          {item.profit.margin.toFixed(2)}%
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No orders found for the selected filters.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}