import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "CAD Support | ระบบแจ้งปัญหาการใช้งานโปรแกรม", description: "พื้นที่แจ้งปัญหา ติดตามสถานะ และจัดการการใช้งานโปรแกรมกรมตรวจบัญชีสหกรณ์", icons: {icon: "/favicon.svg"} };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="th"><body>{children}</body></html>; }