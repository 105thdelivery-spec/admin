'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, TicketIcon } from 'lucide-react';

function formatNumber(value: string): string {
  if (value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return value;
}


export default function AddCouponPage() {
  const router = useRouter();

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

      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create coupon');
      }

      router.push('/coupons');
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TicketIcon className="h-6 w-6" />
            Add Coupon
          </h1>
          <p className="text-muted-foreground">Create a new discount coupon</p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/coupons">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
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
            {submitting ? 'Creating…' : 'Create coupon'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/coupons')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
