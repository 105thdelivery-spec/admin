'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ResponsiveTable from '../components/ResponsiveTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  PlusIcon,
  MoreVerticalIcon,
  EditIcon,
  RefreshCwIcon,
  TicketIcon,
  PowerIcon,
  PowerOffIcon,
} from 'lucide-react';
import CurrencySymbol from '../components/CurrencySymbol';

type Coupon = {
  id: string;
  code: string;
  name?: string | null;
  description?: string | null;
  discountType: 'percent' | 'fixed' | string;
  discountValue: string;
  maxDiscountAmount?: string | null;
  minSubtotal?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  isActive: boolean;
  usageLimitTotal?: number | null;
  usageLimitPerUser?: number | null;
  firstOrderOnly: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type CouponRow = {
  coupon: Coupon;
  redeemedCount: number;
};

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function getStatus(coupon: Coupon): 'Active' | 'Upcoming' | 'Expired' | 'Inactive' {
  if (!coupon.isActive) return 'Inactive';
  const now = new Date();
  const start = parseDate(coupon.startAt);
  const end = parseDate(coupon.endAt);
  if (start && now < start) return 'Upcoming';
  if (end && now > end) return 'Expired';
  return 'Active';
}

export default function CouponsPage() {
  const [rows, setRows] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coupons');
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => getStatus(r.coupon) === 'Active').length;
    const upcoming = rows.filter((r) => getStatus(r.coupon) === 'Upcoming').length;
    const expired = rows.filter((r) => getStatus(r.coupon) === 'Expired').length;
    return { total, active, upcoming, expired };
  }, [rows]);

  const toggleActive = async (id: string, nextActive: boolean) => {
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update coupon');
      }
      await fetchCoupons();
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    }
  };

  const disableCoupon = async (id: string) => {
    if (!confirm('Disable this coupon? (This does not delete it)')) return;
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to disable coupon');
      }
      await fetchCoupons();
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    }
  };

  const columns = [
    {
      key: 'code',
      title: 'Code',
      render: (_: any, row: CouponRow) => (
        <div>
          <div className="font-medium">{row.coupon.code}</div>
          {row.coupon.name ? (
            <div className="text-sm text-muted-foreground">{row.coupon.name}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Discount',
      render: (_: any, row: CouponRow) => {
        const c = row.coupon;
        const value = Number(c.discountValue || 0);
        if (c.discountType === 'percent') {
          return (
            <div className="text-sm">
              <div className="font-medium">{value}%</div>
              {c.maxDiscountAmount ? (
                <div className="text-muted-foreground">
                  Max: <CurrencySymbol />{Number(c.maxDiscountAmount).toFixed(2)}
                </div>
              ) : null}
            </div>
          );
        }
        return (
          <div className="text-sm font-medium">
            <CurrencySymbol />{value.toFixed(2)}
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      render: (_: any, row: CouponRow) => {
        const status = getStatus(row.coupon);
        const variant = status === 'Active' ? 'default' : status === 'Inactive' ? 'secondary' : 'outline';
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      key: 'usage',
      title: 'Usage',
      mobileHidden: true,
      render: (_: any, row: CouponRow) => {
        const c = row.coupon;
        const limit = c.usageLimitTotal ?? null;
        return (
          <div className="text-sm">
            <div className="font-medium">{row.redeemedCount}</div>
            <div className="text-muted-foreground">
              {limit ? `of ${limit}` : 'no limit'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'dates',
      title: 'Dates',
      mobileHidden: true,
      render: (_: any, row: CouponRow) => {
        const start = parseDate(row.coupon.startAt);
        const end = parseDate(row.coupon.endAt);
        return (
          <div className="text-sm">
            <div>{start ? start.toLocaleString() : '—'}</div>
            <div className="text-muted-foreground">{end ? end.toLocaleString() : '—'}</div>
          </div>
        );
      },
    },
  ];

  const renderActions = (row: CouponRow) => {
    const c = row.coupon;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVerticalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/coupons/edit/${c.id}`} className="flex items-center">
              <EditIcon className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </DropdownMenuItem>
          {c.isActive ? (
            <DropdownMenuItem onClick={() => toggleActive(c.id, false)} className="flex items-center">
              <PowerOffIcon className="h-4 w-4 mr-2" />
              Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => toggleActive(c.id, true)} className="flex items-center">
              <PowerIcon className="h-4 w-4 mr-2" />
              Activate
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => disableCoupon(c.id)}
            className="text-red-600 focus:text-red-600"
          >
            <PowerOffIcon className="h-4 w-4 mr-2" />
            Disable (soft)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
          <p className="text-muted-foreground">Create and manage discount coupons</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchCoupons} disabled={loading} variant="outline" size="sm">
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/coupons/add">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Coupon
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <TicketIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      <ResponsiveTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage="No coupons found"
        actions={renderActions}
      />
    </div>
  );
}
