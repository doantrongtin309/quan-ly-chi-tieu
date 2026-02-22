
export enum Category {
  FOOD = "Ăn uống hằng ngày",
  HANG_OUT = "Đi chơi",
  SHOPPING = "Mua sắm",
  OTHER = "Khác"
}

export interface SpendingEntry {
  id: string;
  date: string;
  amount: number;
  category: Category;
  description: string;
  originalText?: string;
}

export interface SpendingSummary {
  dailyTotal: number;
  monthlyTotal: number;
  monthlyBudget: number;
  remainingBalance: number;
  byCategory: Record<Category, number>;
}
