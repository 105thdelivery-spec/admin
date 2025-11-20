import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const weightLabelSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'weight_label'))
      .limit(1);

    return NextResponse.json({
      success: true,
      weightLabel: weightLabelSetting.length > 0 ? weightLabelSetting[0].value : 'g' // Default to grams
    });
  } catch (error) {
    console.error('Error fetching weight label setting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch weight label setting' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { weightLabel } = await req.json();

    if (!weightLabel) {
      return NextResponse.json(
        { success: false, error: 'Weight label is required' },
        { status: 400 }
      );
    }

    // Validate weight label
    const validWeightLabels = ['lb', 'oz', 'kg', 'g'];
    if (!validWeightLabels.includes(weightLabel)) {
      return NextResponse.json(
        { success: false, error: 'Invalid weight label. Must be one of: lb, oz, kg, g' },
        { status: 400 }
      );
    }

    // Check if the setting exists
    const existingSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'weight_label'))
      .limit(1);

    if (existingSetting.length > 0) {
      // Update existing setting
      await db
        .update(settings)
        .set({
          value: weightLabel,
          updatedAt: new Date()
        })
        .where(eq(settings.key, 'weight_label'));
    } else {
      // Create new setting
      await db.insert(settings).values({
        id: `weight_label_${Date.now()}`,
        key: 'weight_label',
        value: weightLabel,
        type: 'string',
        description: 'The unit label for weight display (lb, oz, kg, g)',
        isActive: true
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Weight label setting updated successfully'
    });
  } catch (error) {
    console.error('Error updating weight label setting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update weight label setting' },
      { status: 500 }
    );
  }
}

