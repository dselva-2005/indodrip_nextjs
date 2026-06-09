import * as React from 'react';
import { useEffect, useRef } from 'react';
import { Pagination } from '@shopify/hydrogen';

/**
 * PaginatedResourceSection
 *
 * Infinite-scroll variant of the default paginated section.
 * - A sentinel <div> is placed below the last item.
 * - An IntersectionObserver watches it; when it enters the viewport the
 *   hidden NextLink is clicked automatically, loading the next page.
 * - PreviousLink is kept for direct-URL / back-navigation support but
 *   visually hidden — it still functions as a real link for accessibility.
 * - "Loading..." text is shown in the sentinel area while fetching.
 */
export function PaginatedResourceSection<NodesType>({
  connection,
  children,
  ariaLabel,
  resourcesClassName,
}: {
  connection: React.ComponentProps<typeof Pagination<NodesType>>['connection'];
  children: React.FunctionComponent<{ node: NodesType; index: number }>;
  ariaLabel?: string;
  resourcesClassName?: string;
}) {
  return (
    <Pagination connection={connection}>
      {({ nodes, isLoading, hasNextPage, PreviousLink, NextLink }) => {
        const resourcesMarkup = nodes.map((node, index) =>
          children({ node, index }),
        );

        return (
          <div>
            {/* Hidden previous link — keeps browser history / direct URL working */}
            <PreviousLink className="sr-only" aria-hidden="true" tabIndex={-1} />

            {resourcesClassName ? (
              <div
                aria-label={ariaLabel}
                className={resourcesClassName}
                role={ariaLabel ? 'region' : undefined}
              >
                {resourcesMarkup}
              </div>
            ) : (
              resourcesMarkup
            )}

            {/* Auto-trigger sentinel — invisible, sits below the last item */}
            {hasNextPage && (
              <ScrollSentinel isLoading={isLoading}>
                <NextLink />
              </ScrollSentinel>
            )}
          </div>
        );
      }}
    </Pagination>
  );
}

// ---------------------------------------------------------------------------
// ScrollSentinel
//
// Renders the NextLink invisibly and clicks it automatically when the
// sentinel div scrolls into view.
// ---------------------------------------------------------------------------

function ScrollSentinel({
  children,
  isLoading,
}: {
  children: React.ReactNode;
  isLoading: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Fire only when visible and not already loading
        if (entry.isIntersecting && !isLoading) {
          linkRef.current?.click();
        }
      },
      // Trigger slightly before the sentinel reaches the viewport bottom
      { rootMargin: '0px 0px 200px 0px', threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading]);

  return (
    <div ref={sentinelRef} aria-hidden="true" className="pointer-events-none">
      {/* NextLink is hidden but must be in the DOM for Hydrogen's router to work */}
      <span ref={linkRef} className="sr-only">
        {children}
      </span>

      {/* Loading indicator shown in place of the sentinel while fetching */}
      {isLoading && (
        <div className="flex justify-center py-8 text-white/40 text-sm uppercase tracking-widest">
          Loading...
        </div>
      )}
    </div>
  );
}