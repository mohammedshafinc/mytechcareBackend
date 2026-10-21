import { readFile } from 'node:fs/promises';
import { describe,expect,it } from 'vitest';
import { camel,timestamp } from '../../src/worker/http';
import { reportRange } from '../../src/worker/reports';
import { buildUbl,invoiceQr,sha256,type Seller,type UblInvoice } from '../../src/worker/ubl';
import { validateUbl } from '../../src/worker/documents';

const seller={name:'MyTechCare',vat:'310662986100003',cr:'—',address:'Dammam, Saudi Arabia'};
const invoice={invoiceNumber:'INV-0001',invoiceDate:'2026-02-09',uuid:'de305d54-75b4-431b-adb2-eb6b9e546014',icv:'1',issueTimestamp:'2026-02-09T10:30:00.000Z',customerName:'Fixture & Customer',customerVatNumber:'300000000000003',customerAddress:'Riyadh <SA>',subtotal:100,vatAmount:15,grandTotal:115,previousHash:'fixture-hash',items:[{slNo:1,product:'Screen & Battery',quantity:1,unitPrice:100,vatAmount:15,lineTotal:115}]};

describe('review correctness fixes',()=>{
  it('rejects timestamp rollover, bad clocks, and invalid offsets',()=>{
    for(const value of ['2023-02-29T00:00:00Z','2024-02-30T00:00:00Z','2024-01-01T24:00:00Z','2024-01-01T00:60:00Z','2024-01-01T00:00:60Z','2024-01-01T00:00:00+14:01'])expect(()=>timestamp(value)).toThrow();
    expect(timestamp('2024-02-29T03:04:05.1+03:00')).toBe('2024-02-29T00:04:05.100Z');
  });
  it('maps storage units to public DTO field names',()=>{
    expect(camel({salary_halalas:12345,odometer_start_tenths:1234,vat_rate_bps:1500,is_active:1})).toEqual({salary:123.45,odometerStart:123.4,vatRate:15,isActive:true});
  });
  it('normalizes bounded report ranges',()=>{
    const query=(values:Record<string,string>)=>(name:string)=>values[name];
    expect(reportRange(query({startDate:'2026-01-01'}),new Date('2026-06-01T00:00:00Z'))).toMatchObject({start:'2026-01-01',end:'2026-01-30',startTs:'2026-01-01T00:00:00.000Z',endExclusiveTs:'2026-01-31T00:00:00.000Z'});
    expect(()=>reportRange(query({startDate:'2025-01-01',endDate:'2026-01-02'}))).toThrow();
  });
  it('matches the legacy UBL namespace, profile, references, escaping, and QR bytes',async()=>{
    const xml=await buildUbl(invoice,seller),validation=validateUbl(xml),golden=await readFile(new URL('../fixtures/invoice/first-invoice.xml',import.meta.url),'utf8');
    expect(xml).toBe(golden);
    expect(xml).toContain('<cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:zatca:sa:1p0:invoice</cbc:CustomizationID>');
    expect(xml).toContain('<cbc:ID>PIH</cbc:ID>');
    expect(xml).toContain('<cbc:ID>QR</cbc:ID>');
    expect(xml).toContain('Fixture &amp; Customer');
    expect(xml).toContain('Riyadh &lt;SA&gt;');
    expect(invoiceQr(invoice,seller)).toBe('AQpNeVRlY2hDYXJlAg8zMTA2NjI5ODYxMDAwMDMDGDIwMjYtMDItMDlUMTA6MzA6MDAuMDAwWgQGMTE1LjAwBQUxNS4wMA==');
    expect(validation.valid).toBe(true);
    expect(validation.profile).toBe('EN16931/ZATCA');
  });
  it('matches create-after-delete and latest-update chain golden outputs',async()=>{
    const fixture=JSON.parse(await readFile(new URL('../fixtures/invoice/chain-cases.json',import.meta.url),'utf8')) as {seller:Seller;cases:Array<{name:string;invoice:UblInvoice&{uuid:string;issueTimestamp:string;grandTotal:number};expectedHash:string;expectedQr:string;expectedXmlSha256:string}>};
    expect(fixture.cases.map(entry=>entry.name)).toEqual(['create-after-latest-delete','latest-invoice-update']);
    for(const entry of fixture.cases){const input=`${entry.invoice.invoiceNumber}|${entry.invoice.uuid}|${entry.invoice.issueTimestamp}|${entry.invoice.grandTotal.toFixed(2)}`,xml=await buildUbl(entry.invoice,fixture.seller);expect(await sha256(input),`${entry.name} chain hash`).toBe(entry.expectedHash);expect(invoiceQr(entry.invoice,fixture.seller),`${entry.name} TLV`).toBe(entry.expectedQr);expect(await sha256(xml),`${entry.name} complete XML bytes`).toBe(entry.expectedXmlSha256);expect(validateUbl(xml).valid).toBe(true);}
  });
});
