'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, TicketIcon, PowerOffIcon } from 'lucide-react';

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
};

function formatNumber(value: string): string {
  if (value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return value;
}

function toDateTimeLocal(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditCouponPage() {
  const router = useRouter();
  const params = useParams();
  const couponId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: '',
    maxDiscountAmount: '',
    minSubtotal: '',
    startAt: '',
    endAt: '',
    usageLimitTotal: '',
    usageLimitPerUser: '',
    firstOrderOnly: false,
    isActive: true,
    includedProductIds: [] as string[],
    excludedProductIds: [] as string[],
    includedCategoryIds: [] as string[],
    excludedCategoryIds: [] as string[],
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [couponRes] = await Promise.all([
          fetch(`/api/coupons/${couponId}`),
        ]);

        if (!couponRes.ok) {
          const data = await couponRes.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load coupon');
        }

        const couponData = await couponRes.json();
        const c: Coupon = couponData.coupon;

        setForm({
          code: c.code || '',
          name: c.name || '',
          description: c.description || '',
          discountType: (c.discountType === 'fixed' ? 'fixed' : 'percent') as 'percent' | 'fixed',
          discountValue: c.discountValue ? String(c.discountValue) : '',
          maxDiscountAmount: c.maxDiscountAmount ? String(c.maxDiscountAmount) : '',
          minSubtotal: c.minSubtotal ? String(c.minSubtotal) : '',
          startAt: toDateTimeLocal(c.startAt),
          endAt: toDateTimeLocal(c.endAt),
          usageLimitTotal: c.usageLimitTotal !== null && c.usageLimitTotal !== undefined ? String(c.usageLimitTotal) : '',
          usageLimitPerUser: c.usageLimitPerUser !== null && c.usageLimitPerUser !== undefined ? String(c.usageLimitPerUser) : '',
          firstOrderOnly: Boolean(c.firstOrderOnly),
          isActive: Boolean(c.isActive),
          includedProductIds: Array.isArray(couponData.includedProductIds) ? couponData.includedProductIds : [],
          excludedProductIds: Array.isArray(couponData.excludedProductIds) ? couponData.excludedProductIds : [],
          includedCategoryIds: Array.isArray(couponData.includedCategoryIds) ? couponData.includedCategoryIds : [],
          excludedCategoryIds: Array.isArray(couponData.excludedCategoryIds) ? couponData.excludedCategoryIds : [],
        });
      } catch (e) {
        console.error(e);
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    if (couponId) load();
  }, [couponId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        code: form.code,
        name: form.name || null,
        description: form.description || null,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxDiscountAmount: form.discountType === 'percent' ? (form.maxDiscountAmount || null) : null,
        minSubtotal: form.minSubtotal || null,
        startAt: form.startAt || null,
        endAt: form.endAt || null,
        usageLimitTotal: form.usageLimitTotal || null,
        usageLimitPerUser: form.usageLimitPerUser || null,
        firstOrderOnly: form.firstOrderOnly,
        isActive: form.isActive,
        includedProductIds: form.includedProductIds,
        excludedProductIds: form.excludedProductIds,
        includedCategoryIds: form.includedCategoryIds,
        excludedCategoryIds: form.excludedCategoryIds,
      };

      const res = await fetch(`/api/coupons/${couponId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update coupon');
      }

      router.push('/coupons');
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const disableCoupon = async () => {
    if (!confirm('Disable this coupon? (This does not delete it)')) return;
    try {
      const res = await fetch(`/api/coupons/${couponId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to disable coupon');
      }
      router.push('/coupons');
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TicketIcon className="h-6 w-6" />
            Edit Coupon
          </h1>
          <p className="text-muted-foreground">Update coupon settings and applicability</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={disableCoupon}>
            <PowerOffIcon className="mr-2 h-4 w-4" />
            Disable
          </Button>
          <Button asChild variant="ghost">
            <Link href="/coupons">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-sm text-destructive">{error}</div>
          </CardContent>
        </Card>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Code *</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="SAVE10"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Internal name</label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.discountType}
                  onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value as 'percent' | 'fixed' }))}
                >
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Value *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.discountValue}
                  onChange={(e) => setForm((p) => ({ ...p, discountValue: formatNumber(e.target.value) }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Option</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  />
                  Active
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting} className="flex-1">
            <Save className="mr-2 h-4 w-4" />
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/coupons')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
