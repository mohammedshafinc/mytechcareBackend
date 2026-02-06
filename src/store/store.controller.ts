import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiParam } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

/**
 * Store controller for form: get next store code when form opens, and create store.
 */
@ApiTags('Store')
@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all stores',
    description: 'Returns all store details (id, storeName, storeCode, storeLocation, createdAt).',
  })
  @ApiResponse({ status: 200, description: 'List of stores returned' })
  async findAll() {
    return this.storeService.findAll();
  }

  @Get('next-code')
  @ApiOperation({
    summary: 'Get next store code',
    description:
      'Call when the create-store form opens. Returns the next available store code (e.g. MTCSA01, or MTCSA02 if MTCSA01 exists).',
  })
  @ApiResponse({ status: 200, description: 'Next store code returned' })
  async getNextStoreCode() {
    return this.storeService.getNextStoreCode();
  }

  @Post()
  @ApiOperation({
    summary: 'Create store',
    description: 'Create a new store with storeName, storeCode, and storeLocation.',
  })
  @ApiBody({ type: CreateStoreDto })
  @ApiResponse({ status: 201, description: 'Store created successfully' })
  @ApiResponse({ status: 409, description: 'Store code already in use' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createStoreDto: CreateStoreDto) {
    return this.storeService.create(createStoreDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update store',
    description: 'Update an existing store by ID. Send only fields to change.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Store ID' })
  @ApiBody({ type: UpdateStoreDto })
  @ApiResponse({ status: 200, description: 'Store updated successfully' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  @ApiResponse({ status: 409, description: 'Store code already in use' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStoreDto: UpdateStoreDto,
  ) {
    return this.storeService.update(id, updateStoreDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete store',
    description: 'Delete a store by ID.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Store ID' })
  @ApiResponse({ status: 200, description: 'Store deleted successfully' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.storeService.remove(id);
  }
}
