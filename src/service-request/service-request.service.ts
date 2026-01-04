import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceRequest } from './service-request.entity';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';

@Injectable()
export class ServiceRequestService {
  constructor(
    @InjectRepository(ServiceRequest)
    private serviceRequestRepository: Repository<ServiceRequest>,
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
    });

    const savedRequest = await this.serviceRequestRepository.save(serviceRequest);

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
}

