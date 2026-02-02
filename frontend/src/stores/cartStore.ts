import { create } from 'zustand';

export interface CartItem {
  id: string;
  productId: string;
  productVariantId: string;
  designId?: string;
  quantity: number;
  mockupUrl?: string;
  pricingSnapshot?: any;
  product?: any;
  productVariant?: any;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total: number;
}

export interface CartStore {
  cartId: string | null;
  cart: Cart | null;
  loading: boolean;
  setCart: (cart: Cart) => void;
  setCartId: (cartId: string) => void;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, updates: Partial<CartItem>) => void;
  clear: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  cartId: null,
  cart: null,
  loading: false,

  setCart: (cart) => set({ cart }),

  setCartId: (cartId) => set({ cartId }),

  addItem: (item) => {
    set((state) => {
      if (!state.cart) return state;

      const existing = state.cart.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          cart: {
            ...state.cart,
            items: state.cart.items.map((i) => (i.id === item.id ? item : i)),
          },
        };
      }

      return {
        cart: {
          ...state.cart,
          items: [...state.cart.items, item],
        },
      };
    });
  },

  removeItem: (itemId) => {
    set((state) => {
      if (!state.cart) return state;
      return {
        cart: {
          ...state.cart,
          items: state.cart.items.filter((i) => i.id !== itemId),
        },
      };
    });
  },

  updateItem: (itemId, updates) => {
    set((state) => {
      if (!state.cart) return state;
      return {
        cart: {
          ...state.cart,
          items: state.cart.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
        },
      };
    });
  },

  clear: () => set({ cart: null }),

  getTotal: () => {
    const { cart } = get();
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => {
      const price = item.pricingSnapshot?.totalPrice || 0;
      return sum + price;
    }, 0);
  },
}));
