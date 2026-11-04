export const programs = [
  'ระบบบัญชีแยกประเภท',
  'ระบบเงินรับฝาก',
  'ระบบสินค้า',
  'ระบบสมาชิกและหุ้น',
] as const;

export const categories = ['การเข้าใช้งาน', 'ข้อมูลและรายงาน', 'การติดตั้งโปรแกรม', 'การใช้งานทั่วไป'] as const;
export const requestTypeValues = ['issue', 'change'] as const;
export type RequestType = typeof requestTypeValues[number];
export const requestTypes: Record<RequestType, string> = {issue: 'แจ้งปัญหา', change: 'ขอแก้ไข'};
