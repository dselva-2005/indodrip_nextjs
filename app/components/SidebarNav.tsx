/**
 * SidebarNav — Robust sidebar with fixed behavior
 */

import { useState, Suspense, useEffect, useCallback } from 'react';
import { Await, NavLink } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAnalytics, type CartViewPayload, useOptimisticCart, CartForm, Image } from '@shopify/hydrogen';
import type { HeaderQuery, CartApiQueryFragment } from 'storefrontapi.generated';
import { useVariantUrl } from '~/lib/variants';
import { SearchOverlay } from './SearchOverlay';
import { useAside } from '~/components/Aside';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidebarNavProps {
    header: HeaderQuery;
    cart: Promise<CartApiQueryFragment | null>;
    isLoggedIn: Promise<boolean>;
    publicStoreDomain: string;
}

// Default policy items if none exist in menu
const DEFAULT_POLICIES = [
    { id: '1', title: 'Privacy Policy', url: '/policies/privacy-policy' },
    { id: '2', title: 'Return & Exchange', url: '/policies/returns' },
    { id: '3', title: 'Shipping & Delivery', url: '/policies/shipping' },
    { id: '4', title: 'Terms & Conditions', url: '/policies/terms' },
];

// ---------------------------------------------------------------------------
// Root Component
// ---------------------------------------------------------------------------

export function SidebarNav({
    header,
    isLoggedIn,
    cart,
    publicStoreDomain,
}: SidebarNavProps) {
    const { shop, menu } = header;
    const [menuOpen, setMenuOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [mobilePolicies, setMobilePolicies] = useState(false);
    const [cartOpen, setCartOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Check for mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close all drawers when menu closes
    useEffect(() => {
        if (!menuOpen) {
            setDrawerOpen(false);
            setMobilePolicies(false);
        }
    }, [menuOpen]);

    // Handle escape key to close everything
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (cartOpen) setCartOpen(false);
                if (drawerOpen) setDrawerOpen(false);
                if (mobilePolicies) setMobilePolicies(false);
                if (menuOpen) setMenuOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [cartOpen, drawerOpen, mobilePolicies, menuOpen]);

    // Process menu items
    const items = menu?.items || [];
    const policyItems = items.filter((item: any) => item.url?.includes('/policies'));
    const finalPolicyItems = policyItems.length > 0 ? policyItems : DEFAULT_POLICIES;

    function resolveUrl(url: string): string {
        if (url.includes('myshopify.com') || url.includes(publicStoreDomain) || url.includes(shop.primaryDomain.url)) {
            return new URL(url).pathname;
        }
        return url;
    }

    const handleMenuToggle = useCallback(() => {
        setMenuOpen(prev => !prev);
    }, []);

    const closeAll = useCallback(() => {
        setMenuOpen(false);
        setDrawerOpen(false);
        setMobilePolicies(false);
        setCartOpen(false);
    }, []);

    const handleMoreClick = useCallback(() => {
        if (isMobile) {
            setMobilePolicies(true);
        } else {
            setDrawerOpen(true);
        }
    }, [isMobile]);

    return (
        <>
            {/* Backdrop overlay when menu is open on mobile */}
            <AnimatePresence>
                {menuOpen && isMobile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={handleMenuToggle}
                        className="fixed inset-0 z-[998] bg-black/50"
                    />
                )}
            </AnimatePresence>

            {/* FIXED FLOATING NAV - Using a single container with pointer-events-none */}
            <div className="fixed left-0 top-0 z-[999] pointer-events-none h-screen w-2/3 md:w-[20vw] max-w-[360px] min-w-[220px]">
                
                {/* MENU OVERLAY - Full height glass background when menu is open */}
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 pointer-events-auto"
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                backdropFilter: 'blur(12px)',
                                borderRight: '1px solid rgba(255, 255, 255, 0.15)',
                            }}
                        />
                    )}
                </AnimatePresence>

                {/* CONTENT LAYER - On top of the overlay */}
                <div className="relative z-10 flex h-full flex-col px-6 md:px-8">
                    
                    {/* TOP SECTION - Always visible and clickable */}
                    <div className="pt-8 md:pt-10 pointer-events-auto">
                        <div className="space-y-2">
                            <NavLink
                                prefetch="intent"
                                to="/"
                                end
                                onClick={closeAll}
                                className="block text-[18px] md:text-[20px] font-semibold uppercase tracking-[-0.04em] text-black no-underline"
                            >
                                {shop.name}
                            </NavLink>

                            {/* Search button */}
                            <SearchTrigger />

                            <button
                                onClick={() => setCartOpen(true)}
                                className="block text-left text-[18px] md:text-[20px] font-light uppercase tracking-[-0.04em] text-black/70 no-underline"
                            >
                                <Suspense fallback="Bag (0)">
                                    <Await resolve={cart}>
                                        {(resolvedCart) => `Bag (${resolvedCart?.totalQuantity ?? 0})`}
                                    </Await>
                                </Suspense>
                            </button>
                        </div>
                    </div>

                    {/* CENTER SECTION - Menu items (only interactive when menu is open) */}
                    <div className={`flex-1 flex items-center ${menuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                        <AnimatePresence mode="wait">
                            {menuOpen && (
                                <motion.div
                                    key={mobilePolicies ? "policies" : "main"}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full"
                                >
                                    {!mobilePolicies ? (
                                        <div className="space-y-6">
                                            <NavLink
                                                to="/"
                                                onClick={closeAll}
                                                className="block text-[28px] md:text-[42px] font-light uppercase tracking-[-0.09em] leading-[1.1] text-black no-underline"
                                            >
                                                HOME
                                            </NavLink>

                                            <NavLink
                                                to="/collections"
                                                onClick={closeAll}
                                                className="block text-[28px] md:text-[42px] font-light uppercase tracking-[-0.09em] leading-[1.1] text-black no-underline"
                                            >
                                                CATALOG
                                            </NavLink>

                                            <NavLink
                                                to="/account"
                                                onClick={closeAll}
                                                className="block text-[28px] md:text-[42px] font-light uppercase tracking-[-0.09em] leading-[1.1] text-black no-underline"
                                            >
                                                <Suspense fallback="SIGN IN">
                                                    <Await resolve={isLoggedIn} errorElement="SIGN IN">
                                                        {(loggedIn) => (loggedIn ? 'ACCOUNT' : 'SIGN IN')}
                                                    </Await>
                                                </Suspense>
                                            </NavLink>

                                            {/* MORE button */}
                                            <button
                                                onClick={handleMoreClick}
                                                className="flex flex-col items-start text-left"
                                            >
                                                <span className="text-[28px] md:text-[42px] font-light uppercase tracking-[-0.09em] leading-[1.1] text-black">
                                                    MORE
                                                </span>
                                                <div className="mt-3 flex items-center gap-2 text-[9px] uppercase tracking-[0.28em] text-gray-400">
                                                    open <ChevronRight size={12} />
                                                </div>
                                            </button>
                                        </div>
                                    ) : (
                                        /* Mobile Policies Panel */
                                        <div className="space-y-8">
                                            <button
                                                onClick={() => setMobilePolicies(false)}
                                                className="flex items-center gap-2 text-[9px] uppercase tracking-[0.28em] text-gray-400"
                                            >
                                                <ChevronLeft size={12} /> back
                                            </button>
                                            <div className="space-y-4">
                                                {finalPolicyItems.map((item: any) => {
                                                    const url = item.url?.includes('http')
                                                        ? resolveUrl(item.url)
                                                        : item.url;
                                                    return (
                                                        <NavLink
                                                            key={item.id}
                                                            to={url}
                                                            onClick={closeAll}
                                                            className="block text-[18px] font-light uppercase tracking-[-0.05em] text-black no-underline"
                                                        >
                                                            {item.title}
                                                        </NavLink>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* BOTTOM SECTION - Hamburger toggle (always at bottom, always clickable) */}
                    <div className="pb-8 md:pb-10 pointer-events-auto">
                        <button
                            onClick={handleMenuToggle}
                            className="text-black focus:outline-none"
                        >
                            <motion.div
                                animate={{ rotate: menuOpen ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {menuOpen ? (
                                    <X size={28} strokeWidth={1.8} />
                                ) : (
                                    <Menu size={28} strokeWidth={1.8} />
                                )}
                            </motion.div>
                        </button>
                    </div>
                </div>
            </div>

            {/* DESKTOP EXTENDED DRAWER - Positioned relative to the sidebar */}
            <AnimatePresence>
                {drawerOpen && !isMobile && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 300, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed top-0 z-[998] h-screen overflow-hidden shadow-lg pointer-events-auto"
                        style={{
                            left: 'min(20vw, 360px)',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            backdropFilter: 'blur(12px)',
                            borderRight: '1px solid rgba(255, 255, 255, 0.15)',
                        }}
                    >
                        <div className="flex h-full items-center px-8">
                            <div className="space-y-6 w-full">
                                {finalPolicyItems.map((item: any, index: number) => {
                                    const url = item.url?.includes('http')
                                        ? resolveUrl(item.url)
                                        : item.url;
                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05, duration: 0.2 }}
                                        >
                                            <NavLink
                                                to={url}
                                                onClick={closeAll}
                                                className="block text-[22px] font-light uppercase tracking-[-0.06em] text-black no-underline"
                                            >
                                                {item.title}
                                            </NavLink>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search Overlay - Using your existing SearchOverlay component */}
            <SearchOverlay />

            {/* CART DRAWER */}
            <AnimatePresence>
                {cartOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setCartOpen(false)}
                            className="fixed inset-0 z-[1100] bg-black/30 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ duration: 0.35, ease: "easeInOut" }}
                            className="fixed right-0 top-0 z-[1101] flex h-screen w-full max-w-[480px] flex-col bg-white shadow-xl"
                        >
                            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                                <button onClick={() => setCartOpen(false)} className="text-gray-400">
                                    <X size={22} strokeWidth={1.5} />
                                </button>
                                <h2 className="text-lg font-normal tracking-wide">
                                    <Suspense fallback="BAG (0)">
                                        <Await resolve={cart}>
                                            {(resolvedCart) => `BAG (${resolvedCart?.totalQuantity ?? 0})`}
                                        </Await>
                                    </Suspense>
                                </h2>
                                <div className="w-5" />
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-6">
                                <Suspense fallback={<CartLoadingSkeleton />}>
                                    <Await resolve={cart}>
                                        {(resolvedCart) => (
                                            <CartItems cart={resolvedCart} onClose={() => setCartOpen(false)} />
                                        )}
                                    </Await>
                                </Suspense>
                            </div>

                            <Suspense fallback={<CartFooterSkeleton />}>
                                <Await resolve={cart}>
                                    {(resolvedCart) => <CartFooter cart={resolvedCart} />}
                                </Await>
                            </Suspense>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

// ---------------------------------------------------------------------------
// Search Trigger Component
// ---------------------------------------------------------------------------

function SearchTrigger() {
    const { open } = useAside();

    return (
        <button
            onClick={() => open('search')}
            className="block text-left text-[18px] md:text-[20px] font-light uppercase tracking-[-0.04em] text-black/70 no-underline"
        >
            Search
        </button>
    );
}

// ---------------------------------------------------------------------------
// Cart Components
// ---------------------------------------------------------------------------

function CartItems({ cart, onClose }: { cart: CartApiQueryFragment | null; onClose: () => void }) {
    const optimisticCart = useOptimisticCart(cart);
    const linesCount = optimisticCart?.lines?.nodes?.length ?? 0;

    if (linesCount === 0) {
        return <EmptyCart onClose={onClose} />;
    }

    return (
        <div className="space-y-6">
            {(optimisticCart?.lines?.nodes ?? []).map((line: any) => (
                <CartLineItem key={line.id} line={line} onClose={onClose} />
            ))}
        </div>
    );
}

function CartLineItem({ line, onClose }: { line: any; onClose: () => void }) {
    const { id, merchandise, quantity, cost, isOptimistic } = line;
    const { product, title, image, selectedOptions } = merchandise;
    const variantUrl = useVariantUrl(product.handle, selectedOptions);
    const prevQuantity = Math.max(0, quantity - 1);
    const nextQuantity = quantity + 1;
    const price = cost?.totalAmount?.amount ? parseFloat(cost.totalAmount.amount).toLocaleString() : '0';
    const currency = cost?.totalAmount?.currencyCode || 'INR';
    const variantValue = selectedOptions?.find((opt: any) => opt.name === 'Size')?.value || '';

    return (
        <div className="flex gap-4 border-b border-gray-100 pb-6">
            {image && (
                <NavLink to={variantUrl} onClick={onClose} className="block h-20 w-20 flex-shrink-0 overflow-hidden bg-gray-50 no-underline">
                    <Image alt={title} data={image} className="h-full w-full object-cover" loading="lazy" />
                </NavLink>
            )}
            <div className="flex-1">
                <NavLink to={variantUrl} onClick={onClose} className="no-underline">
                    <h3 className="font-medium text-black text-sm">{product.title}</h3>
                </NavLink>
                {title !== 'Default Title' && <div className="mt-1 text-xs text-gray-400">{title}</div>}
                {variantValue && <div className="mt-1 text-xs text-gray-400">Size: {variantValue}</div>}
                <div className="mt-2 text-sm font-medium">{currency} {price}</div>
                <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <CartLineUpdateButton lines={[{ id, quantity: prevQuantity }]}>
                            <button disabled={quantity <= 1 || !!isOptimistic} className="w-6 h-6 flex items-center justify-center border border-gray-200 disabled:opacity-30 text-sm">
                                -
                            </button>
                        </CartLineUpdateButton>
                        <span className="w-5 text-center text-sm">{quantity}</span>
                        <CartLineUpdateButton lines={[{ id, quantity: nextQuantity }]}>
                            <button disabled={!!isOptimistic} className="w-6 h-6 flex items-center justify-center border border-gray-200 disabled:opacity-30 text-sm">
                                +
                            </button>
                        </CartLineUpdateButton>
                    </div>
                    <CartLineRemoveButton lineIds={[id]} disabled={!!isOptimistic}>
                        <button className="text-gray-400 text-xs underline">Remove</button>
                    </CartLineRemoveButton>
                </div>
            </div>
        </div>
    );
}

function CartFooter({ cart }: { cart: CartApiQueryFragment | null }) {
    const optimisticCart = useOptimisticCart(cart);
    const subtotal = optimisticCart?.cost?.subtotalAmount;
    if (!optimisticCart?.lines?.nodes?.length) return null;
    const amount = subtotal?.amount ? parseFloat(subtotal.amount).toLocaleString() : '0';
    const currency = subtotal?.currencyCode || 'INR';

    return (
        <div className="border-t border-gray-100 p-5">
            <div className="flex justify-between items-center mb-4">
                <span className="text-xs uppercase tracking-wide text-gray-400">Subtotal</span>
                <span className="text-lg font-medium">{currency} {amount}</span>
            </div>
            {optimisticCart?.checkoutUrl && (
                <a href={optimisticCart.checkoutUrl} className="block w-full py-3 text-center bg-black text-white text-xs uppercase tracking-wide no-underline">
                    Checkout
                </a>
            )}
        </div>
    );
}

function EmptyCart({ onClose }: { onClose: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-400 text-sm mb-6">Your bag is empty</p>
            <button onClick={onClose} className="px-6 py-2 border border-gray-200 text-sm uppercase tracking-wide">
                Continue Shopping
            </button>
        </div>
    );
}

function CartLoadingSkeleton() {
    return (
        <div className="space-y-6">
            {[1, 2].map((i) => (
                <div key={i} className="flex gap-4">
                    <div className="h-20 w-20 bg-gray-100 animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 w-3/4 animate-pulse" />
                        <div className="h-3 bg-gray-100 w-1/2 animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function CartFooterSkeleton() {
    return (
        <div className="border-t border-gray-100 p-5 space-y-4">
            <div className="h-3 bg-gray-100 w-full animate-pulse" />
            <div className="h-10 bg-gray-100 w-full animate-pulse" />
        </div>
    );
}

function CartLineUpdateButton({ children, lines }: { children: React.ReactNode; lines: { id: string; quantity: number }[] }) {
    const lineIds = lines.map((line) => line.id);
    return (
        <CartForm fetcherKey={[CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-')} route="/cart" action={CartForm.ACTIONS.LinesUpdate} inputs={{ lines }}>
            {children}
        </CartForm>
    );
}

function CartLineRemoveButton({ lineIds, disabled, children }: { lineIds: string[]; disabled: boolean; children: React.ReactNode }) {
    return (
        <CartForm fetcherKey={[CartForm.ACTIONS.LinesRemove, ...lineIds].join('-')} route="/cart" action={CartForm.ACTIONS.LinesRemove} inputs={{ lineIds }}>
            {children}
        </CartForm>
    );
}