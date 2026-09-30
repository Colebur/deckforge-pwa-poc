// Safari's media loader can ask for just a byte range, including while offline.
// Our short WAVs are cached in full; return the requested slice without a network fetch.
export async function mediaResponse(response: Response, range: string | null): Promise<Response> {
  if (!range) return response;
  const data = await response.arrayBuffer();
  const size = data.byteLength;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let start = 0, end = size - 1;
  if (!match || (!match[1] && !match[2])) return invalidRange(size);
  if (match[1]) {
    start = Number(match[1]);
    if (match[2]) end = Math.min(Number(match[2]), size - 1);
  } else {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return invalidRange(size);
    start = Math.max(0, size - suffix);
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start)
    return invalidRange(size);
  const headers = new Headers(response.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.delete('Content-Encoding');
  return new Response(data.slice(start, end + 1), {status: 206, headers});
}
function invalidRange(size: number): Response {
  return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${size}`}});
}
