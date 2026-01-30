/**
 * Dashboard API response outline for GET /admin/dashboard
 *
 * Endpoint: GET /admin/dashboard
 * Auth: Bearer JWT, REPORTS module required
 * Query: startDate?, endDate? (YYYY-MM-DD)
 */

export interface DashboardDateRange {
  startDate: string | null;
  endDate: string | null;
}

/** Flat KPIs for dashboard cards */
export interface DashboardSummary {
  totalRevenue: number;
  totalProfit: number;
  totalBills: number;
  totalServiceRequests: number;
  totalEnquiries: number;
  averageBillValue: number;
  profitMargin: number;
}

export interface DashboardFinancial {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  averageBillValue: number;
  totalBills: number;
}

export interface DashboardServiceRequests {
  total: number;
  byStatus: Record<string, number>;
  byDevice: Record<string, number>;
}

export interface DashboardEnquiryBranch {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

export interface DashboardEnquiries {
  total: number;
  corporate: DashboardEnquiryBranch;
  b2c: DashboardEnquiryBranch;
}

export interface DashboardDailyRevenueItem {
  date: string;
  revenue: number;
  count: number;
}

export interface DashboardTrends {
  dailyRevenue: DashboardDailyRevenueItem[];
}

export interface DashboardRecentActivity {
  bills: Array<{
    id: number;
    userId: number | null;
    costPrice: number;
    sellingPrice: number;
    mobile: string | null;
    notes: string | null;
    name: string;
    createdAt: string;
  }>;
  serviceRequests: Array<{
    id: number;
    name: string;
    mobile: string;
    device: string;
    deviceDisplayName: string;
    status: string;
    location: string;
    createdAt: string;
    [key: string]: unknown;
  }>;
  enquiries: Array<{
    id: number;
    category: 'corporate' | 'b2c';
    createdAt: string;
    [key: string]: unknown;
  }>;
}

export interface DashboardData {
  summary: DashboardSummary;
  financial: DashboardFinancial;
  serviceRequests: DashboardServiceRequests;
  enquiries: DashboardEnquiries;
  trends: DashboardTrends;
  recentActivity: DashboardRecentActivity;
  dateRange: DashboardDateRange;
}

export interface DashboardResponse {
  success: boolean;
  message: string;
  data: DashboardData;
}
