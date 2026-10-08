import type { ExpenseCategory, PaymentMethod } from "@/lib/receipts/constants";

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food_and_dining: "Food & dining",
  groceries: "Groceries",
  transport: "Transport",
  shopping: "Shopping",
  bills_and_utilities: "Bills & utilities",
  entertainment: "Entertainment",
  health: "Health",
  travel: "Travel",
  other: "Other",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  net_banking: "Net banking",
  wallet: "Wallet",
  other: "Other",
};
