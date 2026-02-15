import { Controller, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BillService } from '../bill/bill.service';
import { CreateBillDto } from '../bill/dto/create-bill.dto';
import { ModuleGuard } from '../auth/guards/module.guard';
import { ViewOnlyGuard } from '../auth/guards/view-only.guard';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@ApiTags('Repair Item')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ModuleGuard)
@RequireModule('CLIENTS')
@Controller('repair-item')
export class RepairItemController {
  constructor(
    private readonly billService: BillService,
  ) {}

  @Post('bill')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({ 
    summary: 'Create bill', 
    description: 'Create a new bill for a service request' 
  })
  @ApiBody({ type: CreateBillDto })
  @ApiResponse({ status: 201, description: 'Bill created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Service request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createBill(@Body() body: any, @Request() req: any) {
    // Map 'id' to 'serviceRequestId' if serviceRequestId is not provided
    const mappedBody = {
      ...body,
      serviceRequestId: body.serviceRequestId || body.id,
    };
    
    // Transform and validate
    const createBillDto = plainToInstance(CreateBillDto, mappedBody);
    const errors = await validate(createBillDto);
    
    if (errors.length > 0) {
      const errorMessages = errors.map(e => Object.values(e.constraints || {})).flat();
      throw new BadRequestException(errorMessages);
    }
    
    // The service uses serviceRequestId as user_id (id from service_requests table)
    return this.billService.create(createBillDto);
  }
}
