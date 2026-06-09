import { useRef, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Search as SearchIcon } from 'lucide-react';
import { useAside } from '~/components/Aside';
import { useFetcher } from 'react-router';
import { Link } from 'react-router';
import type { PredictiveSearchReturn } from '~/lib/search';

/**
 * SearchOverlay - Premium, fixed position, stable dimensions
 */
export function SearchOverlay() {
  const { type: activeAside, close } = useAside();
  const isOpen = activeAside === 'search';
  const inputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher<PredictiveSearchReturn>({ key: 'search' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        close();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    fetcher.submit(
      { q: value, limit: 10, predictive: true },
      { method: 'GET', action: '/search' }
    );
  };

  const results = fetcher.data?.result?.items;
  const isLoading = fetcher.state === 'loading';
  const hasResults = results && (results.products?.length > 0 || results.collections?.length > 0);

  const luxuryEase = [0.22, 1, 0.36, 1];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.35,
            ease: luxuryEase,
          }}
          className="fixed inset-0 z-[1200]"
          onClick={close}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.35,
              ease: luxuryEase,
            }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Fixed Search Container - 25vh from top */}
          <div className="absolute left-1/2 top-[25vh] w-full -translate-x-1/2 -translate-y-0 px-4">
            <motion.div
              initial={{
                opacity: 0,
                y: 15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: 10,
              }}
              transition={{
                duration: 0.4,
                ease: luxuryEase,
              }}
              onClick={(e) => e.stopPropagation()}
              className="mx-auto w-full max-w-[500px]"
            >
              {/* Fixed dimension container */}
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/95 backdrop-blur-md shadow-2xl">
                {/* Header - Fixed height */}
                <div className="flex items-center gap-3 px-5 py-4 h-[60px]">
                  <SearchIcon
                    className="h-4 w-4 text-gray-400"
                    strokeWidth={1.5}
                  />

                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search"
                    className="
                      flex-1
                      bg-transparent
                      text-base
                      text-black
                      outline-none
                      placeholder:text-gray-400
                      font-light
                      tracking-wide
                    "
                    onChange={handleSearch}
                    autoComplete="off"
                  />

                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        fetcher.submit(
                          { q: '', limit: 10, predictive: true },
                          { method: 'GET', action: '/search' }
                        );
                        inputRef.current?.focus();
                      }}
                      className="text-gray-400 transition-opacity duration-300 hover:opacity-60"
                    >
                      <X size={16} strokeWidth={1.5} />
                    </button>
                  )}
                </div>

                {/* Results Area - Fixed height container */}
                <div className="border-t border-gray-100 min-h-[300px] max-h-[400px] overflow-y-auto">
                  {searchTerm.trim() ? (
                    <div className="p-2">
                      {isLoading && (
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="px-4 py-3">
                              <div className="mb-2 h-4 w-3/4 animate-pulse bg-gray-100" />
                              <div className="h-3 w-1/2 animate-pulse bg-gray-100" />
                            </div>
                          ))}
                        </div>
                      )}

                      {!isLoading && hasResults && (
                        <div>
                          {results.products?.length > 0 && (
                            <div>
                              {results.products.slice(0, 8).map((product) => (
                                <Link
                                  key={product.id}
                                  to={`/products/${product.handle}`}
                                  onClick={close}
                                  className="
                                    group
                                    block
                                    rounded-lg
                                    px-4
                                    py-3
                                    transition-all
                                    duration-300
                                    hover:bg-black/5
                                  "
                                >
                                  <p
                                    className="
                                      text-sm
                                      font-normal
                                      text-black
                                      transition-colors
                                      duration-300
                                      group-hover:text-gray-600
                                    "
                                  >
                                    {product.title}
                                  </p>

                                  <p
                                    className="
                                      mt-0.5
                                      text-xs
                                      text-gray-400
                                      font-mono
                                      transition-colors
                                      duration-300
                                      group-hover:text-gray-500
                                    "
                                  >
                                    /{product.handle}
                                  </p>
                                </Link>
                              ))}
                            </div>
                          )}

                          {results.collections?.length > 0 && (
                            <div className="mt-2 border-t border-gray-100 pt-2">
                              {results.collections.map((collection) => (
                                <Link
                                  key={collection.id}
                                  to={`/collections/${collection.handle}`}
                                  onClick={close}
                                  className="
                                    group
                                    block
                                    rounded-lg
                                    px-4
                                    py-3
                                    transition-all
                                    duration-300
                                    hover:bg-black/5
                                  "
                                >
                                  <p
                                    className="
                                      text-sm
                                      font-normal
                                      text-black
                                      transition-colors
                                      duration-300
                                      group-hover:text-gray-600
                                    "
                                  >
                                    {collection.title}
                                  </p>

                                  <p
                                    className="
                                      mt-0.5
                                      text-xs
                                      text-gray-400
                                      font-mono
                                      transition-colors
                                      duration-300
                                      group-hover:text-gray-500
                                    "
                                  >
                                    /collections/{collection.handle}
                                  </p>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {!isLoading && searchTerm && !hasResults && (
                        <div className="py-12 text-center">
                          <p className="text-sm text-gray-400">
                            No results found for "<span className="text-gray-500">{searchTerm}</span>"
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Empty state - same dimensions to prevent jumping */
                    <div className="h-[300px] flex items-center justify-center">
                      <p className="text-sm text-gray-400">
                        Type to search
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}