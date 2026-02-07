import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@ApiTags('Staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('next-code')
  @ApiOperation({
    summary: 'Get next employee code',
    description: 'Call when form opens. Returns next emp code (e.g. MTC0100, MTC0101).',
  })
  @ApiResponse({ status: 200, description: 'Next emp code returned' })
  async getNextEmpCode() {
    return this.staffService.getNextEmpCode();
  }

  @Get()
  @ApiOperation({ summary: 'Get all staff', description: 'Returns all staff with store details.' })
  @ApiResponse({ status: 200, description: 'List of staff returned' })
  async findAll() {
    return this.staffService.findAll();
  }

  @Get('by-store-code')
  @ApiOperation({
    summary: 'Get staff by store code',
    description: 'Pass store code from FE (e.g. MTCSA01). Returns staff for that store.',
  })
  @ApiQuery({ name: 'storeCode', required: true, description: 'Store code (e.g. MTCSA01)' })
  @ApiResponse({ status: 200, description: 'Staff list for the store' })
  @ApiResponse({ status: 400, description: 'storeCode is required' })
  async findByStoreCode(@Query('storeCode') storeCode: string) {
    if (!storeCode?.trim()) {
      throw new BadRequestException('storeCode query parameter is required');
    }
    return this.staffService.findByStoreCode(storeCode);
  }

  @Post()
  @ApiOperation({
    summary: 'Create staff',
    description: 'Create staff with empCode, name, store, iqama, position, department, passport.',
  })
  @ApiBody({ type: CreateStaffDto })
  @ApiResponse({ status: 201, description: 'Staff created successfully' })
  @ApiResponse({ status: 409, description: 'Emp code already in use' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createStaffDto: CreateStaffDto) {
    return this.staffService.create(createStaffDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update staff', description: 'Update staff by ID.' })
  @ApiParam({ name: 'id', type: Number, description: 'Staff ID' })
  @ApiBody({ type: UpdateStaffDto })
  @ApiResponse({ status: 200, description: 'Staff updated successfully' })
  @ApiResponse({ status: 404, description: 'Staff not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStaffDto: UpdateStaffDto,
  ) {
    return this.staffService.update(id, updateStaffDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete staff', description: 'Delete staff by ID.' })
  @ApiParam({ name: 'id', type: Number, description: 'Staff ID' })
  @ApiResponse({ status: 200, description: 'Staff deleted successfully' })
  @ApiResponse({ status: 404, description: 'Staff not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.remove(id);
  }
}
