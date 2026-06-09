import { Suspense } from 'react';
import { Await, useAsyncValue } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Minus, Plus } from 'lucide-react';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
  CartForm,
  Image,
} from '@shopify/hydrogen';
import type { CartApiQueryFragment } from 'storefrontapi.generated';
import { useAside } from '~/components/Aside';
import { useVariantUrl } from '~/lib/variants';
import { Link } from 'react-router';

interface CartDrawerProps {
  cart: Promise<CartApiQueryFragment | null>;
}

/**
 * CartDrawer - Light theme with product images
 */
export function CartDrawer({ cart }: CartDrawerProps) {
  const { type: activeAside, close } = useAside();
  const { publish } = useAnalytics();
  const isOpen = activeAside === 'cart';

  if (isOpen) {
    publish('cart_viewed', {
      cart: cart,
    } as CartViewPayload);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            className="fixed inset-0 z-[1100] bg-black/30 backdrop-blur-sm"
          />

          {/* Drawer panel - Light theme */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="
              fixed right-0 top-0 z-[1101]
              flex h-screen w-full max-w-[500px] flex-col
              border-l border-gray-100
              bg-white text-black
            "
          >
            {/* Header */}
            <Suspense fallback={<CartDrawerHeader count={0} />}>
              <Await resolve={cart}>
                <CartDrawerHeaderBanner />
              </Await>
            </Suspense>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <Suspense fallback={<CartLoadingSkeleton />}>
                <Await resolve={cart}>
                  <CartItems />
                </Await>
              </Suspense>
            </div>

            {/* Footer */}
            <Suspense fallback={<CartFooterSkeleton />}>
              <Await resolve={cart}>
                <CartFooter />
              </Await>
            </Suspense>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Header Components
// ---------------------------------------------------------------------------

function CartDrawerHeader({ count }: { count: number }) {
  const { close } = useAside();
  
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
      <button onClick={close} className="text-gray-400 hover:text-black transition-colors">
        <X size={24} strokeWidth={1.5} />
      </button>
      <h2 className="text-xl font-normal">
        BAG ({count})
      </h2>
      <div className="w-6" />
    </div>
  );
}

function CartDrawerHeaderBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartDrawerHeader count={cart?.totalQuantity ?? 0} />;
}

// ---------------------------------------------------------------------------
// Cart Items Component
// ---------------------------------------------------------------------------

function CartItems() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  const linesCount = cart?.lines?.nodes?.length ?? 0;

  if (linesCount === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="space-y-6">
      {(cart?.lines?.nodes ?? []).map((line) => (
        <CartLineItem key={line.id} line={line} />
      ))}
    </div>
  );
}

interface CartLineItemProps {
  line: any;
}

function CartLineItem({ line }: CartLineItemProps) {
  const { id, merchandise, quantity, cost, isOptimistic } = line;
  const { product, title, image, selectedOptions } = merchandise;
  const variantUrl = useVariantUrl(product.handle, selectedOptions);
  const { close } = useAside();

  const prevQuantity = Math.max(0, quantity - 1);
  const nextQuantity = quantity + 1;
  
  const price = cost?.totalAmount?.amount 
    ? parseFloat(cost.totalAmount.amount).toLocaleString()
    : '0';
  const currency = cost?.totalAmount?.currencyCode || 'INR';

  // Get variant option value (like size 30)
  const variantValue = selectedOptions?.find((opt: any) => opt.name === 'Size')?.value || 
                       selectedOptions?.find((opt: any) => opt.name === 'Waist')?.value || 
                       '';

  return (
    <div className="flex gap-4 border-b border-gray-100 pb-6 last:border-0">
      {/* Product Image */}
      {image && (
        <Link
          to={variantUrl}
          onClick={() => close()}
          className="block h-24 w-24 flex-shrink-0 overflow-hidden bg-gray-50"
        >
          <Image
            alt={title}
            data={image}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </Link>
      )}

      {/* Product Details */}
      <div className="flex-1">
        <Link
          to={variantUrl}
          onClick={() => close()}
          className="hover:opacity-70 transition-opacity"
        >
          <h3 className="font-medium text-black">
            {product.title}
          </h3>
        </Link>
        
        {title !== 'Default Title' && (
          <div className="mt-1 text-sm text-gray-500">
            {title}
          </div>
        )}

        {variantValue && (
          <div className="mt-1 text-sm text-gray-500">
            Size: {variantValue}
          </div>
        )}

        <div className="mt-1 text-sm text-gray-500">
          {currency} {price}
        </div>

        {/* Quantity Controls */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CartLineUpdateButton lines={[{ id, quantity: prevQuantity }]}>
              <button
                disabled={quantity <= 1 || !!isOptimistic}
                className="w-7 h-7 flex items-center justify-center border border-gray-300 hover:border-gray-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus size={12} strokeWidth={1.5} />
              </button>
            </CartLineUpdateButton>
            
            <span className="w-6 text-center text-sm">{quantity}</span>
            
            <CartLineUpdateButton lines={[{ id, quantity: nextQuantity }]}>
              <button
                disabled={!!isOptimistic}
                className="w-7 h-7 flex items-center justify-center border border-gray-300 hover:border-gray-400 transition-colors disabled:opacity-30"
              >
                <Plus size={12} strokeWidth={1.5} />
              </button>
            </CartLineUpdateButton>
          </div>

          {/* Remove Button */}
          <CartLineRemoveButton lineIds={[id]} disabled={!!isOptimistic}>
            <button className="text-gray-400 hover:text-red-500 transition-colors text-xs underline">
              Remove
            </button>
          </CartLineRemoveButton>
        </div>

        {/* Optimistic loading indicator */}
        {isOptimistic && (
          <div className="mt-2 text-xs text-gray-400 animate-pulse">
            Updating...
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cart Footer Components
// ---------------------------------------------------------------------------

function CartFooter() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  const subtotal = cart?.cost?.subtotalAmount;
  const discountCodes = cart?.discountCodes;
  const appliedGiftCards = cart?.appliedGiftCards;

  if (!cart?.lines?.nodes?.length) return null;

  const subtotalAmount = subtotal?.amount 
    ? parseFloat(subtotal.amount).toLocaleString()
    : '0';
  const currency = subtotal?.currencyCode || 'INR';

  return (
    <div className="border-t border-gray-100 bg-white">
      {/* Discount Codes Section */}
      {(discountCodes?.length || appliedGiftCards?.length) && (
        <div className="px-6 py-4 border-b border-gray-100">
          <DiscountCodesSection discountCodes={discountCodes} />
          <GiftCardsSection appliedGiftCards={appliedGiftCards} />
        </div>
      )}

      {/* Subtotal */}
      <div className="px-6 py-5">
        <div className="flex justify-between items-center">
          <span className="text-sm uppercase tracking-wide text-gray-500">
            SUB TOTAL
          </span>
          <span className="text-xl font-medium">
            {currency} {subtotalAmount}
          </span>
        </div>

        {/* Checkout Button */}
        {cart?.checkoutUrl && (
          <a
            href={cart.checkoutUrl}
            target="_self"
            className="
              block w-full mt-6 py-3 text-center
              bg-black text-white
              text-sm uppercase tracking-wide
              transition-all duration-300
              hover:bg-gray-900
            "
          >
            CHECKOUT
          </a>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Discount Codes Component - Simplified
// ---------------------------------------------------------------------------

function DiscountCodesSection({ discountCodes }: { discountCodes?: any[] }) {
  const codes = discountCodes?.filter((d) => d.applicable)?.map((d) => d.code) || [];

  if (!codes.length) return null;

  return (
    <div className="mb-3">
      {codes.map((code) => (
        <div key={code} className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Discount ({code})</span>
          <UpdateDiscountForm discountCodes={[]}>
            <button className="text-gray-400 hover:text-gray-600 text-xs">
              Remove
            </button>
          </UpdateDiscountForm>
        </div>
      ))}
    </div>
  );
}

function UpdateDiscountForm({
  discountCodes,
  children,
}: {
  discountCodes?: string[];
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{ discountCodes: discountCodes || [] }}
    >
      {children}
    </CartForm>
  );
}

// ---------------------------------------------------------------------------
// Gift Cards Component - Simplified
// ---------------------------------------------------------------------------

function GiftCardsSection({ appliedGiftCards }: { appliedGiftCards?: any[] }) {
  if (!appliedGiftCards?.length) return null;

  return (
    <div className="space-y-2">
      {appliedGiftCards.map((giftCard) => (
        <div key={giftCard.id} className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Gift card (***{giftCard.lastCharacters})
          </span>
          <div className="flex items-center gap-3">
            <span className="text-gray-700">
              {giftCard.amountUsed.currencyCode} {giftCard.amountUsed.amount}
            </span>
            <RemoveGiftCardForm giftCardId={giftCard.id}>
              <button className="text-gray-400 hover:text-gray-600 text-xs">
                Remove
              </button>
            </RemoveGiftCardForm>
          </div>
        </div>
      ))}
    </div>
  );
}

function RemoveGiftCardForm({
  giftCardId,
  children,
}: {
  giftCardId: string;
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesRemove}
      inputs={{ giftCardCodes: [giftCardId] }}
    >
      {children}
    </CartForm>
  );
}

// ---------------------------------------------------------------------------
// Cart Action Components
// ---------------------------------------------------------------------------

function CartLineUpdateButton({
  children,
  lines,
}: {
  children: React.ReactNode;
  lines: { id: string; quantity: number }[];
}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{ lines }}
    >
      {children}
    </CartForm>
  );
}

function CartLineRemoveButton({
  lineIds,
  disabled,
  children,
}: {
  lineIds: string[];
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{ lineIds }}
    >
      {children}
    </CartForm>
  );
}

function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}

// ---------------------------------------------------------------------------
// Empty and Loading States
// ---------------------------------------------------------------------------

function EmptyCart() {
  const { close } = useAside();
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <p className="text-gray-400 text-sm mb-6">Your bag is empty</p>
      <button
        onClick={close}
        className="
          px-6 py-2 border border-gray-300
          hover:bg-gray-50 transition-colors
          text-sm uppercase tracking-wide
        "
      >
        Continue Shopping
      </button>
    </div>
  );
}

function CartLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <div key={i} className="flex gap-4 border-b border-gray-100 pb-6">
          <div className="h-24 w-24 bg-gray-100 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-100 w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-100 w-1/2 animate-pulse" />
            <div className="h-4 bg-gray-100 w-1/3 animate-pulse" />
            <div className="h-8 bg-gray-100 w-24 animate-pulse mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CartFooterSkeleton() {
  return (
    <div className="border-t border-gray-100 p-6 space-y-4">
      <div className="flex justify-between">
        <div className="h-4 bg-gray-100 w-20 animate-pulse" />
        <div className="h-6 bg-gray-100 w-24 animate-pulse" />
      </div>
      <div className="h-10 bg-gray-100 w-full animate-pulse" />
    </div>
  );
}