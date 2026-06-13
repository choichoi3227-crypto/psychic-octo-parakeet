export function streamProvisionLog(jobId: string) {
  const body = new ReadableStream({ start(controller) { const enc = new TextEncoder(); controller.enqueue(enc.encode(`event: ready\ndata: ${JSON.stringify({ jobId, status: 'connected' })}\n\n`)); controller.close(); } });
  return new Response(body, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } });
}
