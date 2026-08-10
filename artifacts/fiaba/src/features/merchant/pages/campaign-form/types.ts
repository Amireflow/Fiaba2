export type ProductOption = { id: string; name: string; price: number };

export type FormState = {
  name: string;
  description: string;
  commission: string;
  commissionType: 'percentage' | 'fixed';
  goal: string;
  productId: string;
  endDate: string;
};

export const emptyForm: FormState = {
  name: '',
  description: '',
  commission: '10',
  commissionType: 'percentage',
  goal: '50',
  productId: '',
  endDate: '',
};
