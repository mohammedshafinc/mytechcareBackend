import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Bill } from '../bill/bill.entity';
import { ServiceRequest } from '../service-request/service-request.entity';
import { CorporateEnquiry } from '../corporate-enquiry/corporate-enquiry.entity';
import { B2cEnquiry } from '../b2c-enquiry/b2c-enquiry.entity';

@Injectable()
export class SalesReportService {
  constructor(
    @InjectRepository(Bill)
    private billRepository: Repository<Bill>,
    @InjectRepository(ServiceRequest)
    private serviceRequestRepository: Repository<ServiceRequest>,
    @InjectRepository(CorporateEnquiry)
    private corporateEnquiryRepository: Repository<CorporateEnquiry>,
    @InjectRepository(B2cEnquiry)
    private b2cEnquiryRepository: Repository<B2cEnquiry>,
  ) {}

  async getSalesDashboard(startDate?: string, endDate?: string) {
    // Build date filter if provided
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Fetch all data in parallel
    const [
      bills,
      serviceRequests,
      corporateEnquiries,
      b2cEnquiries,
    ] = await Promise.all([
      this.billRepository.find({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        order: { createdAt: 'DESC' },
      }),
      this.serviceRequestRepository.find({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        order: { createdAt: 'DESC' },
      }),
      this.corporateEnquiryRepository.find({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        order: { createdAt: 'DESC' },
      }),
      this.b2cEnquiryRepository.find({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        order: { createdAt: 'DESC' },
      }),
    ]);

    // Calculate financial metrics
    const totalRevenue = bills.reduce((sum, bill) => sum + Number(bill.sellingPrice), 0);
    const totalCost = bills.reduce((sum, bill) => sum + Number(bill.costPrice), 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const averageBillValue = bills.length > 0 ? totalRevenue / bills.length : 0;

    // Service request metrics
    const serviceRequestStatusCounts = this.countByStatus(serviceRequests, 'status');
    const serviceRequestDeviceCounts = this.countByField(serviceRequests, 'device');

    // Enquiry metrics
    const corporateEnquiryStatusCounts = this.countByStatus(corporateEnquiries, 'status');
    const b2cEnquiryStatusCounts = this.countByStatus(b2cEnquiries, 'status');
    const corporateEnquiryTypeCounts = this.countByField(corporateEnquiries, 'enquiryType');
    const b2cEnquiryTypeCounts = this.countByField(b2cEnquiries, 'enquiryType');

    // Total enquiries
    const totalEnquiries = corporateEnquiries.length + b2cEnquiries.length;

    // Recent activity (last 10 items)
    const recentBills = bills.slice(0, 10);
    const recentServiceRequests = serviceRequests.slice(0, 10);
    const recentEnquiries = [
      ...corporateEnquiries.slice(0, 5).map(e => ({ ...e, category: 'corporate' })),
      ...b2cEnquiries.slice(0, 5).map(e => ({ ...e, category: 'b2c' })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Daily revenue trend (last 7 days)
    const dailyRevenue = this.calculateDailyRevenue(bills);

    return {
      success: true,
      message: 'Sales dashboard data retrieved successfully',
      data: {
        // Financial Overview
        financial: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalCost: Number(totalCost.toFixed(2)),
          totalProfit: Number(totalProfit.toFixed(2)),
          profitMargin: Number(profitMargin.toFixed(2)),
          averageBillValue: Number(averageBillValue.toFixed(2)),
          totalBills: bills.length,
        },
        // Service Requests
        serviceRequests: {
          total: serviceRequests.length,
          byStatus: serviceRequestStatusCounts,
          byDevice: serviceRequestDeviceCounts,
        },
        // Enquiries
        enquiries: {
          total: totalEnquiries,
          corporate: {
            total: corporateEnquiries.length,
            byStatus: corporateEnquiryStatusCounts,
            byType: corporateEnquiryTypeCounts,
          },
          b2c: {
            total: b2cEnquiries.length,
            byStatus: b2cEnquiryStatusCounts,
            byType: b2cEnquiryTypeCounts,
          },
        },
        // Trends
        trends: {
          dailyRevenue: dailyRevenue,
        },
        // Recent Activity
        recentActivity: {
          bills: recentBills,
          serviceRequests: recentServiceRequests,
          enquiries: recentEnquiries,
        },
        // Date Range
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
    };
  }

  private buildDateFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return undefined;

    const start = startDate ? new Date(startDate) : new Date('1970-01-01');
    const end = endDate ? new Date(endDate) : new Date();

    // Set time to start/end of day
    if (startDate) {
      start.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      end.setHours(23, 59, 59, 999);
    }

    return Between(start, end);
  }

  private countByStatus(items: any[], statusField: string): Record<string, number> {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const status = item[statusField] || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }

  private countByField(items: any[], field: string): Record<string, number> {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const value = item[field] || 'Unknown';
      counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
  }

  private calculateDailyRevenue(bills: Bill[]): Array<{ date: string; revenue: number; count: number }> {
    const last7Days: Array<{ date: string; revenue: number; count: number }> = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayBills = bills.filter(bill => {
        const billDate = new Date(bill.createdAt);
        return billDate >= date && billDate < nextDate;
      });

      const dayRevenue = dayBills.reduce((sum, bill) => sum + Number(bill.sellingPrice), 0);

      last7Days.push({
        date: date.toISOString().split('T')[0],
        revenue: Number(dayRevenue.toFixed(2)),
        count: dayBills.length,
      });
    }

    return last7Days;
  }

  async getFinancialReport(startDate?: string, endDate?: string) {
    // Build date filter if provided
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Fetch bills
    const bills = await this.billRepository.find({
      where: dateFilter ? { createdAt: dateFilter } : undefined,
      order: { createdAt: 'DESC' },
    });

    // Calculate financial metrics
    const totalRevenue = bills.reduce((sum, bill) => sum + Number(bill.sellingPrice), 0);
    const totalCost = bills.reduce((sum, bill) => sum + Number(bill.costPrice), 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const averageBillValue = bills.length > 0 ? totalRevenue / bills.length : 0;
    const averageCost = bills.length > 0 ? totalCost / bills.length : 0;
    const averageProfit = bills.length > 0 ? totalProfit / bills.length : 0;

    // Calculate profit per bill
    const billsWithProfit = bills.map(bill => {
      const revenue = Number(bill.sellingPrice);
      const cost = Number(bill.costPrice);
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return {
        ...bill,
        profit: Number(profit.toFixed(2)),
        profitMargin: Number(margin.toFixed(2)),
      };
    });

    // Top bills by revenue
    const topBillsByRevenue = [...billsWithProfit]
      .sort((a, b) => Number(b.sellingPrice) - Number(a.sellingPrice))
      .slice(0, 10);

    // Top bills by profit
    const topBillsByProfit = [...billsWithProfit]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    // Revenue by customer (group by mobile/name)
    const revenueByCustomer = this.calculateRevenueByCustomer(bills);

    // Daily revenue breakdown
    const dailyRevenue = this.calculateDailyRevenue(bills);

    // Weekly revenue breakdown
    const weeklyRevenue = this.calculateWeeklyRevenue(bills);

    // Monthly revenue breakdown
    const monthlyRevenue = this.calculateMonthlyRevenue(bills);

    // Revenue distribution (by profit margin ranges)
    const revenueDistribution = this.calculateRevenueDistribution(billsWithProfit);

    return {
      success: true,
      message: 'Financial report retrieved successfully',
      data: {
        // Summary Metrics
        summary: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalCost: Number(totalCost.toFixed(2)),
          totalProfit: Number(totalProfit.toFixed(2)),
          profitMargin: Number(profitMargin.toFixed(2)),
          averageBillValue: Number(averageBillValue.toFixed(2)),
          averageCost: Number(averageCost.toFixed(2)),
          averageProfit: Number(averageProfit.toFixed(2)),
          totalBills: bills.length,
        },
        // Revenue Breakdown
        revenueBreakdown: {
          daily: dailyRevenue,
          weekly: weeklyRevenue,
          monthly: monthlyRevenue,
        },
        // Top Performers
        topPerformers: {
          byRevenue: topBillsByRevenue,
          byProfit: topBillsByProfit,
          byCustomer: revenueByCustomer.slice(0, 10),
        },
        // Revenue Distribution
        revenueDistribution: revenueDistribution,
        // All Bills with Profit Details
        allBills: billsWithProfit,
        // Date Range
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
    };
  }

  private calculateRevenueByCustomer(bills: Bill[]): Array<{ customer: string; mobile: string; revenue: number; cost: number; profit: number; billCount: number }> {
    const customerMap = new Map<string, { customer: string; mobile: string; revenue: number; cost: number; billCount: number }>();

    bills.forEach(bill => {
      const key = bill.mobile || bill.name || 'Unknown';
      const existing = customerMap.get(key) || {
        customer: bill.name || 'Unknown',
        mobile: bill.mobile || 'N/A',
        revenue: 0,
        cost: 0,
        billCount: 0,
      };

      existing.revenue += Number(bill.sellingPrice);
      existing.cost += Number(bill.costPrice);
      existing.billCount += 1;

      customerMap.set(key, existing);
    });

    return Array.from(customerMap.values())
      .map(customer => ({
        ...customer,
        revenue: Number(customer.revenue.toFixed(2)),
        cost: Number(customer.cost.toFixed(2)),
        profit: Number((customer.revenue - customer.cost).toFixed(2)),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private calculateWeeklyRevenue(bills: Bill[]): Array<{ week: string; revenue: number; cost: number; profit: number; count: number }> {
    const weeklyMap = new Map<string, { revenue: number; cost: number; count: number }>();

    bills.forEach(bill => {
      const billDate = new Date(bill.createdAt);
      const weekStart = new Date(billDate);
      weekStart.setDate(billDate.getDate() - billDate.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);

      const weekKey = weekStart.toISOString().split('T')[0];
      const existing = weeklyMap.get(weekKey) || { revenue: 0, cost: 0, count: 0 };

      existing.revenue += Number(bill.sellingPrice);
      existing.cost += Number(bill.costPrice);
      existing.count += 1;

      weeklyMap.set(weekKey, existing);
    });

    return Array.from(weeklyMap.entries())
      .map(([week, data]) => ({
        week,
        revenue: Number(data.revenue.toFixed(2)),
        cost: Number(data.cost.toFixed(2)),
        profit: Number((data.revenue - data.cost).toFixed(2)),
        count: data.count,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  private calculateMonthlyRevenue(bills: Bill[]): Array<{ month: string; revenue: number; cost: number; profit: number; count: number }> {
    const monthlyMap = new Map<string, { revenue: number; cost: number; count: number }>();

    bills.forEach(bill => {
      const billDate = new Date(bill.createdAt);
      const monthKey = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyMap.get(monthKey) || { revenue: 0, cost: 0, count: 0 };

      existing.revenue += Number(bill.sellingPrice);
      existing.cost += Number(bill.costPrice);
      existing.count += 1;

      monthlyMap.set(monthKey, existing);
    });

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        revenue: Number(data.revenue.toFixed(2)),
        cost: Number(data.cost.toFixed(2)),
        profit: Number((data.revenue - data.cost).toFixed(2)),
        count: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private calculateRevenueDistribution(billsWithProfit: Array<Bill & { profit: number; profitMargin: number }>): {
    highMargin: { count: number; revenue: number; profit: number };
    mediumMargin: { count: number; revenue: number; profit: number };
    lowMargin: { count: number; revenue: number; profit: number };
    negativeMargin: { count: number; revenue: number; profit: number };
  } {
    const distribution = {
      highMargin: { count: 0, revenue: 0, profit: 0 }, // > 50%
      mediumMargin: { count: 0, revenue: 0, profit: 0 }, // 20-50%
      lowMargin: { count: 0, revenue: 0, profit: 0 }, // 0-20%
      negativeMargin: { count: 0, revenue: 0, profit: 0 }, // < 0%
    };

    billsWithProfit.forEach(bill => {
      const revenue = Number(bill.sellingPrice);
      const profit = bill.profit;
      const margin = bill.profitMargin;

      if (margin > 50) {
        distribution.highMargin.count += 1;
        distribution.highMargin.revenue += revenue;
        distribution.highMargin.profit += profit;
      } else if (margin >= 20) {
        distribution.mediumMargin.count += 1;
        distribution.mediumMargin.revenue += revenue;
        distribution.mediumMargin.profit += profit;
      } else if (margin >= 0) {
        distribution.lowMargin.count += 1;
        distribution.lowMargin.revenue += revenue;
        distribution.lowMargin.profit += profit;
      } else {
        distribution.negativeMargin.count += 1;
        distribution.negativeMargin.revenue += revenue;
        distribution.negativeMargin.profit += profit;
      }
    });

    // Round all values
    Object.keys(distribution).forEach(key => {
      const item = distribution[key];
      item.revenue = Number(item.revenue.toFixed(2));
      item.profit = Number(item.profit.toFixed(2));
    });

    return distribution;
  }

  async getServiceReport(startDate?: string, endDate?: string) {
    // Build date filter if provided
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Fetch all data in parallel
    const [
      serviceRequests,
      corporateEnquiries,
      b2cEnquiries,
      bills,
    ] = await Promise.all([
      this.serviceRequestRepository.find({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        order: { createdAt: 'DESC' },
      }),
      this.corporateEnquiryRepository.find({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        order: { createdAt: 'DESC' },
      }),
      this.b2cEnquiryRepository.find({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        order: { createdAt: 'DESC' },
      }),
      this.billRepository.find({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        order: { createdAt: 'DESC' },
      }),
    ]);

    // Service Request Metrics
    const serviceRequestStatusCounts = this.countByStatus(serviceRequests, 'status');
    const serviceRequestDeviceCounts = this.countByField(serviceRequests, 'device');
    const serviceRequestDeviceDisplayCounts = this.countByField(serviceRequests, 'deviceDisplayName');
    const serviceRequestLocationTypeCounts = this.countByField(serviceRequests, 'locationType');
    const serviceRequestLanguageCounts = this.countByField(serviceRequests, 'language');
    const serviceRequestLocationCounts = this.countByField(serviceRequests, 'location');

    // Enquiry Metrics
    const totalEnquiries = corporateEnquiries.length + b2cEnquiries.length;
    const corporateEnquiryStatusCounts = this.countByStatus(corporateEnquiries, 'status');
    const b2cEnquiryStatusCounts = this.countByStatus(b2cEnquiries, 'status');
    const corporateEnquiryTypeCounts = this.countByField(corporateEnquiries, 'enquiryType');
    const b2cEnquiryTypeCounts = this.countByField(b2cEnquiries, 'enquiryType');
    const corporateEnquiryLocationCounts = this.countByField(corporateEnquiries, 'location');
    const b2cEnquiryLocationCounts = this.countByField(b2cEnquiries, 'location');

    // Conversion Metrics
    const totalServiceRequests = serviceRequests.length;
    const totalBills = bills.length;
    const conversionRateToBills = totalServiceRequests > 0 
      ? (totalBills / totalServiceRequests) * 100 
      : 0;
    const conversionRateFromEnquiries = totalEnquiries > 0
      ? (totalServiceRequests / totalEnquiries) * 100
      : 0;

    // Daily service request trends
    const dailyServiceRequests = this.calculateDailyServiceRequests(serviceRequests);

    // Weekly service request trends
    const weeklyServiceRequests = this.calculateWeeklyServiceRequests(serviceRequests);

    // Monthly service request trends
    const monthlyServiceRequests = this.calculateMonthlyServiceRequests(serviceRequests);

    // Top locations for service requests
    const topServiceRequestLocations = this.getTopItems(serviceRequestLocationCounts, 10);

    // Top devices for service requests
    const topDevices = this.getTopItems(serviceRequestDeviceCounts, 10);

    // Recent service requests
    const recentServiceRequests = serviceRequests.slice(0, 20);

    // Service requests by hour (peak hours analysis)
    const serviceRequestsByHour = this.calculateServiceRequestsByHour(serviceRequests);

    return {
      success: true,
      message: 'Service report retrieved successfully',
      data: {
        // Service Request Overview
        serviceRequests: {
          total: totalServiceRequests,
          byStatus: serviceRequestStatusCounts,
          byDevice: serviceRequestDeviceCounts,
          byDeviceDisplay: serviceRequestDeviceDisplayCounts,
          byLocationType: serviceRequestLocationTypeCounts,
          byLanguage: serviceRequestLanguageCounts,
          byLocation: serviceRequestLocationCounts,
        },
        // Enquiry Overview
        enquiries: {
          total: totalEnquiries,
          corporate: {
            total: corporateEnquiries.length,
            byStatus: corporateEnquiryStatusCounts,
            byType: corporateEnquiryTypeCounts,
            byLocation: corporateEnquiryLocationCounts,
          },
          b2c: {
            total: b2cEnquiries.length,
            byStatus: b2cEnquiryStatusCounts,
            byType: b2cEnquiryTypeCounts,
            byLocation: b2cEnquiryLocationCounts,
          },
        },
        // Conversion Rates
        conversionRates: {
          enquiriesToServiceRequests: Number(conversionRateFromEnquiries.toFixed(2)),
          serviceRequestsToBills: Number(conversionRateToBills.toFixed(2)),
          totalEnquiries: totalEnquiries,
          totalServiceRequests: totalServiceRequests,
          totalBills: totalBills,
        },
        // Trends
        trends: {
          daily: dailyServiceRequests,
          weekly: weeklyServiceRequests,
          monthly: monthlyServiceRequests,
          byHour: serviceRequestsByHour,
        },
        // Top Analytics
        topAnalytics: {
          locations: topServiceRequestLocations,
          devices: topDevices,
        },
        // Recent Activity
        recentServiceRequests: recentServiceRequests,
        // Date Range
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
    };
  }

  private calculateDailyServiceRequests(serviceRequests: ServiceRequest[]): Array<{ date: string; count: number }> {
    const dailyMap = new Map<string, number>();

    serviceRequests.forEach(request => {
      const requestDate = new Date(request.createdAt);
      const dateKey = requestDate.toISOString().split('T')[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
    });

    return Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateWeeklyServiceRequests(serviceRequests: ServiceRequest[]): Array<{ week: string; count: number }> {
    const weeklyMap = new Map<string, number>();

    serviceRequests.forEach(request => {
      const requestDate = new Date(request.createdAt);
      const weekStart = new Date(requestDate);
      weekStart.setDate(requestDate.getDate() - requestDate.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1);
    });

    return Array.from(weeklyMap.entries())
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  private calculateMonthlyServiceRequests(serviceRequests: ServiceRequest[]): Array<{ month: string; count: number }> {
    const monthlyMap = new Map<string, number>();

    serviceRequests.forEach(request => {
      const requestDate = new Date(request.createdAt);
      const monthKey = `${requestDate.getFullYear()}-${String(requestDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
    });

    return Array.from(monthlyMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private calculateServiceRequestsByHour(serviceRequests: ServiceRequest[]): Array<{ hour: number; count: number }> {
    const hourMap = new Map<number, number>();

    serviceRequests.forEach(request => {
      const requestDate = new Date(request.createdAt);
      const hour = requestDate.getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });

    // Create array for all 24 hours
    const hoursArray: Array<{ hour: number; count: number }> = [];
    for (let i = 0; i < 24; i++) {
      hoursArray.push({
        hour: i,
        count: hourMap.get(i) || 0,
      });
    }

    return hoursArray;
  }

  private getTopItems(counts: Record<string, number>, limit: number): Array<{ name: string; count: number }> {
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getCustomerReport(startDate?: string, endDate?: string) {
    // Build date filter if provided
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Fetch all data in parallel
    const [
      bills,
      serviceRequests,
      corporateEnquiries,
      b2cEnquiries,
    ] = await Promise.all([
      this.billRepository.find({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        order: { createdAt: 'DESC' },
      }),
      this.serviceRequestRepository.find({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        order: { createdAt: 'DESC' },
      }),
      this.corporateEnquiryRepository.find({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        order: { createdAt: 'DESC' },
      }),
      this.b2cEnquiryRepository.find({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        order: { createdAt: 'DESC' },
      }),
    ]);

    // Build customer database from all sources
    const customerMap = new Map<string, {
      name: string;
      mobile: string;
      bills: Bill[];
      serviceRequests: ServiceRequest[];
      enquiries: Array<CorporateEnquiry | B2cEnquiry & { category: string }>;
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
      billCount: number;
      serviceRequestCount: number;
      enquiryCount: number;
      locations: Set<string>;
      firstInteraction: Date | null;
      lastInteraction: Date | null;
    }>();

    // Process bills
    bills.forEach(bill => {
      const key = bill.mobile || bill.name || 'unknown';
      let existing = customerMap.get(key);
      if (!existing) {
        existing = this.createCustomerRecord(bill.name || 'Unknown', bill.mobile || 'N/A');
        customerMap.set(key, existing);
      }
      
      existing.bills.push(bill);
      existing.totalRevenue += Number(bill.sellingPrice);
      existing.totalCost += Number(bill.costPrice);
      existing.totalProfit += (Number(bill.sellingPrice) - Number(bill.costPrice));
      existing.billCount += 1;
      
      const billDate = new Date(bill.createdAt);
      if (!existing.firstInteraction || billDate < existing.firstInteraction) {
        existing.firstInteraction = billDate;
      }
      if (!existing.lastInteraction || billDate > existing.lastInteraction) {
        existing.lastInteraction = billDate;
      }
    });

    // Process service requests
    serviceRequests.forEach(request => {
      const key = request.mobile || request.name || 'unknown';
      let existing = customerMap.get(key);
      if (!existing) {
        existing = this.createCustomerRecord(request.name || 'Unknown', request.mobile || 'N/A');
        customerMap.set(key, existing);
      }
      
      existing.serviceRequests.push(request);
      existing.serviceRequestCount += 1;
      if (request.location) {
        existing.locations.add(request.location);
      }
      
      const requestDate = new Date(request.createdAt);
      if (!existing.firstInteraction || requestDate < existing.firstInteraction) {
        existing.firstInteraction = requestDate;
      }
      if (!existing.lastInteraction || requestDate > existing.lastInteraction) {
        existing.lastInteraction = requestDate;
      }
    });

    // Process corporate enquiries
    corporateEnquiries.forEach(enquiry => {
      const key = enquiry.mobileNumber || enquiry.corporateName || 'unknown';
      let existing = customerMap.get(key);
      if (!existing) {
        existing = this.createCustomerRecord(enquiry.corporateName || 'Unknown', enquiry.mobileNumber || 'N/A');
        customerMap.set(key, existing);
      }
      
      existing.enquiries.push({ ...enquiry, category: 'corporate' });
      existing.enquiryCount += 1;
      if (enquiry.location) {
        existing.locations.add(enquiry.location);
      }
      
      const enquiryDate = new Date(enquiry.createdAt);
      if (!existing.firstInteraction || enquiryDate < existing.firstInteraction) {
        existing.firstInteraction = enquiryDate;
      }
      if (!existing.lastInteraction || enquiryDate > existing.lastInteraction) {
        existing.lastInteraction = enquiryDate;
      }
    });

    // Process B2C enquiries
    b2cEnquiries.forEach(enquiry => {
      const key = enquiry.mobileNumber || enquiry.customerName || 'unknown';
      let existing = customerMap.get(key);
      if (!existing) {
        existing = this.createCustomerRecord(enquiry.customerName || 'Unknown', enquiry.mobileNumber || 'N/A');
        customerMap.set(key, existing);
      }
      
      existing.enquiries.push({ ...enquiry, category: 'b2c' });
      existing.enquiryCount += 1;
      if (enquiry.location) {
        existing.locations.add(enquiry.location);
      }
      
      const enquiryDate = new Date(enquiry.createdAt);
      if (!existing.firstInteraction || enquiryDate < existing.firstInteraction) {
        existing.firstInteraction = enquiryDate;
      }
      if (!existing.lastInteraction || enquiryDate > existing.lastInteraction) {
        existing.lastInteraction = enquiryDate;
      }
    });

    // Convert to array and calculate metrics
    const customers: Array<{
      name: string;
      mobile: string;
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
      billCount: number;
      serviceRequestCount: number;
      enquiryCount: number;
      totalInteractions: number;
      locations: string[];
      firstInteraction: Date | null;
      lastInteraction: Date | null;
      isRepeatCustomer: boolean;
      averageBillValue: number;
    }> = Array.from(customerMap.values()).map(customer => ({
      name: customer.name,
      mobile: customer.mobile,
      totalRevenue: Number(customer.totalRevenue.toFixed(2)),
      totalCost: Number(customer.totalCost.toFixed(2)),
      totalProfit: Number(customer.totalProfit.toFixed(2)),
      billCount: customer.billCount,
      serviceRequestCount: customer.serviceRequestCount,
      enquiryCount: customer.enquiryCount,
      totalInteractions: customer.billCount + customer.serviceRequestCount + customer.enquiryCount,
      locations: Array.from(customer.locations),
      firstInteraction: customer.firstInteraction,
      lastInteraction: customer.lastInteraction,
      isRepeatCustomer: customer.billCount > 1 || customer.serviceRequestCount > 1 || customer.enquiryCount > 1,
      averageBillValue: customer.billCount > 0 ? Number((customer.totalRevenue / customer.billCount).toFixed(2)) : 0,
    }));

    // Customer metrics
    const totalCustomers = customers.length;
    const repeatCustomers = customers.filter(c => c.isRepeatCustomer).length;
    const newCustomers = totalCustomers - repeatCustomers;
    const customersWithBills = customers.filter(c => c.billCount > 0).length;
    const customersWithServiceRequests = customers.filter(c => c.serviceRequestCount > 0).length;
    const customersWithEnquiries = customers.filter(c => c.enquiryCount > 0).length;

    // Top customers
    const topCustomersByRevenue = [...customers]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 20);

    const topCustomersByInteractions = [...customers]
      .sort((a, b) => b.totalInteractions - a.totalInteractions)
      .slice(0, 20);

    const topCustomersByProfit = [...customers]
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 20);

    // Customer segmentation
    const customerSegmentation = {
      highValue: customers.filter(c => c.totalRevenue >= 10000).length, // >= 10,000
      mediumValue: customers.filter(c => c.totalRevenue >= 5000 && c.totalRevenue < 10000).length, // 5,000 - 9,999
      lowValue: customers.filter(c => c.totalRevenue > 0 && c.totalRevenue < 5000).length, // 1 - 4,999
      noPurchase: customers.filter(c => c.totalRevenue === 0).length, // 0
    };

    // Customer by location
    const customerByLocation = this.calculateCustomerByLocation(customers);

    // Customer engagement trends (daily new customers)
    const dailyNewCustomers = this.calculateDailyNewCustomers(customers);

    // Average customer metrics
    const averageRevenuePerCustomer = totalCustomers > 0 
      ? Number((customers.reduce((sum, c) => sum + c.totalRevenue, 0) / totalCustomers).toFixed(2))
      : 0;
    const averageInteractionsPerCustomer = totalCustomers > 0
      ? Number((customers.reduce((sum, c) => sum + c.totalInteractions, 0) / totalCustomers).toFixed(2))
      : 0;

    return {
      success: true,
      message: 'Customer report retrieved successfully',
      data: {
        // Customer Overview
        overview: {
          totalCustomers: totalCustomers,
          repeatCustomers: repeatCustomers,
          newCustomers: newCustomers,
          customersWithBills: customersWithBills,
          customersWithServiceRequests: customersWithServiceRequests,
          customersWithEnquiries: customersWithEnquiries,
          averageRevenuePerCustomer: averageRevenuePerCustomer,
          averageInteractionsPerCustomer: averageInteractionsPerCustomer,
        },
        // Customer Segmentation
        segmentation: customerSegmentation,
        // Top Customers
        topCustomers: {
          byRevenue: topCustomersByRevenue,
          byInteractions: topCustomersByInteractions,
          byProfit: topCustomersByProfit,
        },
        // Customer by Location
        byLocation: customerByLocation,
        // Trends
        trends: {
          dailyNewCustomers: dailyNewCustomers,
        },
        // All Customers
        allCustomers: customers,
        // Date Range
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
    };
  }

  private createCustomerRecord(name: string, mobile: string) {
    return {
      name,
      mobile,
      bills: [] as Bill[],
      serviceRequests: [] as ServiceRequest[],
      enquiries: [] as Array<CorporateEnquiry | B2cEnquiry & { category: string }>,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      billCount: 0,
      serviceRequestCount: 0,
      enquiryCount: 0,
      locations: new Set<string>(),
      firstInteraction: null as Date | null,
      lastInteraction: null as Date | null,
    };
  }

  private calculateCustomerByLocation(customers: Array<{ locations: string[] }>): Array<{ location: string; customerCount: number }> {
    const locationMap = new Map<string, number>();

    customers.forEach(customer => {
      customer.locations.forEach(location => {
        if (location) {
          locationMap.set(location, (locationMap.get(location) || 0) + 1);
        }
      });
    });

    return Array.from(locationMap.entries())
      .map(([location, customerCount]) => ({ location, customerCount }))
      .sort((a, b) => b.customerCount - a.customerCount);
  }

  private calculateDailyNewCustomers(customers: Array<{ firstInteraction: Date | null }>): Array<{ date: string; count: number }> {
    const dailyMap = new Map<string, number>();

    customers.forEach(customer => {
      if (customer.firstInteraction) {
        const dateKey = customer.firstInteraction.toISOString().split('T')[0];
        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
      }
    });

    return Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
