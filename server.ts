import * as serverBuild from 'virtual:react-router/server-build';
import {createRequestHandler, storefrontRedirect} from '@shopify/hydrogen';
import {createHydrogenRouterContext} from '~/lib/context';

/**
 * Export a fetch handler in module format.
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    try {
      const hydrogenContext = await createHydrogenRouterContext(
        request,
        env,
        executionContext,
      );

      /**
       * Create a Hydrogen request handler that internally
       * delegates to React Router for routing and rendering.
       */
      const handleRequest = createRequestHandler({
        build: serverBuild,
        mode: process.env.NODE_ENV,
        getLoadContext: () => hydrogenContext,
      });

      const response = await handleRequest(request);

      // Add CSP headers to allow Unsplash images
      const cspDirectives = [
        "default-src 'self' https://cdn.shopify.com https://shopify.com http://localhost:*",
        "img-src 'self' https://cdn.shopify.com https://shopify.com https://images.unsplash.com data: blob:",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://shopify.com",
        "style-src 'self' 'unsafe-inline' https://cdn.shopify.com",
        "font-src 'self' data: https://cdn.shopify.com",
        "connect-src 'self' https://cdn.shopify.com https://shopify.com ws://localhost:*",
      ];

      response.headers.set(
        'Content-Security-Policy',
        cspDirectives.join('; ')
      );

      if (hydrogenContext.session.isPending) {
        response.headers.set(
          'Set-Cookie',
          await hydrogenContext.session.commit(),
        );
      }

      if (response.status === 404) {
        /**
         * Check for redirects only when there's a 404 from the app.
         * If the redirect doesn't exist, then `storefrontRedirect`
         * will pass through the 404 response.
         */
        return storefrontRedirect({
          request,
          response,
          storefront: hydrogenContext.storefront,
        });
      }

      return response;
    } catch (error) {
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};