export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  challenges: string[];
  createdAt: string;
  updatedAt: string;
  isAdmin?: boolean;
}

export interface Challenge {
  id: string;
  userId: string;
  type: 'standard' | 'swing' | 'news';
  accountSize: number;
  amount: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  paymentStatus: 'pending' | 'paid' | 'failed';
  rules: {
    profitTarget: number;
    maxDailyDrawdown: number;
    maxOverallDrawdown: number;
    phase1Duration: number;
    phase2Duration: number;
    overnightHolding?: boolean;
    newsTrading?: boolean;
  };
  metrics: {
    currentDrawdown: number;
    maxDailyDrawdown: number;
    totalProfit: number;
    tradingDays: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  challengeId?: string;
  amount: number;
  paymentIntentId: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}
