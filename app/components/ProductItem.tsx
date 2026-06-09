import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Image, Money } from '@shopify/hydrogen';
import type {
  ProductItemFragment,
  CollectionItemFragment,
  RecommendedProductFragment,
} from 'storefrontapi.generated';
import { useVariantUrl } from '~/lib/variants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnyProduct =
  | CollectionItemFragment
  | ProductItemFragment
  | RecommendedProductFragment;

interface ProductItemProps {
  product: AnyProduct;
  loading?: 'eager' | 'lazy';
}

/**
 * The Storefront API image shape shared across all three fragments.
 * Mirrors what Hydrogen's <Image> component expects for its `data` prop.
 */
type ImageNode = {
  id?: string | null;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

// ---------------------------------------------------------------------------
// Type-narrowing helpers
// ---------------------------------------------------------------------------

/** True when the fragment includes a populated `images.nodes` array. */
function hasImages(
  product: AnyProduct,
): product is AnyProduct & { images: { nodes: ImageNode[] } } {
  return (
    'images' in product &&
    product.images != null &&
    typeof product.images === 'object' &&
    'nodes' in (product.images as object) &&
    Array.isArray((product.images as { nodes: unknown }).nodes)
  );
}

/** True when the fragment includes a populated `variants.nodes` array. */
function hasVariants(
  product: AnyProduct,
): product is AnyProduct & {
  variants: { nodes: Array<{ quantityAvailable?: number | null }> };
} {
  return (
    'variants' in product &&
    product.variants != null &&
    typeof product.variants === 'object' &&
    'nodes' in (product.variants as object) &&
    Array.isArray((product.variants as { nodes: unknown }).nodes)
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ProductItem
 *
 * Full-screen product card with a floating info bar.
 * - Hover (desktop) OR 60 % viewport intersection (mobile/scroll) activates
 *   the floating bar via the `active` flag.
 * - Images come from product.images.nodes — falls back to featuredImage.
 * - Price uses Hydrogen's <Money> so currency formatting is always correct.
 * - Stock is read from the first variant's quantityAvailable when present.
 */
export function ProductItem({ product, loading }: ProductItemProps) {
  const variantUrl = useVariantUrl(product.handle);
  const [active, setActive] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Collect up to 3 images — TypeScript now knows the exact shape of each node.
  const imageNodes: ImageNode[] = hasImages(product) && product.images.nodes.length
    ? product.images.nodes.slice(0, 3)
    : product.featuredImage
      ? [product.featuredImage as ImageNode]
      : [];

  // Stock count — null on fragments that don't carry variants.
  const stock: number | null = hasVariants(product)
    ? (product.variants.nodes[0]?.quantityAvailable ?? null)
    : null;

  // Activate the floating bar when the card scrolls into view (>=60% visible).
  // This replicates the IntersectionObserver behaviour from the original.
  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.6 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      prefetch="intent"
      to={variantUrl}
      className="block h-screen"
    >
      <div
        ref={cardRef}
        className="relative h-full w-full overflow-hidden bg-black text-white cursor-pointer"
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
      >
        {/* Background tint */}
        <div className="absolute inset-0">
          {product.featuredImage && (
            <Image
              data={product.featuredImage}
              loading={loading}
              sizes="100vw"
              className="absolute inset-0 h-full w-full object-cover opacity-[0.14]"
            />
          )}
          <div className="absolute inset-0 bg-black/80" />
        </div>

        {/* Main content */}
        <div className="relative z-10 h-full w-full border border-white/10">
          {/* Product image grid */}
          <div className="grid h-full grid-cols-2 md:grid-cols-3">
            {imageNodes.map((image: ImageNode, index: number) => (
              <div
                key={image.id ?? index}
                className={[
                  'relative border-r border-white/10',
                  index === imageNodes.length - 1 ? 'border-r-0' : '',
                  index === 2 ? 'hidden md:block' : '',
                ].join(' ')}
              >
                <Image
                  data={image}
                  loading={loading}
                  sizes={
                    index === 2
                      ? '(min-width: 768px) 33vw, 0vw'
                      : '(min-width: 768px) 33vw, 50vw'
                  }
                  className="absolute inset-0 h-full w-full object-cover opacity-[0.94]"
                />
                <div className="absolute inset-0 bg-black/10" />
              </div>
            ))}
          </div>

          {/* Floating product bar */}
          <div
            className={[
              'absolute bottom-4 md:bottom-6 left-1/2 z-30',
              'w-[calc(100%-20px)] md:w-[calc(100%-40px)]',
              '-translate-x-1/2',
              'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
              active
                ? 'translate-y-0 opacity-100'
                : 'translate-y-10 opacity-0 pointer-events-none',
            ].join(' ')}
          >
            <div
              className="
                flex min-h-[68px] md:h-[78px]
                items-center justify-between
                rounded-[22px] md:rounded-[26px]
                border border-white/10 bg-[#343232]
                px-4 md:px-8 py-3 md:py-0
                shadow-[0_10px_40px_rgba(0,0,0,0.45)]
              "
            >
              {/* Product name */}
              <div className="min-w-0 flex-1">
                <h2
                  className="
                    truncate
                    text-[13px] sm:text-[15px] md:text-[26px]
                    font-light uppercase
                    tracking-[-0.08em] md:tracking-[-0.09em]
                    leading-none text-white
                  "
                >
                  {product.title}
                </h2>
              </div>

              {/* Right side: stock + price */}
              <div className="ml-4 md:ml-6 flex items-center gap-4 md:gap-10 shrink-0">

                {/* Stock — only rendered when data is available */}
                {stock !== null && (
                  <div className="hidden sm:flex flex-col items-end">
                    <span
                      className="
                        text-[9px] md:text-[10px]
                        font-medium uppercase
                        tracking-[0.22em] md:tracking-[0.24em]
                        text-white/35
                      "
                    >
                      In Stock
                    </span>
                    <span
                      className="
                        mt-1
                        text-[15px] md:text-[18px]
                        font-light
                        tracking-[-0.05em] md:tracking-[-0.06em]
                        text-white
                      "
                    >
                      {stock}
                    </span>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 rounded-full bg-yellow-400" />
                  <span
                    className="
                      text-[20px] sm:text-[24px] md:text-[40px]
                      font-light
                      tracking-[-0.08em] md:tracking-[-0.1em]
                      leading-none text-white
                    "
                  >
                    <Money data={product.priceRange.minVariantPrice} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}