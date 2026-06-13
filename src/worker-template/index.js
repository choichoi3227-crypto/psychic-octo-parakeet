export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/bridge.js') return new Response("window.CloudPressBridge={ready:true};", { headers: { 'content-type': 'application/javascript' } });
    if (url.pathname.startsWith('/wp-admin/database')) return html('CloudPress phpMyAdmin-compatible SQLite UI');
    if (url.pathname.startsWith('/wp-admin/files')) return html('CloudPress serverless file manager');
    if (url.pathname.startsWith('/wp-admin')) return html('CloudPress wp-admin');
    if (url.pathname.startsWith('/wp-content')) return new Response('Static file proxy placeholder', { headers: { 'cache-control': 'public, max-age=31536000' } });
    if (url.pathname.startsWith('/wp-json/wp/v2')) return Response.json({ name: 'CloudPress WP-compatible REST' });
    return html('CloudPress site');
  }
};
function html(title) { return new Response(`<!doctype html><h1>${title}</h1>`, { headers: { 'content-type': 'text/html;charset=utf-8' } }); }
