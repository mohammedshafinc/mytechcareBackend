import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ModuleGuard } from '../../auth/guards/module.guard';
import { ViewOnlyGuard } from '../../auth/guards/view-only.guard';
import { RequireModule } from '../../auth/decorators/require-module.decorator';
import { RentalVehicleService, RequestUser } from './rental-vehicle.service';
import { CreateRentalVehicleDto } from './dto/create-rental-vehicle.dto';
import { UpdateRentalVehicleDto } from './dto/update-rental-vehicle.dto';

@ApiTags('Organization - Rental Vehicles')
@ApiBearerAuth()
@Controller('organization/rental-vehicles')
@UseGuards(AuthGuard('jwt'), ModuleGuard)
@RequireModule('ORGANIZATION')
export class RentalVehicleController {
  constructor(private readonly rentalVehicleService: RentalVehicleService) {}

  private getUser(req: { user?: RequestUser }): RequestUser {
    const user = req.user;
    if (!user) throw new Error('User not authenticated');
    return user;
  }

  @Post()
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({ summary: 'Create rental vehicle', description: 'Add a new rental vehicle record' })
  @ApiBody({ type: CreateRentalVehicleDto })
  @ApiResponse({ status: 201, description: 'Rental vehicle created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateRentalVehicleDto, @Req() req: { user?: RequestUser }) {
    return this.rentalVehicleService.create(dto, this.getUser(req));
  }

  @Get()
  @ApiOperation({ summary: 'Get all rental vehicles', description: 'List all rental vehicles (filtered by store for store managers)' })
  @ApiResponse({ status: 200, description: 'Rental vehicles fetched successfully' })
  async findAll(@Req() req: { user?: RequestUser }) {
    return this.rentalVehicleService.findAll(this.getUser(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rental vehicle by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Rental vehicle fetched successfully' })
  @ApiResponse({ status: 404, description: 'Rental vehicle not found' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: { user?: RequestUser }) {
    return this.rentalVehicleService.findOne(id, this.getUser(req));
  }

  @Put(':id')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({ summary: 'Update rental vehicle' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateRentalVehicleDto })
  @ApiResponse({ status: 200, description: 'Rental vehicle updated successfully' })
  @ApiResponse({ status: 404, description: 'Rental vehicle not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRentalVehicleDto,
    @Req() req: { user?: RequestUser },
  ) {
    return this.rentalVehicleService.update(id, dto, this.getUser(req));
  }

  @Put(':id/return')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({ summary: 'Mark rental vehicle as returned', description: 'Set return date, odometer, and recalculate total cost' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Rental vehicle marked as returned' })
  @ApiResponse({ status: 400, description: 'Vehicle already returned' })
  @ApiResponse({ status: 404, description: 'Rental vehicle not found' })
  async markReturned(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { actualReturnDate?: string; odometerReturn?: number },
    @Req() req: { user?: RequestUser },
  ) {
    return this.rentalVehicleService.markReturned(id, body, this.getUser(req));
  }

  @Delete(':id')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({ summary: 'Delete rental vehicle (soft)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Rental vehicle deleted successfully' })
  @ApiResponse({ status: 404, description: 'Rental vehicle not found' })
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: { user?: RequestUser }) {
    return this.rentalVehicleService.remove(id, this.getUser(req));
  }
}
