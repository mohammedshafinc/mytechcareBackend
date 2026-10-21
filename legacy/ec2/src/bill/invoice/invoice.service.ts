import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

const VAT_RATE = 0.15;
const CURRENCY = 'SAR';
const SELLER = {
  name: 'MyTechCare',
  vatNumber: '310662986100003',
  crNumber: '—',
  address: 'Dammam, Saudi Arabia',
};

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    private dataSource: DataSource,
  ) {}

  private generateInvoiceUuid(): string {
    return randomUUID();
  }

  private xmlEscape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private fixedAmount(value: number): string {
    return Number(value || 0).toFixed(2);
  }

  private toIsoDate(value: Date | string): string {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  }

  private toIsoTime(value?: Date | string | null): string {
    if (value) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toISOString().slice(11, 19);
    }
    return new Date().toISOString().slice(11, 19);
  }

  private generateKsaQrBase64(invoice: Invoice): string {
    const issueIso = invoice.issueTimestamp
      ? new Date(invoice.issueTimestamp).toISOString()
      : new Date(invoice.invoiceDate).toISOString();

    const fields = [
      { tag: 1, value: SELLER.name },
      { tag: 2, value: SELLER.vatNumber },
      { tag: 3, value: issueIso },
      { tag: 4, value: this.fixedAmount(Number(invoice.grandTotal || 0)) },
      { tag: 5, value: this.fixedAmount(Number(invoice.vatAmount || 0)) },
    ];

    const bytes: number[] = [];
    for (const field of fields) {
      const valueBytes = Array.from(Buffer.from(field.value, 'utf8'));
      bytes.push(field.tag, valueBytes.length, ...valueBytes);
    }
    return Buffer.from(bytes).toString('base64');
  }

  private buildUblXml(invoice: Invoice): string {
    const issueDate = this.toIsoDate(invoice.invoiceDate);
    const issueTime = this.toIsoTime(invoice.issueTimestamp);
    const uuid = invoice.uuid || this.generateInvoiceUuid();
    const icv = invoice.icv || String(invoice.id);
    const pih = invoice.previousHash || '';
    const qr = this.generateKsaQrBase64(invoice);
    const subtotal = Number(invoice.subtotal || 0);
    const vatAmount = Number(invoice.vatAmount || 0);
    const grandTotal = Number(invoice.grandTotal || 0);

    const linesXml = (invoice.items || [])
      .map((item, idx) => {
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const net = qty * unitPrice;
        const lineVat = Number(item.vatAmount || net * VAT_RATE);
        const gross = Number(item.lineTotal || net + lineVat);
        return `  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="PCE">${qty}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${CURRENCY}">${this.fixedAmount(net)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${CURRENCY}">${this.fixedAmount(lineVat)}</cbc:TaxAmount>
      <cbc:RoundingAmount currencyID="${CURRENCY}">${this.fixedAmount(gross)}</cbc:RoundingAmount>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${this.xmlEscape(item.product || 'Item')}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${CURRENCY}">${this.fixedAmount(unitPrice)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:zatca:sa:1p0:invoice</cbc:CustomizationID>
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${this.xmlEscape(invoice.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${this.xmlEscape(uuid)}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${CURRENCY}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${CURRENCY}</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${this.xmlEscape(icv)}</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${this.xmlEscape(pih)}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>QR</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${this.xmlEscape(qr)}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="CRN">${this.xmlEscape(SELLER.crNumber)}</cbc:ID></cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${this.xmlEscape(SELLER.address)}</cbc:StreetName>
        <cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${this.xmlEscape(SELLER.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${this.xmlEscape(SELLER.name)}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PostalAddress>
        <cbc:StreetName>${this.xmlEscape(invoice.customerAddress || '')}</cbc:StreetName>
        <cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${this.xmlEscape(invoice.customerVatNumber || '')}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${this.xmlEscape(invoice.customerName || 'Customer')}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${CURRENCY}">${this.fixedAmount(vatAmount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${CURRENCY}">${this.fixedAmount(subtotal)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${CURRENCY}">${this.fixedAmount(vatAmount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${CURRENCY}">${this.fixedAmount(subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${CURRENCY}">${this.fixedAmount(subtotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${CURRENCY}">${this.fixedAmount(grandTotal)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${CURRENCY}">${this.fixedAmount(grandTotal)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${linesXml}
</Invoice>`;
  }

  private validateUblXml(xml: string) {
    const errors: string[] = [];
    const warnings: string[] = [];

    const syntax = XMLValidator.validate(xml);
    if (syntax !== true) {
      return {
        valid: false,
        profile: 'EN16931/ZATCA',
        errors: [`XML syntax error: ${syntax.err.msg}`],
        warnings,
      };
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const doc = parser.parse(xml) as Record<string, unknown>;
    const invoice = (doc?.Invoice || {}) as Record<string, unknown>;
    const requiredFields = [
      'cbc:CustomizationID',
      'cbc:ProfileID',
      'cbc:ID',
      'cbc:UUID',
      'cbc:IssueDate',
      'cbc:InvoiceTypeCode',
      'cbc:DocumentCurrencyCode',
      'cac:AccountingSupplierParty',
      'cac:AccountingCustomerParty',
      'cac:TaxTotal',
      'cac:LegalMonetaryTotal',
      'cac:InvoiceLine',
    ];

    for (const field of requiredFields) {
      if (!(field in invoice)) {
        errors.push(`Missing required UBL field: ${field}`);
      }
    }

    const customizationId = String(invoice['cbc:CustomizationID'] || '');
    if (!customizationId.includes('en16931') || !customizationId.includes('zatca')) {
      errors.push(
        'CustomizationID does not look like EN16931 + ZATCA profile',
      );
    }

    const refs = invoice['cac:AdditionalDocumentReference'];
    const refsArray = Array.isArray(refs) ? refs : refs ? [refs] : [];
    const refIds = refsArray
      .map((r) => String((r as Record<string, unknown>)['cbc:ID'] || ''))
      .filter(Boolean);
    for (const needed of ['ICV', 'PIH', 'QR']) {
      if (!refIds.includes(needed)) {
        errors.push(`Missing AdditionalDocumentReference: ${needed}`);
      }
    }

    if (!xml.includes('<ds:Signature')) {
      warnings.push(
        'Missing digital signature block (ds:Signature). Required for full ZATCA Phase 2 submission.',
      );
    }

    return {
      valid: errors.length === 0,
      profile: 'EN16931/ZATCA',
      errors,
      warnings,
    };
  }

  private calculateInvoiceHash(input: {
    invoiceNumber: string;
    uuid: string | null;
    issueTimestamp: Date | null;
    grandTotal: number;
  }): string {
    const payload = [
      input.invoiceNumber || '',
      input.uuid || '',
      input.issueTimestamp ? input.issueTimestamp.toISOString() : '',
      Number(input.grandTotal || 0).toFixed(2),
    ].join('|');

    return createHash('sha256').update(payload).digest('base64');
  }

  private async resolvePhase2Metadata(
    createInvoiceDto: CreateInvoiceDto,
    grandTotal: number,
    queryRunner: ReturnType<DataSource['createQueryRunner']>,
    invoiceNumber: string,
  ): Promise<{
    uuid: string;
    icv: string;
    previousHash: string | null;
    issueTimestamp: Date;
  }> {
    const issueTimestamp = createInvoiceDto.issueTimestamp
      ? new Date(createInvoiceDto.issueTimestamp)
      : new Date();
    const uuid = createInvoiceDto.uuid || this.generateInvoiceUuid();

    const [lastInvoice] = await queryRunner.manager.find(Invoice, {
      order: { id: 'DESC' },
      take: 1,
    });

    let icv = (createInvoiceDto.icv || '').trim();
    if (!icv) {
      const lastIcv = lastInvoice?.icv ? Number(lastInvoice.icv) : NaN;
      if (Number.isFinite(lastIcv) && lastIcv >= 0) {
        icv = String(lastIcv + 1);
      } else {
        icv = String((lastInvoice?.id || 0) + 1);
      }
    }

    let previousHash = (createInvoiceDto.previousHash || '').trim() || null;
    if (!previousHash && lastInvoice) {
      previousHash = this.calculateInvoiceHash({
        invoiceNumber: lastInvoice.invoiceNumber,
        uuid: lastInvoice.uuid,
        issueTimestamp: lastInvoice.issueTimestamp || lastInvoice.createdAt,
        grandTotal: Number(lastInvoice.grandTotal || 0),
      });
    }

    // Keep hash chain meaningful even for first invoice with no previous record.
    if (!previousHash) {
      previousHash = this.calculateInvoiceHash({
        invoiceNumber,
        uuid,
        issueTimestamp,
        grandTotal,
      });
    }

    return { uuid, icv, previousHash, issueTimestamp };
  }

  /**
   * Parse optional service request id safely.
   * Returns null for empty values and throws on invalid numbers.
   */
  private parseServiceRequestId(serviceRequestId?: string): number | null {
    if (serviceRequestId === undefined || serviceRequestId === null) {
      return null;
    }

    const normalized = serviceRequestId.trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(
        'serviceRequestId must be a valid positive integer',
      );
    }

    return parsed;
  }

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

      const phase2 = await this.resolvePhase2Metadata(
        createInvoiceDto,
        grandTotal,
        queryRunner,
        invoiceNumber,
      );

      // Create the invoice
      const invoice = this.invoiceRepository.create({
        invoiceNumber,
        invoiceDate: createInvoiceDto.invoiceDate
          ? new Date(createInvoiceDto.invoiceDate)
          : new Date(),
        uuid: phase2.uuid,
        icv: phase2.icv,
        previousHash: phase2.previousHash,
        issueTimestamp: phase2.issueTimestamp,
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
        serviceRequestId: this.parseServiceRequestId(
          createInvoiceDto.serviceRequestId,
        ),
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
      if (updateInvoiceDto.uuid !== undefined) {
        invoice.uuid = updateInvoiceDto.uuid || null;
      }
      if (updateInvoiceDto.icv !== undefined) {
        invoice.icv = updateInvoiceDto.icv || null;
      }
      if (updateInvoiceDto.previousHash !== undefined) {
        invoice.previousHash = updateInvoiceDto.previousHash || null;
      }
      if (updateInvoiceDto.issueTimestamp !== undefined) {
        invoice.issueTimestamp = updateInvoiceDto.issueTimestamp
          ? new Date(updateInvoiceDto.issueTimestamp)
          : null;
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

  async generateUbl(id: number) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    const xml = this.buildUblXml(invoice);
    const validation = this.validateUblXml(xml);

    return {
      success: true,
      message: 'UBL XML generated successfully',
      data: {
        invoiceId: id,
        invoiceNumber: invoice.invoiceNumber,
        xml,
        validation,
      },
    };
  }

  async validateInvoiceUbl(id: number) {
    const generated = await this.generateUbl(id);
    return {
      success: true,
      message: 'UBL XML validation completed',
      data: {
        invoiceId: id,
        invoiceNumber: generated.data.invoiceNumber,
        validation: generated.data.validation,
      },
    };
  }

  async validateRawUblXml(xml: string) {
    const validation = this.validateUblXml(xml);
    return {
      success: true,
      message: 'Raw UBL XML validation completed',
      data: validation,
    };
  }
}
