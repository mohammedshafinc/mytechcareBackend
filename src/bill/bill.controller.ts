import { Controller, Get, Post, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BillService } from './bill.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { ModuleGuard } from '../auth/guards/module.guard';
import { ViewOnlyGuard } from '../auth/guards/view-only.guard';
import { RequireModule } from '../auth/decorators/require-module.decorator';

@ApiTags('Bill')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ModuleGuard)
@RequireModule('CLIENTS')
@Controller('bill')
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Get(':mobile')
  @ApiOperation({ 
    summary: 'Get bills by mobile number', 
    description: 'Fetch all bills for a specific mobile number' 
  })
  @ApiParam({ 
    name: 'mobile', 
    type: String, 
    description: 'Mobile number' 
  })
  @ApiResponse({ status: 200, description: 'Bills fetched successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findByMobile(@Param('mobile') mobile: string) {
    return this.billService.findByMobile(mobile);
  }

  @Post()
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
  async create(@Body() body: any, @Request() req: any) {
    // Create DTO with mapped fields - service handles validation
    const createBillDto: CreateBillDto = {
      serviceRequestId: body.serviceRequestId || body.id,
      id: body.id,
      costPrice: body.costPrice,
      customerPrice: body.customerPrice,
      mobile: body.mobile,
      notes: body.notes,
      userId: body.userId,
    };
    
    // Validate required fields
    if (!createBillDto.costPrice) {
      throw new BadRequestException('costPrice is required');
    }
    if (!createBillDto.customerPrice) {
      throw new BadRequestException('customerPrice is required');
    }
    
    // The service handles serviceRequestId validation and uses it as user_id
    return this.billService.create(createBillDto);
  }
}
