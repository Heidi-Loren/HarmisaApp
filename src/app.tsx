// src/app.tsx
import { PropsWithChildren } from "react";
import Taro from "@tarojs/taro";
import "./app.scss";

function App({ children }: PropsWithChildren<any>) {
  // 你的后端地址（Next.js）
  Taro.setStorageSync("API_BASE", "https://harmisa-app.vercel.app");
  return children;
}
export default App;
