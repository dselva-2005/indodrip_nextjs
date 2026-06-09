import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `Hydrogen | ${data?.product.title ?? ''}`},
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {
    product,
  };
}

function loadDeferredData({context, params}: Route.LoaderArgs) {
  return {};
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();

  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml, vendor} = product;
  
  const productImages = selectedVariant?.image 
    ? [selectedVariant.image, ...(product.images?.nodes || [])]
    : (product.images?.nodes || []);
  
  const [activeImage, setActiveImage] = useState(0);
  const [openAccordion, setOpenAccordion] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosition({ x, y });
  };

  const accordionItems = [
    { title: "Description", content: descriptionHtml },
    { title: "Details", content: `${vendor} - ${title}` },
    { title: "Shipping", content: "Worldwide shipping available. Dispatch within 2–4 business days." },
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="grid min-h-screen w-full md:grid-cols-[1fr_100px_1fr] lg:grid-cols-[1fr_120px_1fr]">
        
        {/* MOBILE IMAGE */}
        <div className="relative h-[50vh] md:hidden">
          <img
            src={productImages[activeImage]?.url || ''}
            alt={productImages[activeImage]?.altText || title}
            className="h-full w-full object-cover"
          />
        </div>

        {/* DESKTOP IMAGE - Left Column */}
        <div className="relative hidden md:block md:col-span-1">
          <div
            className="sticky top-0 h-screen w-full overflow-hidden"
            onMouseEnter={() => setZoomed(true)}
            onMouseLeave={() => setZoomed(false)}
            onMouseMove={handleMouseMove}
          >
            <img
              src={productImages[activeImage]?.url || ''}
              alt={productImages[activeImage]?.altText || title}
              draggable={false}
              className="absolute inset-0 h-full w-full select-none object-cover transition-transform duration-150 ease-out"
              style={{
                transform: zoomed ? "scale(2.2)" : "scale(1)",
                transformOrigin: `${position.x}% ${position.y}%`,
              }}
            />
          </div>
        </div>

        {/* THUMBNAILS - Middle Column */}
        <div className="hidden md:block md:col-span-1">
          <div className="sticky top-0 h-screen">
            <div className="flex h-full flex-col gap-2 p-4">
              {productImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImage(index)}
                  className={`
                    relative aspect-square w-full overflow-hidden
                    transition-all duration-300
                    ${activeImage === index ? "ring-2 ring-black" : "ring-1 ring-gray-200"}
                    hover:ring-2 hover:ring-gray-400
                  `}
                >
                  <img
                    src={image.url}
                    alt={image.altText || title}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Product Info */}
        <div className="col-span-1">
          <div className="sticky top-0">
            {/* Product Title */}
            <div className="border-b border-gray-100 p-6 md:p-8">
              <h1 className="text-3xl font-light uppercase tracking-[-0.04em] md:text-4xl lg:text-5xl">
                {title}
              </h1>
              
              <div className="mt-4 text-sm leading-relaxed text-gray-600">
                <div dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
              </div>
            </div>

            {/* Price and Stock */}
            <div className="border-b border-gray-100 p-6 md:p-8">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-gray-400">
                    {selectedVariant?.availableForSale ? "In Stock" : "Out of Stock"}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    {selectedVariant?.availableForSale ? "Available" : "Unavailable"}
                  </div>
                </div>
                <div className="text-2xl font-light tracking-[-0.04em] md:text-3xl">
                  <ProductPrice
                    price={selectedVariant?.price}
                    compareAtPrice={selectedVariant?.compareAtPrice}
                  />
                </div>
              </div>
            </div>

            {/* PRODUCT FORM */}
            <div className="border-b border-gray-100 p-6 md:p-8">
              <ProductForm
                productOptions={productOptions}
                selectedVariant={selectedVariant}
              />
            </div>

            {/* ACCORDION */}
            <div className="divide-y divide-gray-100">
              {accordionItems.map((item, index) => (
                <div key={item.title}>
                  <button
                    onClick={() => setOpenAccordion(openAccordion === index ? -1 : index)}
                    className="flex w-full items-center justify-between p-6 md:p-8 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm uppercase tracking-[-0.02em] text-gray-600">
                      {item.title}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-gray-400 transition-transform duration-300 ${
                        openAccordion === index ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      openAccordion === index ? "max-h-96" : "max-h-0"
                    }`}
                  >
                    <div
                      className="px-6 pb-6 md:px-8 md:pb-8 text-sm leading-relaxed text-gray-600"
                      dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price?.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    images(first: 10) {
      nodes {
        url
        altText
        width
        height
      }
    }
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;