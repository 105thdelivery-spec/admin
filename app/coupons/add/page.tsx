'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, TicketIcon } from 'lucide-react';

type IdName = { id: string; name: string };

function uniqStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function formatNumber(value: string): string {
  if (value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return value;
}

function IdPicker({
  title,
  items,
  selectedIds,
  onChange,
}: {
  title: string;
  items: IdName[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((i) => i.name.toLowerCase().includes(qq) || i.id.toLowerCase().includes(qq));
  }, [items, q]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange(uniqStrings([...selectedIds, id]));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="secondary">{selectedIds.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." />
        <div className="max-h-64 overflow-auto border rounded p-2 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">No matches</div>
          ) : (
            filtered.slice(0, 200).map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span className="truncate">{item.name}</span>
              </label>
            ))
          )}
          {filtered.length > 200 ? (
            <div className="text-xs text-muted-foreground">Showing first 200 results. Refine search.</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AddCouponPage() {
  const router = useRouter();

  const [products, setProducts] = useState<IdName[]>([]);
  const [categories, setCategories] = useState<IdName[]>([]);
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
    const fetchPicklists = async () => {
      setLoading(true);
      try {
        const [prodRes, catRes] = await Promise.all([fetch('/api/products'), fetch('/api/categories')]);
        const prodData = await prodRes.json();
        const catData = await catRes.json();

        const prodItems: IdName[] = Array.isArray(prodData)
          ? prodData
              .map((p: any) => ({ id: p?.product?.id, name: p?.product?.name }))
              .filter((x: any) => x.id && x.name)
          : [];

        const catItems: IdName[] = Array.isArray(catData)
          ? catData.map((c: any) => ({ id: c?.id, name: c?.name })).filter((x: any) => x.id && x.name)
          : [];

        setProducts(prodItems);
        setCategories(catItems);
      } catch (e) {
        console.error(e);
        setError('Failed to load products/categories');
      } finally {
        setLoading(false);
      }
    };

    fetchPicklists();
  }, []);

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

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

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

            <Separator />

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
              <div className="space-y-2">
                <label className="text-sm font-medium">Max discount (percent only)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.maxDiscountAmount}
                  onChange={(e) => setForm((p) => ({ ...p, maxDiscountAmount: formatNumber(e.target.value) }))}
                  disabled={form.discountType !== 'percent'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Min subtotal</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.minSubtotal}
                  onChange={(e) => setForm((p) => ({ ...p, minSubtotal: formatNumber(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Start at</label>
                <Input type="datetime-local" value={form.startAt} onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End at</label>
                <Input type="datetime-local" value={form.endAt} onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Usage limit (total)</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={form.usageLimitTotal}
                  onChange={(e) => setForm((p) => ({ ...p, usageLimitTotal: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Usage limit (per user)</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={form.usageLimitPerUser}
                  onChange={(e) => setForm((p) => ({ ...p, usageLimitPerUser: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Options</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.firstOrderOnly}
                      onChange={(e) => setForm((p) => ({ ...p, firstOrderOnly: e.target.checked }))}
                    />
                    First order only
                  </label>
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Applicability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <IdPicker
                title="Include products"
                items={products}
                selectedIds={form.includedProductIds}
                onChange={(next) => setForm((p) => ({ ...p, includedProductIds: next }))}
              />
              <IdPicker
                title="Exclude products"
                items={products}
                selectedIds={form.excludedProductIds}
                onChange={(next) => setForm((p) => ({ ...p, excludedProductIds: next }))}
              />
              <IdPicker
                title="Include categories"
                items={categories}
                selectedIds={form.includedCategoryIds}
                onChange={(next) => setForm((p) => ({ ...p, includedCategoryIds: next }))}
              />
              <IdPicker
                title="Exclude categories"
                items={categories}
                selectedIds={form.excludedCategoryIds}
                onChange={(next) => setForm((p) => ({ ...p, excludedCategoryIds: next }))}
              />
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
