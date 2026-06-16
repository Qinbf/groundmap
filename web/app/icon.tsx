import { ImageResponse } from "next/og";

// Next.js 约定：app/icon.tsx 自动出 favicon，无需 favicon.ico 文件。
// 设计：暗底白字 "G"（GroundMap），32×32 浏览器 tab 图标。
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 22,
          background: "#0f172a",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 700,
          letterSpacing: "-0.05em",
        }}
      >
        G
      </div>
    ),
    { ...size },
  );
}
