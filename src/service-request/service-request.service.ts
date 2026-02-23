import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ServiceRequest } from './service-request.entity';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { CreateServiceRequestManualDto } from './dto/create-service-request-manual.dto';
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
      uuid: uuidv4(),
      referenceNumber: `SR-TEMP-${uuidv4().slice(0, 8)}`,
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

    const realReferenceNumber = `SR-${new Date().getFullYear()}-${String(savedRequest.id).padStart(4, '0')}`;
    if (savedRequest.referenceNumber?.startsWith('SR-TEMP-')) {
      savedRequest.referenceNumber = realReferenceNumber;
      await this.serviceRequestRepository.save(savedRequest);
    }

    // 🔥 Notify admin instantly
    this.adminGateway.notifyNewRequest({
      id: savedRequest.id,
      name: savedRequest.name,
      createdAt: savedRequest.createdAt,
    });

    const finalRequest = await this.serviceRequestRepository.findOne({ where: { id: savedRequest.id } });
    return {
      success: true,
      message: 'Service request created successfully',
      data: {
        id: finalRequest!.id,
        uuid: finalRequest!.uuid,
        referenceNumber: finalRequest!.referenceNumber,
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

  /**
   * Create a service request manually from admin (with defaults for date/time and optional staff assignment).
   */
  async createManual(dto: CreateServiceRequestManualDto) {
    const now = new Date();
    const dateTimeStr =
      now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) +
      ', ' +
      now.toLocaleTimeString('en-US', { hour12: true });

    const serviceRequest = this.serviceRequestRepository.create({
      uuid: uuidv4(),
      referenceNumber: `SR-TEMP-${uuidv4().slice(0, 8)}`,
      name: dto.name,
      mobile: dto.mobile,
      device: dto.device,
      deviceDisplayName: dto.deviceDisplayName ?? dto.device,
      otherDevice: dto.otherDevice ?? null,
      locationType: dto.locationType ?? 'manual',
      location: dto.location,
      currentLocation: dto.currentLocation ?? null,
      manualLocation: dto.manualLocation ?? dto.location,
      description: dto.description ?? null,
      language: dto.language ?? 'en',
      dateTime: dateTimeStr,
      timestamp: now,
      status: dto.status ?? 'Request received',
      assignedStaffId: dto.assignedStaffId ?? null,
    });

    const savedRequest = await this.serviceRequestRepository.save(serviceRequest);

    const realReferenceNumber = `SR-${new Date().getFullYear()}-${String(savedRequest.id).padStart(4, '0')}`;
    if (savedRequest.referenceNumber?.startsWith('SR-TEMP-')) {
      savedRequest.referenceNumber = realReferenceNumber;
      await this.serviceRequestRepository.save(savedRequest);
    }

    this.adminGateway.notifyNewRequest({
      id: savedRequest.id,
      name: savedRequest.name,
      createdAt: savedRequest.createdAt,
    });

    const finalRequest = await this.serviceRequestRepository.findOne({ where: { id: savedRequest.id } });
    return {
      success: true,
      message: 'Service request created successfully (manual)',
      data: {
        id: finalRequest!.id,
        uuid: finalRequest!.uuid,
        referenceNumber: finalRequest!.referenceNumber,
        name: savedRequest.name,
        mobile: savedRequest.mobile,
        device: savedRequest.device,
        deviceDisplayName: savedRequest.deviceDisplayName,
        location: savedRequest.location,
        description: savedRequest.description,
        status: savedRequest.status,
        timestamp: savedRequest.timestamp,
        assignedStaffId: savedRequest.assignedStaffId,
        createdAt: savedRequest.createdAt,
      },
    };
  }

  async findAll() {
    const serviceRequests = await this.serviceRequestRepository.find({
      relations: ['assignedStaff'],
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      message: 'Service requests fetched successfully',
      count: serviceRequests.length,
      data: serviceRequests,
    };
  }

  /**
   * Find all service requests that are assigned to staff.
   */
  async findAssigned() {
    const serviceRequests = await this.serviceRequestRepository.find({
      where: { assignedStaffId: Not(IsNull()) },
      relations: ['assignedStaff'],
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      message: 'Assigned service requests fetched successfully',
      count: serviceRequests.length,
      data: serviceRequests,
    };
  }

  async findByUuidOrId(idOrUuid: string | number): Promise<ServiceRequest> {
    if (typeof idOrUuid === 'number' || /^\d+$/.test(String(idOrUuid))) {
      const byId = await this.serviceRequestRepository.findOne({ where: { id: Number(idOrUuid) } });
      if (byId) return byId;
    }
    const byUuid = await this.serviceRequestRepository.findOne({ where: { uuid: String(idOrUuid) } });
    if (!byUuid) throw new NotFoundException('Service request not found');
    return byUuid;
  }

  async findOne(idOrUuid: string | number): Promise<ServiceRequest> {
    const serviceRequest = await this.findByUuidOrId(idOrUuid);
    const withRelations = await this.serviceRequestRepository.findOne({
      where: { id: serviceRequest.id },
      relations: ['assignedStaff'],
    });
    if (!withRelations) throw new NotFoundException('Service request not found');
    return withRelations;
  }

  async update(idOrUuid: string | number, updateDto: UpdateServiceRequestDto): Promise<ServiceRequest> {
    const serviceRequest = await this.findByUuidOrId(idOrUuid);
    Object.assign(serviceRequest, updateDto);
    await this.serviceRequestRepository.save(serviceRequest);
    const updated = await this.serviceRequestRepository.findOne({
      where: { id: serviceRequest.id },
      relations: ['assignedStaff'],
    });
    if (!updated) throw new NotFoundException('Service request not found');
    return updated;
  }

  async remove(idOrUuid: string | number): Promise<{ message: string }> {
    const serviceRequest = await this.findByUuidOrId(idOrUuid);
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

