import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

const VAT_RATE = 0.15;

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    private dataSource: DataSource,
  ) {}

  /**
   * Generate the next invoice number: INV-0001, INV-0002, etc.
   */
  private async generateInvoiceNumber(): Promise<string> {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('MAX(invoice.id)', 'maxId')
      .getRawOne();

    const nextId = (result?.maxId || 0) + 1;
    return `INV-${String(nextId).padStart(4, '0')}`;
  }

  /**
   * Calculate totals for invoice items
   */
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

  /**
   * Create a new invoice directly
   */
  async create(createInvoiceDto: CreateInvoiceDto) {
    if (!createInvoiceDto.items || createInvoiceDto.items.length === 0) {
      throw new BadRequestException('At least one invoice item is required');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const invoiceNumber = await this.generateInvoiceNumber();

      const { calculatedItems, subtotal, vatAmount, grandTotal } =
        this.calculateTotals(
          createInvoiceDto.items.map((item) => ({
            unitPrice: item.unitPrice,
            quantity: item.quantity || 1,
          })),
        );

      // Create the invoice
      const invoice = this.invoiceRepository.create({
        invoiceNumber,
        invoiceDate: createInvoiceDto.invoiceDate
          ? new Date(createInvoiceDto.invoiceDate)
          : new Date(),
        paymentMethod: createInvoiceDto.paymentMethod || 'Cash',
        customerName: createInvoiceDto.customerName,
        customerMobile: createInvoiceDto.customerMobile || null,
        customerVatNumber: createInvoiceDto.customerVatNumber || null,
        customerAddress: createInvoiceDto.customerAddress || null,
        subtotal,
        vatRate: VAT_RATE * 100,
        vatAmount,
        grandTotal,
        notes: createInvoiceDto.notes || null,
        serviceRequestId: createInvoiceDto.serviceRequestId
          ? parseInt(createInvoiceDto.serviceRequestId)
          : null,
        status: 'confirmed',
      });

      const savedInvoice = await queryRunner.manager.save(Invoice, invoice);

      // Create invoice items
      const invoiceItems = createInvoiceDto.items.map((item, index) => {
        const calculated = calculatedItems[index];
        return this.invoiceItemRepository.create({
          invoiceId: savedInvoice.id,
          slNo: index + 1,
          product: item.product,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          vatAmount: calculated.vatAmount,
          lineTotal: calculated.lineTotal,
        });
      });

      await queryRunner.manager.save(InvoiceItem, invoiceItems);
      await queryRunner.commitTransaction();

      // Fetch the complete invoice with items
      const completeInvoice = await this.invoiceRepository.findOne({
        where: { id: savedInvoice.id },
        relations: ['items'],
      });

      return {
        success: true,
        message: 'Invoice created successfully',
        data: completeInvoice,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all invoices with pagination
   */
  async findAll(page: number = 1, limit: number = 20, search?: string) {
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .orderBy('invoice.createdAt', 'DESC');

    if (search) {
      queryBuilder.where(
        'invoice.customerName ILIKE :search OR invoice.invoiceNumber ILIKE :search OR invoice.customerMobile ILIKE :search',
        { search: `%${search}%` },
      );
    }

    const total = await queryBuilder.getCount();
    const invoices = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      success: true,
      message: 'Invoices fetched successfully',
      count: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: invoices,
    };
  }

  /**
   * Get a single invoice by ID
   */
  async findOne(id: number) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'Invoice fetched successfully',
      data: invoice,
    };
  }

  /**
   * Update an invoice
   */
  async update(id: number, updateInvoiceDto: UpdateInvoiceDto) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update basic fields
      if (updateInvoiceDto.invoiceDate) {
        invoice.invoiceDate = new Date(updateInvoiceDto.invoiceDate);
      }
      if (updateInvoiceDto.paymentMethod !== undefined) {
        invoice.paymentMethod = updateInvoiceDto.paymentMethod;
      }
      if (updateInvoiceDto.customerName !== undefined) {
        invoice.customerName = updateInvoiceDto.customerName;
      }
      if (updateInvoiceDto.customerMobile !== undefined) {
        invoice.customerMobile = updateInvoiceDto.customerMobile || null;
      }
      if (updateInvoiceDto.customerVatNumber !== undefined) {
        invoice.customerVatNumber = updateInvoiceDto.customerVatNumber || null;
      }
      if (updateInvoiceDto.customerAddress !== undefined) {
        invoice.customerAddress = updateInvoiceDto.customerAddress || null;
      }
      if (updateInvoiceDto.notes !== undefined) {
        invoice.notes = updateInvoiceDto.notes || null;
      }
      if (updateInvoiceDto.status !== undefined) {
        invoice.status = updateInvoiceDto.status;
      }

      // If items are provided, replace all existing items
      if (updateInvoiceDto.items && updateInvoiceDto.items.length > 0) {
        // Delete old items
        await queryRunner.manager.delete(InvoiceItem, { invoiceId: id });

        // Recalculate totals
        const { calculatedItems, subtotal, vatAmount, grandTotal } =
          this.calculateTotals(
            updateInvoiceDto.items.map((item) => ({
              unitPrice: item.unitPrice,
              quantity: item.quantity || 1,
            })),
          );

        invoice.subtotal = subtotal;
        invoice.vatAmount = vatAmount;
        invoice.grandTotal = grandTotal;

        // Create new items
        const newItems = updateInvoiceDto.items.map((item, index) => {
          const calculated = calculatedItems[index];
          return this.invoiceItemRepository.create({
            invoiceId: id,
            slNo: index + 1,
            product: item.product,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice,
            vatAmount: calculated.vatAmount,
            lineTotal: calculated.lineTotal,
          });
        });

        await queryRunner.manager.save(InvoiceItem, newItems);
      }

      await queryRunner.manager.save(Invoice, invoice);
      await queryRunner.commitTransaction();

      // Fetch updated invoice
      const updatedInvoice = await this.invoiceRepository.findOne({
        where: { id },
        relations: ['items'],
      });

      return {
        success: true,
        message: 'Invoice updated successfully',
        data: updatedInvoice,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Delete an invoice
   */
  async remove(id: number) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    await this.invoiceRepository.remove(invoice);

    return {
      success: true,
      message: 'Invoice deleted successfully',
    };
  }

  /**
   * Find all invoices linked to a specific service request
   */
  async findByServiceRequestId(serviceRequestId: number) {
    const invoices = await this.invoiceRepository.find({
      where: { serviceRequestId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      message: 'Invoices fetched successfully',
      count: invoices.length,
      data: invoices,
    };
  }

  /**
   * Get the next invoice number (for form helpers)
   */
  async getNextInvoiceNumber() {
    const invoiceNumber = await this.generateInvoiceNumber();

    return {
      success: true,
      data: { invoiceNumber },
    };
  }
}
