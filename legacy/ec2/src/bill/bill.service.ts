import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bill } from './bill.entity';
import { ServiceRequest } from '../service-request/service-request.entity';
import { CreateBillDto } from './dto/create-bill.dto';

@Injectable()
export class BillService {
  constructor(
    @InjectRepository(Bill)
    private billRepository: Repository<Bill>,
    @InjectRepository(ServiceRequest)
    private serviceRequestRepository: Repository<ServiceRequest>,
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

    // Use mobile from DTO if provided, otherwise use mobile from service request
    const mobile = createBillDto.mobile || serviceRequest.mobile || null;

    // Create the bill
    const bill = this.billRepository.create({
      userId: userId, // user_id is the id from service_requests table
      costPrice: parseFloat(createBillDto.costPrice),
      sellingPrice: parseFloat(createBillDto.customerPrice),
      mobile: mobile,
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

  async findByMobile(mobile: string) {
    const bills = await this.billRepository.find({
      where: { mobile },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      message: 'Bills fetched successfully',
      count: bills.length,
      data: bills,
    };
  }

  async findByUserId(userId: number) {
    const bills = await this.billRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      message: 'Bills fetched successfully',
      count: bills.length,
      data: bills,
    };
  }
}
