import { Controller, Post, Get, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EnquiryFollowupService } from './enquiry-followup.service';
import { CreateEnquiryFollowupDto } from './dto/create-enquiry-followup.dto';
import { UpdateEnquiryFollowupDto } from './dto/update-enquiry-followup.dto';
import { ModuleGuard } from '../auth/guards/module.guard';
import { ViewOnlyGuard } from '../auth/guards/view-only.guard';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequireSubmodule } from '../auth/decorators/require-submodule.decorator';

@ApiTags('Enquiry Follow-ups')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ModuleGuard)
@RequireModule('ENQUIRE')
@RequireSubmodule('ENQUIRY_FOLLOWUP')
@Controller('enquire/followup')
export class EnquiryFollowupController {
  constructor(private readonly followupService: EnquiryFollowupService) {}

  @Get()
  @ApiOperation({
    summary: 'Get follow-ups for an enquiry',
    description: 'Retrieve all follow-ups for a specific enquiry by ID and type',
  })
  @ApiQuery({ name: 'enquiryId', type: Number, description: 'Enquiry ID' })
  @ApiQuery({ name: 'enquiryType', type: String, description: 'Enquiry type (b2c or corporate)' })
  @ApiResponse({ status: 200, description: 'Follow-ups retrieved successfully' })
  async getFollowups(
    @Query('enquiryId', ParseIntPipe) enquiryId: number,
    @Query('enquiryType') enquiryType: string,
  ) {
    return this.followupService.getFollowupsByEnquiry(enquiryId, enquiryType);
  }

  @Post()
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({
    summary: 'Create a follow-up',
    description: 'Create a new follow-up for an enquiry',
  })
  @ApiBody({ type: CreateEnquiryFollowupDto })
  @ApiResponse({ status: 201, description: 'Follow-up created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or previous follow-up not completed' })
  async create(@Body() dto: CreateEnquiryFollowupDto) {
    return this.followupService.create(dto);
  }

  @Put(':id')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({
    summary: 'Update a follow-up',
    description: 'Update an existing follow-up by ID',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Follow-up ID' })
  @ApiBody({ type: UpdateEnquiryFollowupDto })
  @ApiResponse({ status: 200, description: 'Follow-up updated successfully' })
  @ApiResponse({ status: 404, description: 'Follow-up not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEnquiryFollowupDto,
  ) {
    return this.followupService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({
    summary: 'Delete a follow-up',
    description: 'Delete an existing follow-up by ID',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Follow-up ID' })
  @ApiResponse({ status: 200, description: 'Follow-up deleted successfully' })
  @ApiResponse({ status: 404, description: 'Follow-up not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.followupService.remove(id);
  }
}
