import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceRequest } from './service-request.entity';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto';
import { AdminGateway } from '../admin/admin.gateway';

@Injectable()
export class ServiceRequestService {
  constructor(
    @InjectRepository(ServiceRequest)
    private serviceRequestRepository: Repository<ServiceRequest>,
    private readonly adminGateway: AdminGateway,
  ) {}

  async create(createServiceRequestDto: CreateServiceRequestDto) {
    const serviceRequest = this.serviceRequestRepository.create({
      name: createServiceRequestDto.name,
      mobile: createServiceRequestDto.mobile,
      device: createServiceRequestDto.device,
      deviceDisplayName: createServiceRequestDto.deviceDisplayName,
      otherDevice: createServiceRequestDto.otherDevice,
      locationType: createServiceRequestDto.locationType,
      location: createServiceRequestDto.location,
      currentLocation: createServiceRequestDto.currentLocation,
      manualLocation: createServiceRequestDto.manualLocation,
      description: createServiceRequestDto.description,
      language: createServiceRequestDto.language,
      dateTime: createServiceRequestDto.dateTime,
      timestamp: new Date(createServiceRequestDto.timestamp),
      status: createServiceRequestDto.status || 'Request received',
    });

    const savedRequest = await this.serviceRequestRepository.save(serviceRequest);

    // 🔥 Notify admin instantly
    this.adminGateway.notifyNewRequest({
      id: savedRequest.id,
      name: savedRequest.name,
      createdAt: savedRequest.createdAt,
    });

    return {
      success: true,
      message: 'Service request created successfully',
      data: {
        id: savedRequest.id,
        name: savedRequest.name,
        mobile: savedRequest.mobile,
        device: savedRequest.device,
        deviceDisplayName: savedRequest.deviceDisplayName,
        location: savedRequest.location,
        description: savedRequest.description,
        status: savedRequest.status,
        timestamp: savedRequest.timestamp,
        createdAt: savedRequest.createdAt,
      },
    };
  }

  async findAll() {
    const serviceRequests = await this.serviceRequestRepository.find({
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      message: 'Service requests fetched successfully',
      count: serviceRequests.length,
      data: serviceRequests,
    };
  }

  async update(id: number, updateDto: UpdateServiceRequestDto): Promise<ServiceRequest> {
    // Find the service request
    const serviceRequest = await this.serviceRequestRepository.findOne({
      where: { id },
    });

    if (!serviceRequest) {
      throw new NotFoundException('Service request not found');
    }

    // Update only the provided fields
    Object.assign(serviceRequest, updateDto);

    // Save the updated service request
    const updatedRequest = await this.serviceRequestRepository.save(serviceRequest);

    return updatedRequest;
  }

  async remove(id: number): Promise<{ message: string }> {
    const serviceRequest = await this.serviceRequestRepository.findOne({
      where: { id },
    });

    if (!serviceRequest) {
      throw new NotFoundException('Service request not found');
    }

    await this.serviceRequestRepository.remove(serviceRequest);

    return { message: 'Service request deleted successfully' };
  }

  /**
   * Find all service requests for a given mobile number (client-side).
   * Returns id, status, name, device only.
   */
  async findByMobile(mobile: string): Promise<{ id: number; status: string; name: string; device: string }[]> {
    const requests = await this.serviceRequestRepository.find({
      where: { mobile },
      order: { createdAt: 'DESC' },
      select: ['id', 'status', 'name', 'device'],
    });
    return requests;
  }
}

