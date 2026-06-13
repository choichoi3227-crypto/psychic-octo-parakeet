type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/public/provision-log/')) {
      return new Response('event: ready\ndata: {"status":"connected"}\n\n', {
        headers: {
          'cache-control': 'no-cache',
          'content-type': 'text/event-stream',
        },
      });
    }

    return response;
  },
};
