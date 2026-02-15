import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { ModuleGuard } from '../../auth/guards/module.guard';
import { ViewOnlyGuard } from '../../auth/guards/view-only.guard';
import { RequireModule } from '../../auth/decorators/require-module.decorator';
import { VehicleService } from './vehicle.service';
import { RequestUser } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateVehicleExpenseDto } from './dto/create-vehicle-expense.dto';
import { UpdateVehicleExpenseDto } from './dto/update-vehicle-expense.dto';

@ApiTags('Organization - Vehicles')
@ApiBearerAuth()
@Controller('organization/vehicles')
@UseGuards(AuthGuard('jwt'), ModuleGuard)
@RequireModule('ORGANIZATION')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  private getUser(req: { user?: RequestUser }): RequestUser {
    const user = req.user;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user;
  }

  /** Static route MUST be before @Get(':id') - otherwise "report" matches :id and ParseIntPipe fails */
  @Get('report')
  @ApiOperation({
    summary: 'Get vehicles report',
    description: 'Get vehicles report with summary, expenses by type, per-store and per-vehicle breakdown',
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD)', example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD)', example: '2026-01-31' })
  @ApiResponse({ status: 200, description: 'Vehicles report retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getReport(
    @Req() req: { user?: RequestUser },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.vehicleService.getVehiclesReport(this.getUser(req), startDate, endDate);
  }

  @Post()
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({ summary: 'Create vehicle', description: 'Create a new vehicle' })
  @ApiBody({ type: CreateVehicleDto })
  @ApiResponse({ status: 201, description: 'Vehicle created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 409, description: 'Vehicle number already in use' })
  async create(@Body() dto: CreateVehicleDto, @Req() req: { user?: RequestUser }) {
    return this.vehicleService.create(dto, this.getUser(req));
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles', description: 'List vehicles (filtered by store for store managers)' })
  @ApiResponse({ status: 200, description: 'Vehicles fetched successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@Req() req: { user?: RequestUser }) {
    return this.vehicleService.findAll(this.getUser(req));
  }

  @Put('expenses/:expenseId')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({ summary: 'Update expense', description: 'Update an expense by ID' })
  @ApiParam({ name: 'expenseId', type: Number, description: 'Expense ID' })
  @ApiBody({ type: UpdateVehicleExpenseDto })
  @ApiResponse({ status: 200, description: 'Expense updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async updateExpense(
    @Param('expenseId', ParseIntPipe) expenseId: number,
    @Body() dto: UpdateVehicleExpenseDto,
    @Req() req: { user?: RequestUser },
  ) {
    return this.vehicleService.updateExpense(expenseId, dto, this.getUser(req));
  }

  @Delete('expenses/:expenseId')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({ summary: 'Delete expense (admin only, soft)', description: 'Soft delete an expense (Super Admin only)' })
  @ApiParam({ name: 'expenseId', type: Number, description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Expense deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Super Admin can delete expenses' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async removeExpense(
    @Param('expenseId', ParseIntPipe) expenseId: number,
    @Req() req: { user?: RequestUser },
  ) {
    return this.vehicleService.removeExpense(expenseId, this.getUser(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle by ID', description: 'Get a single vehicle by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Vehicle ID' })
  @ApiResponse({ status: 200, description: 'Vehicle fetched successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: RequestUser },
  ) {
    return this.vehicleService.findOne(id, this.getUser(req));
  }

  @Get(':id/expenses')
  @ApiOperation({ summary: 'Get vehicle expenses', description: 'List expenses for a vehicle' })
  @ApiParam({ name: 'id', type: Number, description: 'Vehicle ID' })
  @ApiResponse({ status: 200, description: 'Expenses fetched successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findExpenses(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: RequestUser },
  ) {
    return this.vehicleService.findExpenses(id, this.getUser(req));
  }

  @Put(':id')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({ summary: 'Update vehicle', description: 'Update an existing vehicle' })
  @ApiParam({ name: 'id', type: Number, description: 'Vehicle ID' })
  @ApiBody({ type: UpdateVehicleDto })
  @ApiResponse({ status: 200, description: 'Vehicle updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  @ApiResponse({ status: 409, description: 'Vehicle number already in use' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleDto,
    @Req() req: { user?: RequestUser },
  ) {
    return this.vehicleService.update(id, dto, this.getUser(req));
  }

  @Delete(':id')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({ summary: 'Delete vehicle (soft)', description: 'Soft delete a vehicle' })
  @ApiParam({ name: 'id', type: Number, description: 'Vehicle ID' })
  @ApiResponse({ status: 200, description: 'Vehicle deleted successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: RequestUser },
  ) {
    return this.vehicleService.remove(id, this.getUser(req));
  }

  @Post(':id/expenses')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({ summary: 'Add expense', description: 'Add an expense to a vehicle (only ACTIVE vehicles)' })
  @ApiParam({ name: 'id', type: Number, description: 'Vehicle ID' })
  @ApiBody({ type: CreateVehicleExpenseDto })
  @ApiResponse({ status: 201, description: 'Expense added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input / vehicle not ACTIVE' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async createExpense(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateVehicleExpenseDto,
    @Req() req: { user?: RequestUser },
  ) {
    return this.vehicleService.createExpense(id, dto, this.getUser(req));
  }
}
