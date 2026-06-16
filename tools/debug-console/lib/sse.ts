/**
 * SSE 小工具——服务端写流、客户端读流
 */

/** 构造一条 SSE 行：`data: <json>\n\n` */
export function sseLine(obj: unknown): Uint8Array {
  const json = JSON.stringify(obj);
  return new TextEncoder().encode(`data: ${json}\n\n`);
}

/** 心跳行（客户端可忽略）—— 防止反向代理空闲断连 */
export function sseHeartbeat(): Uint8Array {
  return new TextEncoder().encode(`: heartbeat\n\n`);
}
