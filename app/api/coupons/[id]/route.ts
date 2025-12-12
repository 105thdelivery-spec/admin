import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  coupons,
  couponIncludedProducts,
  couponExcludedProducts,
  couponIncludedCategories,
  couponExcludedCategories,
} from '@/lib/schema';
import { and, eq, ne } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

function normalizeCouponCode(code: unknown): string {
  return String(code ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

function uniqStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const s = String(v);
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function parseOptionalNumber(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n.toString();
}

function parseOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function parseOptionalDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function syncJunctionsIfProvided(tx: typeof db, couponId: string, body: any) {
  const includedProductIds = body.includedProductIds !== undefined || body.included_product_ids !== undefined
    ? uniqStrings(body.includedProductIds ?? body.included_product_ids)
    : null;
  const excludedProductIds = body.excludedProductIds !== undefined || body.excluded_product_ids !== undefined
    ? uniqStrings(body.excludedProductIds ?? body.excluded_product_ids)
    : null;
  const includedCategoryIds = body.includedCategoryIds !== undefined || body.included_category_ids !== undefined
    ? uniqStrings(body.includedCategoryIds ?? body.included_category_ids)
    : null;
  const excludedCategoryIds = body.excludedCategoryIds !== undefined || body.excluded_category_ids !== undefined
    ? uniqStrings(body.excludedCategoryIds ?? body.excluded_category_ids)
    : null;

  // Only touch a junction table if it was provided in the payload.
  if (includedProductIds !== null) {
    await tx.delete(couponIncludedProducts).where(eq(couponIncludedProducts.couponId, couponId));
    if (includedProductIds.length > 0) {
      await tx.insert(couponIncludedProducts).values(
        includedProductIds.map((productId) => ({ id: uuidv4(), couponId, productId }))
      );
    }
  }

  if (excludedProductIds !== null) {
    await tx.delete(couponExcludedProducts).where(eq(couponExcludedProducts.couponId, couponId));
    if (excludedProductIds.length > 0) {
      await tx.insert(couponExcludedProducts).values(
        excludedProductIds.map((productId) => ({ id: uuidv4(), couponId, productId }))
      );
    }
  }

  if (includedCategoryIds !== null) {
    await tx.delete(couponIncludedCategories).where(eq(couponIncludedCategories.couponId, couponId));
    if (includedCategoryIds.length > 0) {
      await tx.insert(couponIncludedCategories).values(
        includedCategoryIds.map((categoryId) => ({ id: uuidv4(), couponId, categoryId }))
      );
    }
  }

  if (excludedCategoryIds !== null) {
    await tx.delete(couponExcludedCategories).where(eq(couponExcludedCategories.couponId, couponId));
    if (excludedCategoryIds.length > 0) {
      await tx.insert(couponExcludedCategories).values(
        excludedCategoryIds.map((categoryId) => ({ id: uuidv4(), couponId, categoryId }))
      );
    }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.id, id),
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const [includedProducts, excludedProducts, includedCategories, excludedCategories] = await Promise.all([
      db.select({ productId: couponIncludedProducts.productId }).from(couponIncludedProducts).where(eq(couponIncludedProducts.couponId, id)),
      db.select({ productId: couponExcludedProducts.productId }).from(couponExcludedProducts).where(eq(couponExcludedProducts.couponId, id)),
      db.select({ categoryId: couponIncludedCategories.categoryId }).from(couponIncludedCategories).where(eq(couponIncludedCategories.couponId, id)),
      db.select({ categoryId: couponExcludedCategories.categoryId }).from(couponExcludedCategories).where(eq(couponExcludedCategories.couponId, id)),
    ]);

    return NextResponse.json({
      coupon,
      includedProductIds: includedProducts.map((r) => r.productId),
      excludedProductIds: excludedProducts.map((r) => r.productId),
      includedCategoryIds: includedCategories.map((r) => r.categoryId),
      excludedCategoryIds: excludedCategories.map((r) => r.categoryId),
    });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    return NextResponse.json({ error: 'Failed to fetch coupon' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.query.coupons.findFirst({
      where: eq(coupons.id, id),
      columns: { id: true, discountType: true, discountValue: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    // Build partial update.
    const patch: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.code !== undefined) {
      const code = normalizeCouponCode(body.code);
      if (!code) {
        return NextResponse.json({ error: 'Code cannot be empty' }, { status: 400 });
      }
      const codeConflict = await db.query.coupons.findFirst({
        where: and(eq(coupons.code, code), ne(coupons.id, id)),
        columns: { id: true },
      });
      if (codeConflict) {
        return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
      }
      patch.code = code;
    }

    if (body.name !== undefined) patch.name = body.name ?? null;
    if (body.description !== undefined) patch.description = body.description ?? null;

    if (body.discountType !== undefined) {
      const discountType = String(body.discountType).trim();
      if (discountType !== 'percent' && discountType !== 'fixed') {
        return NextResponse.json({ error: "discountType must be 'percent' or 'fixed'" }, { status: 400 });
      }
      patch.discountType = discountType;
    }

    if (body.discountValue !== undefined) {
      const n = Number(body.discountValue);
      if (!Number.isFinite(n) || n <= 0) {
        return NextResponse.json({ error: 'discountValue must be a positive number' }, { status: 400 });
      }
      const effectiveType = String(patch.discountType ?? existing.discountType);
      if (effectiveType === 'percent' && n > 100) {
        return NextResponse.json({ error: 'Percent discount must be between 0 and 100' }, { status: 400 });
      }
      patch.discountValue = n.toString();
    }
    if (patch.discountType === 'percent' && body.discountValue === undefined) {
      const currentValue = Number(existing.discountValue);
      if (Number.isFinite(currentValue) && currentValue > 100) {
        return NextResponse.json({ error: 'Percent discount must be between 0 and 100' }, { status: 400 });
      }
    }

    if (body.maxDiscountAmount !== undefined) patch.maxDiscountAmount = parseOptionalNumber(body.maxDiscountAmount);
    if (body.minSubtotal !== undefined) patch.minSubtotal = parseOptionalNumber(body.minSubtotal);
    if (body.startAt !== undefined) patch.startAt = parseOptionalDate(body.startAt);
    if (body.endAt !== undefined) patch.endAt = parseOptionalDate(body.endAt);
    if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive);
    if (body.usageLimitTotal !== undefined) patch.usageLimitTotal = parseOptionalInt(body.usageLimitTotal);
    if (body.usageLimitPerUser !== undefined) patch.usageLimitPerUser = parseOptionalInt(body.usageLimitPerUser);
    if (body.firstOrderOnly !== undefined) patch.firstOrderOnly = Boolean(body.firstOrderOnly);

    await db.transaction(async (tx) => {
      await tx.update(coupons).set(patch).where(eq(coupons.id, id));
      await syncJunctionsIfProvided(tx as any, id, body);
    });

    const updated = await db.query.coupons.findFirst({ where: eq(coupons.id, id) });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating coupon:', error);
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.query.coupons.findFirst({
      where: eq(coupons.id, id),
      columns: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    await db.update(coupons).set({ isActive: false, updatedAt: new Date() }).where(eq(coupons.id, id));

    return NextResponse.json({ message: 'Coupon disabled successfully' });
  } catch (error) {
    console.error('Error disabling coupon:', error);
    return NextResponse.json({ error: 'Failed to disable coupon' }, { status: 500 });
  }
}
