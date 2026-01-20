import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Bill } from './bill.entity';
import { ServiceRequest } from '../service-request/service-request.entity';
import { RepairItem } from '../repair-item/repair-item.entity';
import { CreateBillDto } from './dto/create-bill.dto';

@Injectable()
export class BillService {
  constructor(
    @InjectRepository(Bill)
    private billRepository: Repository<Bill>,
    @InjectRepository(ServiceRequest)
    private serviceRequestRepository: Repository<ServiceRequest>,
    @InjectRepository(RepairItem)
    private repairItemRepository: Repository<RepairItem>,
  ) {}

  async create(createBillDto: CreateBillDto) {
    // Use id if serviceRequestId is not provided (support both field names)
    const serviceRequestIdFromDto = createBillDto.serviceRequestId || createBillDto.id;
    
    if (!serviceRequestIdFromDto) {
      throw new BadRequestException('Service request ID is required (provide either "id" or "serviceRequestId")');
    }

    // Find the service request to get the name and use its id as user_id
    const serviceRequest = await this.serviceRequestRepository.findOne({
      where: { id: parseInt(serviceRequestIdFromDto) },
    });

    if (!serviceRequest) {
      throw new NotFoundException('Service request not found');
    }

    // Use service request id as user_id (as per requirement: user_id = service_request.id)
    const userId = serviceRequest.id;

    // Create the bill
    const bill = this.billRepository.create({
      userId: userId, // user_id is the id from service_requests table
      repairItemId: parseInt(createBillDto.repairItem),
      costPrice: parseFloat(createBillDto.costPrice),
      sellingPrice: parseFloat(createBillDto.customerPrice),
      quantity: parseInt(createBillDto.quantity),
      notes: createBillDto.notes || null,
      name: serviceRequest.name,
    });

    const savedBill = await this.billRepository.save(bill);

    return {
      success: true,
      message: 'Bill created successfully',
      data: savedBill,
    };
  }

  async findByUserId(userId: number) {
    const bills = await this.billRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // Fetch repair items and create a map for quick lookup
    const repairItemIds = [...new Set(bills.map(bill => bill.repairItemId))];
    
    let repairItemMap = new Map<number, string>();
    if (repairItemIds.length > 0) {
      const repairItems = await this.repairItemRepository.find({
        where: { id: In(repairItemIds) },
      });
      repairItemMap = new Map(repairItems.map(item => [item.id, item.name]));
    }

    // Map bills to include repair item name instead of repairItemId
    const billsWithRepairItemName = bills.map(bill => {
      const { repairItemId, ...billWithoutRepairItemId } = bill;
      return {
        ...billWithoutRepairItemId,
        repairItem: repairItemMap.get(repairItemId) || null,
      };
    });

    return {
      success: true,
      message: 'Bills fetched successfully',
      count: billsWithRepairItemName.length,
      data: billsWithRepairItemName,
    };
  }
}
