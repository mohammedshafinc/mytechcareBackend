const encoder=new TextEncoder();
const CURRENCY='SAR';
export const xmlEscape=(v:unknown)=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
export async function sha256(value:string){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)));let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);}
export function qrTlv(fields:string[]){const out:number[]=[];fields.forEach((value,index)=>{const bytes=encoder.encode(value);if(bytes.length>255)throw new Error('tlv_field_too_long');out.push(index+1,bytes.length,...bytes);});let binary='';for(const byte of out)binary+=String.fromCharCode(byte);return btoa(binary);}
export interface Seller {name:string;vat:string;cr:string;address:string}
export interface UblInvoice {invoiceNumber:string;invoiceDate:string;uuid?:string|null;icv?:string|null;issueTimestamp?:string|null;customerName:string;customerVatNumber?:string|null;customerAddress?:string|null;subtotal:number;vatAmount:number;grandTotal:number;previousHash?:string|null;items:Array<{slNo?:number;product:string;quantity:number;unitPrice:number;vatAmount:number;lineTotal:number}>}
const amount=(value:number)=>Number(value||0).toFixed(2);
export function invoiceQr(invoice:UblInvoice,seller:Seller){const issued=invoice.issueTimestamp??`${invoice.invoiceDate}T00:00:00.000Z`;return qrTlv([seller.name,seller.vat,new Date(issued).toISOString(),amount(invoice.grandTotal),amount(invoice.vatAmount)]);}
export async function buildUbl(invoice:UblInvoice,seller:Seller){const issueTimestamp=invoice.issueTimestamp??`${invoice.invoiceDate}T00:00:00.000Z`,issueDate=new Date(`${invoice.invoiceDate}T00:00:00.000Z`).toISOString().slice(0,10),issueTime=new Date(issueTimestamp).toISOString().slice(11,19),qr=invoiceQr(invoice,seller),lines=invoice.items.map((item,index)=>{const net=item.quantity*item.unitPrice,lineVat=item.vatAmount||net*0.15,gross=item.lineTotal||net+lineVat;return `  <cac:InvoiceLine>
    <cbc:ID>${index+1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="PCE">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${CURRENCY}">${amount(net)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${CURRENCY}">${amount(lineVat)}</cbc:TaxAmount>
      <cbc:RoundingAmount currencyID="${CURRENCY}">${amount(gross)}</cbc:RoundingAmount>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${xmlEscape(item.product||'Item')}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${CURRENCY}">${amount(item.unitPrice)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;}).join('\n');return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:zatca:sa:1p0:invoice</cbc:CustomizationID>
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${xmlEscape(invoice.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${xmlEscape(invoice.uuid)}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${CURRENCY}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${CURRENCY}</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${xmlEscape(invoice.icv)}</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${xmlEscape(invoice.previousHash)}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>QR</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${xmlEscape(qr)}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="CRN">${xmlEscape(seller.cr)}</cbc:ID></cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${xmlEscape(seller.address)}</cbc:StreetName>
        <cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${xmlEscape(seller.vat)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${xmlEscape(seller.name)}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PostalAddress>
        <cbc:StreetName>${xmlEscape(invoice.customerAddress||'')}</cbc:StreetName>
        <cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${xmlEscape(invoice.customerVatNumber||'')}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${xmlEscape(invoice.customerName||'Customer')}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${CURRENCY}">${amount(invoice.vatAmount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${CURRENCY}">${amount(invoice.subtotal)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${CURRENCY}">${amount(invoice.vatAmount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${CURRENCY}">${amount(invoice.subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${CURRENCY}">${amount(invoice.subtotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${CURRENCY}">${amount(invoice.grandTotal)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${CURRENCY}">${amount(invoice.grandTotal)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines}
</Invoice>`;}
