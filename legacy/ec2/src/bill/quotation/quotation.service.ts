import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Quotation } from './quotation.entity';
import { QuotationItem } from './quotation-item.entity';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';

const VAT_RATE = 0.15;

@Injectable()
export class QuotationService {
  constructor(
    @InjectRepository(Quotation)
    private quotationRepository: Repository<Quotation>,
    @InjectRepository(QuotationItem)
    private quotationItemRepository: Repository<QuotationItem>,
    private dataSource: DataSource,
  ) {}

  private async generateQuotationNumber(): Promise<string> {
    const result = await this.quotationRepository
      .createQueryBuilder('quotation')
      .select('MAX(quotation.id)', 'maxId')
      .getRawOne();

    const nextId = (result?.maxId || 0) + 1;
    return `QUO-${String(nextId).padStart(4, '0')}`;
  }

  private calculateTotals(items: { unitPrice: number; quantity: number }[]) {
    let subtotal = 0;

    const calculatedItems = items.map((item) => {
      const lineSubtotal = item.unitPrice * (item.quantity || 1);
      const lineVat = Math.round(lineSubtotal * VAT_RATE * 100) / 100;
      const lineTotal = Math.round((lineSubtotal + lineVat) * 100) / 100;
      subtotal += lineSubtotal;

      return {
        ...item,
        vatAmount: lineVat,
        lineTotal,
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;
    const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100;
    const grandTotal = Math.round((subtotal + vatAmount) * 100) / 100;

    return { calculatedItems, subtotal, vatAmount, grandTotal };
  }

  async create(createQuotationDto: CreateQuotationDto) {
    if (!createQuotationDto.items || createQuotationDto.items.length === 0) {
      throw new BadRequestException('At least one quotation item is required');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const quotationNumber = await this.generateQuotationNumber();
      const { calculatedItems, subtotal, vatAmount, grandTotal } =
        this.calculateTotals(
          createQuotationDto.items.map((item) => ({
            unitPrice: item.unitPrice,
            quantity: item.quantity || 1,
          })),
        );

      const quotation = this.quotationRepository.create({
        quotationNumber,
        quotationDate: createQuotationDto.quotationDate
          ? new Date(createQuotationDto.quotationDate)
          : new Date(),
        validUntil: createQuotationDto.validUntil
          ? new Date(createQuotationDto.validUntil)
          : null,
        customerName: createQuotationDto.customerName,
        customerMobile: createQuotationDto.customerMobile || null,
        customerVatNumber: createQuotationDto.customerVatNumber || null,
        customerAddress: createQuotationDto.customerAddress || null,
        subtotal,
        vatRate: VAT_RATE * 100,
        vatAmount,
        grandTotal,
        notes: createQuotationDto.notes || null,
        serviceRequestId: createQuotationDto.serviceRequestId
          ? parseInt(createQuotationDto.serviceRequestId)
          : null,
        status: 'confirmed',
      });

      const savedQuotation = await queryRunner.manager.save(Quotation, quotation);

      const quotationItems = createQuotationDto.items.map((item, index) => {
        const calculated = calculatedItems[index];
        return this.quotationItemRepository.create({
          quotationId: savedQuotation.id,
          slNo: index + 1,
          product: item.product,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          vatAmount: calculated.vatAmount,
          lineTotal: calculated.lineTotal,
        });
      });

      await queryRunner.manager.save(QuotationItem, quotationItems);
      await queryRunner.commitTransaction();

      const completeQuotation = await this.quotationRepository.findOne({
        where: { id: savedQuotation.id },
        relations: ['items'],
      });

      return {
        success: true,
        message: 'Quotation created successfully',
        data: completeQuotation,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(page: number = 1, limit: number = 20, search?: string) {
    const queryBuilder = this.quotationRepository
      .createQueryBuilder('quotation')
      .leftJoinAndSelect('quotation.items', 'items')
      .orderBy('quotation.createdAt', 'DESC');

    if (search) {
      queryBuilder.where(
        'quotation.customerName ILIKE :search OR quotation.quotationNumber ILIKE :search OR quotation.customerMobile ILIKE :search',
        { search: `%${search}%` },
      );
    }

    const total = await queryBuilder.getCount();
    const quotations = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      success: true,
      message: 'Quotations fetched successfully',
      count: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: quotations,
    };
  }

  async findOne(id: number) {
    const quotation = await this.quotationRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'Quotation fetched successfully',
      data: quotation,
    };
  }

  async update(id: number, updateDto: UpdateQuotationDto) {
    const quotation = await this.quotationRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${id} not found`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (updateDto.quotationDate) {
        quotation.quotationDate = new Date(updateDto.quotationDate);
      }
      if (updateDto.validUntil !== undefined) {
        quotation.validUntil = updateDto.validUntil ? new Date(updateDto.validUntil) : null;
      }
      if (updateDto.customerName !== undefined) {
        quotation.customerName = updateDto.customerName;
      }
      if (updateDto.customerMobile !== undefined) {
        quotation.customerMobile = updateDto.customerMobile || null;
      }
      if (updateDto.customerVatNumber !== undefined) {
        quotation.customerVatNumber = updateDto.customerVatNumber || null;
      }
      if (updateDto.customerAddress !== undefined) {
        quotation.customerAddress = updateDto.customerAddress || null;
      }
      if (updateDto.notes !== undefined) {
        quotation.notes = updateDto.notes || null;
      }
      if (updateDto.status !== undefined) {
        quotation.status = updateDto.status;
      }

      if (updateDto.items && updateDto.items.length > 0) {
        await queryRunner.manager.delete(QuotationItem, { quotationId: id });

        const { calculatedItems, subtotal, vatAmount, grandTotal } =
          this.calculateTotals(
            updateDto.items.map((item) => ({
              unitPrice: item.unitPrice,
              quantity: item.quantity || 1,
            })),
          );

        quotation.subtotal = subtotal;
        quotation.vatAmount = vatAmount;
        quotation.grandTotal = grandTotal;

        const newItems = updateDto.items.map((item, index) => {
          const calculated = calculatedItems[index];
          return this.quotationItemRepository.create({
            quotationId: id,
            slNo: index + 1,
            product: item.product,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice,
            vatAmount: calculated.vatAmount,
            lineTotal: calculated.lineTotal,
          });
        });

        await queryRunner.manager.save(QuotationItem, newItems);
      }

      await queryRunner.manager.save(Quotation, quotation);
      await queryRunner.commitTransaction();

      const updatedQuotation = await this.quotationRepository.findOne({
        where: { id },
        relations: ['items'],
      });

      return {
        success: true,
        message: 'Quotation updated successfully',
        data: updatedQuotation,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number) {
    const quotation = await this.quotationRepository.findOne({
      where: { id },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${id} not found`);
    }

    await this.quotationRepository.remove(quotation);

    return {
      success: true,
      message: 'Quotation deleted successfully',
    };
  }

  async findByServiceRequestId(serviceRequestId: number) {
    const quotations = await this.quotationRepository.find({
      where: { serviceRequestId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      message: 'Quotations fetched successfully',
      count: quotations.length,
      data: quotations,
    };
  }

  async getNextQuotationNumber() {
    const quotationNumber = await this.generateQuotationNumber();
    return {
      success: true,
      data: { quotationNumber },
    };
  }
}

