import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BillService } from './bill.service';
import { CreateBillDto } from './dto/create-bill.dto';

@ApiTags('Bill')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('bill')
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get bills by user ID', 
    description: 'Fetch all bills for a specific user by user ID' 
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'User ID' 
  })
  @ApiResponse({ status: 200, description: 'Bills fetched successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findByUserId(@Param('id', ParseIntPipe) userId: number) {
    return this.billService.findByUserId(userId);
  }

  @Post()
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
      repairItem: body.repairItem,
      costPrice: body.costPrice,
      customerPrice: body.customerPrice,
      quantity: body.quantity,
      notes: body.notes,
      userId: body.userId,
    };
    
    // Validate required fields
    if (!createBillDto.repairItem) {
      throw new BadRequestException('repairItem is required');
    }
    if (!createBillDto.costPrice) {
      throw new BadRequestException('costPrice is required');
    }
    if (!createBillDto.customerPrice) {
      throw new BadRequestException('customerPrice is required');
    }
    if (!createBillDto.quantity) {
      throw new BadRequestException('quantity is required');
    }
    
    // The service handles serviceRequestId validation and uses it as user_id
    return this.billService.create(createBillDto);
  }
}
