/**
 * /favicon.ico → 204 No Content
 * 用 Next.js Route Handler 接管，避免浏览器 404 噪音
 */
export const dynamic = "force-static";

export async function GET() {
  return new Response(null, { status: 204 });
}
