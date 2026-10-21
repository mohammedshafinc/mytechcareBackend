import { Injectable } from '@nestjs/common';
import { SalesReportService } from '../sales-report/sales-report.service';

@Injectable()
export class AdminService {
  constructor(private readonly salesReportService: SalesReportService) {}

  /**
   * Returns dashboard data for the admin panel: financial metrics,
   * service requests, enquiries, trends, and recent activity.
   * Optional date range: startDate, endDate (YYYY-MM-DD).
   */
  async getDashboard(startDate?: string, endDate?: string) {
    const result = await this.salesReportService.getSalesDashboard(
      startDate,
      endDate,
    );

    const { data } = result;

    // Flat summary for KPI cards on the FE
    const summary = {
      totalRevenue: data.financial.totalRevenue,
      totalProfit: data.financial.totalProfit,
      totalBills: data.financial.totalBills,
      totalServiceRequests: data.serviceRequests.total,
      totalEnquiries: data.enquiries.total,
      averageBillValue: data.financial.averageBillValue,
      profitMargin: data.financial.profitMargin,
    };

    return {
      success: result.success,
      message: result.message,
      data: {
        ...data,
        summary,
      },
    };
  }
}
