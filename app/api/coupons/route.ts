import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  coupons,
  couponIncludedProducts,
  couponExcludedProducts,
  couponIncludedCategories,
  couponExcludedCategories,
  couponRedemptions,
} from '@/lib/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

function normalizeCouponCode(code: unknown): string {
  return String(code ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
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

async function syncCouponJunctions(
  tx: typeof db,
  couponId: string,
  junctions: {
    includedProductIds: string[];
    excludedProductIds: string[];
    includedCategoryIds: string[];
    excludedCategoryIds: string[];
  }
) {
  await tx.delete(couponIncludedProducts).where(eq(couponIncludedProducts.couponId, couponId));
  await tx.delete(couponExcludedProducts).where(eq(couponExcludedProducts.couponId, couponId));
  await tx.delete(couponIncludedCategories).where(eq(couponIncludedCategories.couponId, couponId));
  await tx.delete(couponExcludedCategories).where(eq(couponExcludedCategories.couponId, couponId));

  if (junctions.includedProductIds.length > 0) {
    await tx.insert(couponIncludedProducts).values(
      junctions.includedProductIds.map((productId) => ({
        id: uuidv4(),
        couponId,
        productId,
      }))
    );
  }

  if (junctions.excludedProductIds.length > 0) {
    await tx.insert(couponExcludedProducts).values(
      junctions.excludedProductIds.map((productId) => ({
        id: uuidv4(),
        couponId,
        productId,
      }))
    );
  }

  if (junctions.includedCategoryIds.length > 0) {
    await tx.insert(couponIncludedCategories).values(
      junctions.includedCategoryIds.map((categoryId) => ({
        id: uuidv4(),
        couponId,
        categoryId,
      }))
    );
  }

  if (junctions.excludedCategoryIds.length > 0) {
    await tx.insert(couponExcludedCategories).values(
      junctions.excludedCategoryIds.map((categoryId) => ({
        id: uuidv4(),
        couponId,
        categoryId,
      }))
    );
  }
}

export async function GET() {
  try {
    const rows = await db
      .select({
        coupon: coupons,
        redeemedCount: sql<number>`(
          select count(*) from ${couponRedemptions} cr where cr.coupon_id = ${coupons.id}
        )`.as('redeemedCount'),
      })
      .from(coupons)
      .orderBy(desc(coupons.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const code = normalizeCouponCode(body.code);
    const discountType = String(body.discountType || body.discount_type || '').trim();
    const discountValueRaw = Number(body.discountValue ?? body.discount_value);

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }
    if (discountType !== 'percent' && discountType !== 'fixed') {
      return NextResponse.json({ error: "discountType must be 'percent' or 'fixed'" }, { status: 400 });
    }
    if (!Number.isFinite(discountValueRaw) || discountValueRaw <= 0) {
      return NextResponse.json({ error: 'discountValue must be a positive number' }, { status: 400 });
    }
    if (discountType === 'percent' && (discountValueRaw <= 0 || discountValueRaw > 100)) {
      return NextResponse.json({ error: 'Percent discount must be between 0 and 100' }, { status: 400 });
    }

    const existing = await db.query.coupons.findFirst({
      where: eq(coupons.code, code),
      columns: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
    }

    const couponId = uuidv4();

    const includedProductIds = uniqStrings(body.includedProductIds ?? body.included_product_ids);
    const excludedProductIds = uniqStrings(body.excludedProductIds ?? body.excluded_product_ids);
    const includedCategoryIds = uniqStrings(body.includedCategoryIds ?? body.included_category_ids);
    const excludedCategoryIds = uniqStrings(body.excludedCategoryIds ?? body.excluded_category_ids);

    await db.transaction(async (tx) => {
      await tx.insert(coupons).values({
        id: couponId,
        code,
        name: body.name ?? null,
        description: body.description ?? null,
        discountType,
        discountValue: discountValueRaw.toString(),
        maxDiscountAmount: parseOptionalNumber(body.maxDiscountAmount ?? body.max_discount_amount),
        minSubtotal: parseOptionalNumber(body.minSubtotal ?? body.min_subtotal),
        startAt: parseOptionalDate(body.startAt ?? body.start_at),
        endAt: parseOptionalDate(body.endAt ?? body.end_at),
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        usageLimitTotal: parseOptionalInt(body.usageLimitTotal ?? body.usage_limit_total),
        usageLimitPerUser: parseOptionalInt(body.usageLimitPerUser ?? body.usage_limit_per_user),
        firstOrderOnly: Boolean(body.firstOrderOnly ?? body.first_order_only),
        updatedAt: new Date(),
      });

      await syncCouponJunctions(tx as any, couponId, {
        includedProductIds,
        excludedProductIds,
        includedCategoryIds,
        excludedCategoryIds,
      });
    });

    return NextResponse.json({ id: couponId }, { status: 201 });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}
