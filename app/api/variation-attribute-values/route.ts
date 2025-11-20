import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { variationAttributeValues, variationAttributes } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const attributeId = searchParams.get('attributeId');
    
    // Build base query
    const baseQuery = db
      .select({
        value: variationAttributeValues,
        attribute: {
          id: variationAttributes.id,
          name: variationAttributes.name,
          type: variationAttributes.type
        }
      })
      .from(variationAttributeValues)
      .leftJoin(variationAttributes, eq(variationAttributeValues.attributeId, variationAttributes.id))
      .orderBy(variationAttributeValues.sortOrder);

    // Apply filters
    const allValues = attributeId 
      ? await baseQuery.where(eq(variationAttributeValues.attributeId, attributeId))
      : await baseQuery.where(eq(variationAttributeValues.isActive, true));
    
    return NextResponse.json(allValues);
  } catch (error) {
    console.error('Error fetching variation attribute values:', error);
    return NextResponse.json({ error: 'Failed to fetch variation attribute values' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received POST request body:', body);
    
    const { 
      attributeId, 
      value, 
      slug, 
      numericValue,
      colorCode, 
      image, 
      description, 
      sortOrder, 
      isActive 
    } = body;
    
    // Validate required fields
    if (!attributeId || !value) {
      console.error('Validation failed: missing attributeId or value');
      return NextResponse.json({ error: 'AttributeId and value are required' }, { status: 400 });
    }

    // Check if attribute exists
    console.log('Checking if attribute exists:', attributeId);
    const attribute = await db.query.variationAttributes.findFirst({
      where: eq(variationAttributes.id, attributeId),
    });

    if (!attribute) {
      console.error('Attribute not found:', attributeId);
      return NextResponse.json({ error: 'Variation attribute not found' }, { status: 404 });
    }
    
    console.log('Attribute found:', attribute.name);
    
    const newValue = {
      id: uuidv4(),
      attributeId,
      value,
      slug: slug || value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      numericValue: numericValue && numericValue !== '' ? parseFloat(numericValue.toString()).toString() : null,
      colorCode: colorCode || null,
      image: image || null,
      description: description || null,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    };
    
    console.log('Creating variation attribute value:', newValue);
    
    const result = await db.insert(variationAttributeValues).values(newValue);
    console.log('Insert result:', result);
    
    return NextResponse.json(newValue, { status: 201 });
  } catch (error: any) {
    console.error('Error creating variation attribute value:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
    
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Value slug already exists for this attribute' }, { status: 409 });
    }
    
    // Return more detailed error message
    return NextResponse.json({ 
      error: 'Failed to create variation attribute value',
      details: error.message,
      sqlError: error.sqlMessage 
    }, { status: 500 });
  }
} 