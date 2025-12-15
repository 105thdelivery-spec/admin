import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, categories, subcategories, productVariants, productAddons, productTags, tags, variationAttributeValues, productCategories } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { generateSlug } from '@/utils/priceUtils';

export async function GET() {
  try {
    const allProducts = await db
      .select({
        product: products,
        category: {
          id: categories.id,
          name: categories.name
        },
        subcategory: {
          id: subcategories.id,
          name: subcategories.name
        }
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))
      .orderBy(desc(products.createdAt));

    return NextResponse.json(allProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      name,
      description,
      shortDescription,
      sku,
      price,
      comparePrice,
      costPrice,
      images,
      banner,
      videoUrl,
      categoryId,
      categoryIds,
      subcategoryId,
      tags,
      selectedTags, // New tag system
      weight,
      dimensions,
      isFeatured,
      isActive,
      isDigital,
      requiresShipping,
      taxable,
      outOfStock,
      metaTitle,
      metaDescription,
      productType,
      variants,
      addons,
      // Weight-based stock management fields
      stockManagementType,
      pricePerUnit,
      baseWeightUnit,
      // Cannabis-specific fields
      thc,
      cbd,
      difficulty,
      floweringTime,
      yieldAmount
    } = await req.json();
    const normalizedCategoryIds: string[] = Array.isArray(categoryIds)
      ? categoryIds.filter((id: any) => typeof id === 'string' && id.trim().length > 0)
      : (typeof categoryId === 'string' && categoryId.trim().length > 0 ? [categoryId] : []);


    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Price validation - required for quantity-based products (except group), weight-based products need pricePerUnit
    if (productType !== 'group') {
      if (stockManagementType === 'weight' && productType === 'simple') {
        // Only simple products with weight-based stock need pricePerUnit
        // Variable products set prices per variant
        if (pricePerUnit === undefined || pricePerUnit === null) {
          return NextResponse.json({ error: 'Price per unit is required for weight-based products' }, { status: 400 });
        }
      } else if (stockManagementType !== 'weight') {
        // Quantity-based products need a price (except variable products which set prices per variant)
        if (productType !== 'variable' && (price === undefined || price === null)) {
          return NextResponse.json({ error: 'Price is required for quantity-based products' }, { status: 400 });
        }
      }
    }

    // For group products with zero price, ensure they have addons
    if (productType === 'group' && (!price || price === 0) && (!addons || addons.length === 0)) {
      return NextResponse.json({ error: 'Group products with zero price must have at least one addon' }, { status: 400 });
    }

    // Generate slug from name (ensure SEO-friendly)
    let finalSlug = generateSlug(name);
    // Ensure slug uniqueness by appending a numeric suffix if needed
    if (finalSlug) {
      let suffix = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const existing = await db.query.products.findFirst({
          where: (p, { eq }) => eq(p.slug, finalSlug),
        });
        if (!existing) break;
        suffix += 1;
        finalSlug = `${generateSlug(name)}-${suffix}`;
      }
    }

    // For weight-based products, if price is not provided but pricePerUnit is, use pricePerUnit as price
    // This ensures the product has a displayable price
    const finalPrice = stockManagementType === 'weight'
      ? (price || pricePerUnit || 0)
      : (price || 0);

    const newProduct = {
      id: uuidv4(),
      name,
      slug: finalSlug,
      description: description || null,
      shortDescription: shortDescription || null,
      sku: sku || null,
      price: finalPrice.toString(),
      comparePrice: comparePrice ? comparePrice.toString() : null,
      costPrice: costPrice ? costPrice.toString() : null,
      images: images ? JSON.stringify(images) : null,
      banner: banner || null,
      videoUrl: videoUrl || null,
      // Keep categoryId for backwards compatibility (set to first selected category if available)
      categoryId: normalizedCategoryIds.length > 0 ? normalizedCategoryIds[0] : (categoryId || null),
      // Subcategories disabled for multi-category products; keep existing field nullable for compatibility
      subcategoryId: null,
      tags: tags ? JSON.stringify(tags) : null,
      weight: weight ? weight.toString() : null,
      dimensions: dimensions ? JSON.stringify(dimensions) : null,
      isFeatured: isFeatured || false,
      isActive: isActive !== undefined ? isActive : true,
      isDigital: isDigital || false,
      requiresShipping: requiresShipping !== undefined ? requiresShipping : true,
      taxable: taxable !== undefined ? taxable : true,
      outOfStock: outOfStock || false,
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      productType: productType || 'simple',
      // Note: variationAttributes column not used - variants are the source of truth
      // Weight-based stock management fields
      stockManagementType: stockManagementType || 'quantity',
      pricePerUnit: pricePerUnit ? pricePerUnit.toString() : null,
      baseWeightUnit: baseWeightUnit || 'grams',
      // Cannabis-specific fields
      thc: thc ? thc.toString() : null,
      cbd: cbd ? cbd.toString() : null,
      difficulty: difficulty || null,
      floweringTime: floweringTime || null,
      yieldAmount: yieldAmount || null,
    };

    // Start transaction for product and variants
    await db.insert(products).values(newProduct);

    // Create product category assignments (many-to-many)
    if (normalizedCategoryIds.length > 0) {
      await db.insert(productCategories).values(
        normalizedCategoryIds.map((cid) => ({
          productId: newProduct.id,
          categoryId: cid,
        }))
      );
    }

    // If it's a variable product, create variants
    if (productType === 'variable' && variants && variants.length > 0) {
      // Prepare variant data with numeric values
      const variantDataPromises = variants.map(async (variant: any) => {
        // Extract numeric value from variation attributes
        let numericValue = null;
        if (variant.attributes && Array.isArray(variant.attributes)) {
          for (const attr of variant.attributes) {
            const attributeValue = attr.value || attr.attributeValue;
            if (attributeValue) {
              // Look up the numeric_value from variation_attribute_values table
              const valueRecord = await db.query.variationAttributeValues.findFirst({
                where: eq(variationAttributeValues.value, attributeValue),
                columns: { numericValue: true }
              });
              if (valueRecord?.numericValue) {
                numericValue = parseFloat(valueRecord.numericValue.toString());
                console.log(`Found numeric value ${numericValue} for attribute value: ${attributeValue}`);
                break; // Use the first numeric value found
              }
            }
          }
        }

        return {
          id: uuidv4(),
          productId: newProduct.id,
          title: variant.title,
          sku: variant.sku || null,
          price: variant.price ? variant.price.toString() : newProduct.price,
          comparePrice: variant.comparePrice ? variant.comparePrice.toString() : null,
          costPrice: variant.costPrice ? variant.costPrice.toString() : null,
          weight: variant.weight ? variant.weight.toString() : null,
          image: variant.image || null,
          inventoryQuantity: variant.inventoryQuantity || 0,
          inventoryManagement: true,
          allowBackorder: false,
          isActive: variant.isActive !== undefined ? variant.isActive : true,
          outOfStock: variant.outOfStock || false,
          position: 0,
          variantOptions: variant.attributes ? JSON.stringify(variant.attributes) : null,
          numericValueOfVariationAttribute: numericValue ? numericValue.toString() : null,
        };
      });

      const variantData = await Promise.all(variantDataPromises);
      await db.insert(productVariants).values(variantData);
    }

    // Create product addons for any product type that has addons
    if (addons && addons.length > 0) {
      const addonData = addons.map((addon: any) => ({
        id: uuidv4(),
        productId: newProduct.id,
        addonId: addon.addonId,
        price: addon.price ? addon.price.toString() : '0',
        isRequired: addon.isRequired || false,
        sortOrder: addon.sortOrder || 0,
        isActive: addon.isActive !== undefined ? addon.isActive : true,
      }));

      await db.insert(productAddons).values(addonData);
    }

    // Handle product tags (new tag system)
    if (selectedTags && selectedTags.length > 0) {
      const tagAssignments = [];

      for (let i = 0; i < selectedTags.length; i++) {
        const selectedTag = selectedTags[i];
        let tagId = selectedTag.tagId;

        // If this is a custom tag (has customValue and temporary ID), create the tag first
        if (selectedTag.customValue && selectedTag.tagId.startsWith('custom_')) {
          // Check if a tag with this custom value already exists in the group
          const existingTag = await db.query.tags.findFirst({
            where: (tags, { and, eq }) => and(
              eq(tags.groupId, selectedTag.groupId),
              eq(tags.name, selectedTag.customValue)
            ),
          });

          if (existingTag) {
            tagId = existingTag.id;
          } else {
            // Create new custom tag
            const newTagId = nanoid();
            const slug = selectedTag.customValue.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');

            await db.insert(tags).values({
              id: newTagId,
              name: selectedTag.customValue,
              slug: slug,
              groupId: selectedTag.groupId,
              isCustom: true,
              customValue: selectedTag.customValue,
              isActive: true,
              sortOrder: 0,
            });

            tagId = newTagId;
          }
        }

        // Create product tag assignment
        tagAssignments.push({
          id: nanoid(),
          productId: newProduct.id,
          tagId: tagId,
          customValue: selectedTag.customValue || null,
          sortOrder: i,
        });
      }

      if (tagAssignments.length > 0) {
        await db.insert(productTags).values(tagAssignments);
      }
    }

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
} 