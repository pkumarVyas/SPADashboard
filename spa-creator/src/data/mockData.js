// ── Sales Orders with SPA eligibility (from D365 F&O via Dataverse) ─────────
// Each row = one SO line, header fields denormalised for the list view.
// eligibleSpa / confidence / reason are computed by GetSalesOrders Azure Function.
export const salesOrders = [
  { id: 'SO000521-1', soId: 'SO-000521', lineNum: 1, customerAccount: 'US-002',    customerName: 'Acme Industrial Corp',     orderDate: '2026-04-15', item: '100049',  description: 'Industrial Screw 1/4-20 x 1"',  uom: 'ea',  qty: 45,  unitPrice: 409.33, lineAmount: 18420, vendorId: 'Parker_US',  status: 'Open',   eligibleSpa: 'USMF-000002', spaDesc: 'WB_PRCLMSPA',        confidence: 97, reason: 'Active SPA — exact item and customer match',       matchType: 'auto',   expiresInDays: 45 },
  { id: 'SO000521-2', soId: 'SO-000521', lineNum: 2, customerAccount: 'US-002',    customerName: 'Acme Industrial Corp',     orderDate: '2026-04-15', item: '100050',  description: 'Hex Bolt 3/8-16 SS',             uom: 'ea',  qty: 120, unitPrice: 88.50,  lineAmount: 10620, vendorId: 'Parker_US',  status: 'Open',   eligibleSpa: 'USMF-000289', spaDesc: 'ADAD',               confidence: 92, reason: 'Active SPA — exact item and customer match',       matchType: 'auto',   expiresInDays: 12 },
  { id: 'SO000538-1', soId: 'SO-000538', lineNum: 1, customerAccount: 'US-008',    customerName: 'Northwind Engineering',    orderDate: '2026-04-18', item: 'ad-06',   description: 'Motor Drive Unit 15kW',          uom: 'ea',  qty: 12,  unitPrice: 3550.00, lineAmount: 42600, vendorId: '1001',       status: 'Open',   eligibleSpa: 'USMF-000298', spaDesc: 'adad',               confidence: 78, reason: 'Customer via group relation — verify account',     matchType: 'review', expiresInDays: 8  },
  { id: 'SO000541-1', soId: 'SO-000541', lineNum: 1, customerAccount: 'US-015',    customerName: 'Pioneer MFG Corp',         orderDate: '2026-04-20', item: '100049',  description: 'Industrial Screw 1/4-20 x 1"',  uom: 'ea',  qty: 200, unitPrice: 256.00,  lineAmount: 51200, vendorId: 'Parker_US',  status: 'Open',   eligibleSpa: 'USMF-000002', spaDesc: 'WB_PRCLMSPA',        confidence: 95, reason: 'Active SPA — exact item and customer match',       matchType: 'auto',   expiresInDays: 45 },
  { id: 'SO000545-1', soId: 'SO-000545', lineNum: 1, customerAccount: 'US-031',    customerName: 'Coastal Power Systems',    orderDate: '2026-04-21', item: 'ad-01',   description: 'Transformer 500kVA',             uom: 'ea',  qty: 6,   unitPrice: 14733.33,lineAmount: 88400, vendorId: 'AD-101',     status: 'Open',   eligibleSpa: 'USMF-000292', spaDesc: 'ad-demo-01',         confidence: 64, reason: 'Item via group relation — end-customer pass-through', matchType: 'review', expiresInDays: 3  },
  { id: 'SO000547-1', soId: 'SO-000547', lineNum: 1, customerAccount: 'US-002',    customerName: 'Acme Industrial Corp',     orderDate: '2026-04-22', item: '100049',  description: 'Industrial Screw 1/4-20 x 1"',  uom: 'ea',  qty: 18,  unitPrice: 1516.67, lineAmount: 27300, vendorId: 'Parker_US',  status: 'Open',   eligibleSpa: 'USMF-000002', spaDesc: 'WB_PRCLMSPA',        confidence: 99, reason: 'Active SPA — exact item and customer match',       matchType: 'auto',   expiresInDays: 45 },
  { id: 'SO000551-1', soId: 'SO-000551', lineNum: 1, customerAccount: 'US-044',    customerName: 'Delta Systems Inc',        orderDate: '2026-04-24', item: 'RW-1756', description: 'ControlLogix 1756 Processor',    uom: 'ea',  qty: 22,  unitPrice: 2918.18, lineAmount: 64200, vendorId: 'Rockwell',   status: 'Open',   eligibleSpa: null,          spaDesc: '',                   confidence: 0,  reason: 'No active SPA found for this item and customer',   matchType: 'none',   expiresInDays: 0  },
  { id: 'SO000554-1', soId: 'SO-000554', lineNum: 1, customerAccount: 'US-008',    customerName: 'Northwind Engineering',    orderDate: '2026-04-25', item: 'ad-02',   description: 'VFD Drive 22kW',                 uom: 'ea',  qty: 8,   unitPrice: 2875.00, lineAmount: 23000, vendorId: '1001',       status: 'Open',   eligibleSpa: 'USMF-000292', spaDesc: 'ad-demo-01',         confidence: 82, reason: 'Active SPA — exact item match, customer group',    matchType: 'review', expiresInDays: 8  },
  { id: 'SO000558-1', soId: 'SO-000558', lineNum: 1, customerAccount: 'US-019',    customerName: 'Summit Manufacturing',     orderDate: '2026-04-26', item: 'SE-CB-200A', description: 'Circuit Breaker 200A',        uom: 'ea',  qty: 30,  unitPrice: 612.00,  lineAmount: 18360, vendorId: 'Schneider',  status: 'Open',   eligibleSpa: null,          spaDesc: '',                   confidence: 0,  reason: 'No active SPA found for this item and customer',   matchType: 'none',   expiresInDays: 0  },
  { id: 'SO000561-1', soId: 'SO-000561', lineNum: 1, customerAccount: 'US-002',    customerName: 'Acme Industrial Corp',     orderDate: '2026-04-28', item: '100049',  description: 'Industrial Screw 1/4-20 x 1"',  uom: 'ea',  qty: 60,  unitPrice: 307.00,  lineAmount: 18420, vendorId: 'Parker_US',  status: 'Open',   eligibleSpa: 'USMF-000002', spaDesc: 'WB_PRCLMSPA',        confidence: 97, reason: 'Active SPA — exact item and customer match',       matchType: 'auto',   expiresInDays: 45 },
  { id: 'SO000563-1', soId: 'SO-000563', lineNum: 1, customerAccount: 'US-031',    customerName: 'Coastal Power Systems',    orderDate: '2026-04-29', item: 'ad-06',   description: 'Motor Drive Unit 15kW',          uom: 'ea',  qty: 4,   unitPrice: 3550.00, lineAmount: 14200, vendorId: '1001',       status: 'Open',   eligibleSpa: 'USMF-000298', spaDesc: 'adad',               confidence: 58, reason: 'Subsidiary account — manual verification required', matchType: 'review', expiresInDays: 2  },
];

// ── SPA Agreements (from D365 F&O via Dataverse virtual tables) ───────────────
export const spaAgreements = [
  { id: 'USMF-000279', spaCode: 'PRCLM', description: 'autostad',               status: 'Created', vendorId: '1001',   vendorApprovalId: '',        inactive: false, startDate: '2026-03-31', endDate: '2026-04-01', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '', version: '', rspType: '', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000280', spaCode: 'PRINF', description: "Charlie's Trailing Credit", status: 'Created', vendorId: 'HARBOR', vendorApprovalId: '67898',   inactive: true,  startDate: '2026-03-01', endDate: '2026-04-30', distributorDealId: 'DD-7801', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001001', version: '', rspType: '', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000283', spaCode: 'PPINF', description: 'Trailing Credit SPA',    status: 'Created', vendorId: 'HARBOR', vendorApprovalId: '87908',   inactive: false, startDate: '2026-03-01', endDate: '2026-04-29', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001001', version: '', rspType: '', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000284', spaCode: 'PRCLM', description: 'Trailing Credit SPA',    status: 'Created', vendorId: 'HARBOR', vendorApprovalId: '8789089', inactive: false, startDate: '2026-04-01', endDate: '2026-04-30', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001001', version: '', rspType: '', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000285', spaCode: 'PRPOC', description: 'adtest',                 status: 'Created', vendorId: '1001',   vendorApprovalId: '',        inactive: false, startDate: '2026-04-04', endDate: '2026-05-04', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001745', version: '', rspType: 'New', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000286', spaCode: 'PRPOC', description: 'ADAD',                   status: 'Created', vendorId: '1001',   vendorApprovalId: '',        inactive: false, startDate: '2026-04-04', endDate: '2026-05-04', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001745', version: '', rspType: 'New', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000287', spaCode: 'PRPOC', description: 'ADAD',                   status: 'Created', vendorId: '1001',   vendorApprovalId: '',        inactive: false, startDate: '2026-04-04', endDate: '2026-04-05', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001745', version: '', rspType: 'New', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000288', spaCode: 'PRPOC', description: 'ADAD',                   status: 'Created', vendorId: '1001',   vendorApprovalId: '230987',  inactive: false, startDate: '2026-04-07', endDate: '2026-05-07', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001745', version: '', rspType: 'New', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000289', spaCode: 'PRCLM', description: 'ADAD',                   status: 'Created', vendorId: '1001',   vendorApprovalId: '234890',  inactive: false, startDate: '2026-04-07', endDate: '2026-04-08', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001745', version: '', rspType: '', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000290', spaCode: 'PRCLM', description: 'ADAD',                   status: 'Created', vendorId: '1001',   vendorApprovalId: '238906',  inactive: false, startDate: '2026-04-07', endDate: '2026-04-08', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001745', version: '', rspType: '', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000291', spaCode: 'PRPOC', description: 'ADAD',                   status: 'Created', vendorId: '1001',   vendorApprovalId: '678900',  inactive: false, startDate: '2026-04-07', endDate: '2026-04-08', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001745', version: '', rspType: 'New', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000292', spaCode: 'PRPOC', description: 'ad-demo-01',             status: 'Created', vendorId: 'AD-101', vendorApprovalId: '347800',  inactive: true,  startDate: '2026-04-07', endDate: '2026-04-10', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001745', version: '1',  rspType: 'New', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000294', spaCode: 'PRCLM', description: 'AD-DEMO',                status: 'Created', vendorId: 'AD-101', vendorApprovalId: '346677',  inactive: true,  startDate: '2026-04-08', endDate: '2026-04-10', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001745', version: '1',  rspType: '', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000295', spaCode: 'PEPOC', description: 'AD-DEMO-02',             status: 'Created', vendorId: 'AD-101', vendorApprovalId: '',        inactive: false, startDate: '2026-04-08', endDate: '2026-04-11', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001745', version: '2',  rspType: 'New', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000296', spaCode: 'PRCLM', description: 'AD-DEMO-02',             status: 'Created', vendorId: 'AD-101', vendorApprovalId: '',        inactive: false, startDate: '2026-04-08', endDate: '2026-04-10', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001745', version: '2',  rspType: '', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000297', spaCode: 'PRPOC', description: 'adad',                   status: 'Created', vendorId: '1001',   vendorApprovalId: '',        inactive: false, startDate: '2026-04-09', endDate: '2026-05-09', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001745', version: '',  rspType: 'New', rspId: '', rspCompanyId: '' },
  { id: 'USMF-000298', spaCode: 'PRPOC', description: 'adad',                   status: 'Created', vendorId: '1001',   vendorApprovalId: '238800',  inactive: false, startDate: '2026-04-14', endDate: '2026-04-15', distributorDealId: '', systemExchangeRate: 100, quantityBreak: false, sourceSpaId: '', companyId: 'USMF', manufacturer: '000001745', version: '',  rspType: 'New', rspId: '', rspCompanyId: '' },
];

export const spaAgreementLines = {
  'USMF-000298': [
    { id: 'L298-1', spaId: 'USMF-000298', lineNum: 1, spaCode: 'PRPOC', productRelation: 'Table', item: 'ad-06', customerExtItem: '', bundle: false, customerRelation: 'Table', partialSpa: false, customer: 'Cust-Dummy-US', gabId: '000007144', minQty: 0, maxQty: 1000, spaCostType: 'M', discountAmount: 0.00, claimCurrency: 'USD' },
  ],
  'USMF-000292': [
    { id: 'L292-1', spaId: 'USMF-000292', lineNum: 1, spaCode: 'PRPOC', productRelation: 'Table', item: 'ad-01', customerExtItem: '', bundle: false, customerRelation: 'Table', partialSpa: false, customer: 'Cust-Demo-101', gabId: '000007100', minQty: 0, maxQty: 500,  spaCostType: 'M', discountAmount: 5.00,  claimCurrency: 'USD' },
    { id: 'L292-2', spaId: 'USMF-000292', lineNum: 2, spaCode: 'PRPOC', productRelation: 'Table', item: 'ad-02', customerExtItem: '', bundle: false, customerRelation: 'Table', partialSpa: false, customer: 'Cust-Demo-101', gabId: '000007101', minQty: 0, maxQty: 500,  spaCostType: 'M', discountAmount: 3.50,  claimCurrency: 'USD' },
  ],
  'USMF-000288': [
    { id: 'L288-1', spaId: 'USMF-000288', lineNum: 1, spaCode: 'PRPOC', productRelation: 'Table', item: 'ad-06', customerExtItem: 'EXT-06', bundle: false, customerRelation: 'Table', partialSpa: false, customer: 'Cust-ADAD-Main', gabId: '000006900', minQty: 10, maxQty: 2000, spaCostType: 'M', discountAmount: 12.00, claimCurrency: 'USD' },
    { id: 'L288-2', spaId: 'USMF-000288', lineNum: 2, spaCode: 'PRPOC', productRelation: 'Group', item: 'GRP-ADAD', customerExtItem: '', bundle: false, customerRelation: 'Table', partialSpa: false, customer: 'Cust-ADAD-Main', gabId: '', minQty: 0, maxQty: 0, spaCostType: 'M', discountAmount: 8.00, claimCurrency: 'USD' },
  ],
};

// ── SPA Import documents ──────────────────────────────────────────────────────
export const spaImports = [
  {
    id: 'DOC-001',
    fileName: 'TIS-SPA-2026-Q2-3389.pdf',
    importedAt: '5/7/2026 9:14 AM',
    source: 'Email',
    status: 'Pending Review',
    // Header — maps to cr_spaimports Dataverse table
    spaNumber:      'TIS-2026-Q2-3389',
    distributor:    'Distributor Co (Acct #DC-7711)',
    customer:       'Greenfield Manufacturing LLC',
    customerAcct:   'GFM-552134',
    effectiveDate:  '2026-05-01',
    expirationDate: '2026-12-31',
    pricingMethod:  'Net Deviated Cost (claim-back)',
    // Lines — maps to cr_spaimportlines Dataverse table
    lines: [
      { line: 1, mfrPartNo: 'TI-HX-1420-SS',   description: 'Hex Cap Screw 1/4-20 x 1" SS',  uom: 'BX-100', listPrice: 18.40, spaNetCost: 11.96, discountPct: null, minQty: 10  },
      { line: 2, mfrPartNo: 'TI-HX-1420-SS-2',  description: 'Hex Cap Screw 1/4-20 x 2" SS',  uom: 'BX-100', listPrice: 22.85, spaNetCost: 14.85, discountPct: null, minQty: 10  },
      { line: 3, mfrPartNo: 'TI-HX-3816-SS',    description: 'Hex Cap Screw 3/8-16 x 1" SS',  uom: 'BX-50',  listPrice: 14.20, spaNetCost:  9.23, discountPct: null, minQty:  5  },
      { line: 4, mfrPartNo: 'TI-WSH-14-SS',     description: 'Flat Washer 1/4 SS',             uom: 'BX-500', listPrice:  9.75, spaNetCost:  6.34, discountPct: null, minQty:  4  },
      { line: 5, mfrPartNo: 'TI-LWSH-14-SS',    description: 'Lock Washer 1/4 Split SS',       uom: 'BX-500', listPrice: 11.90, spaNetCost:  7.74, discountPct: null, minQty:  4  },
      { line: 6, mfrPartNo: 'TI-NUT-1420-SS',   description: 'Hex Nut 1/4-20 SS',             uom: 'BX-200', listPrice:  6.45, spaNetCost:  4.19, discountPct: null, minQty:  8  },
      { line: 7, mfrPartNo: 'TI-ANCH-38',       description: 'Wedge Anchor 3/8 x 3" Zinc',    uom: 'EA',     listPrice:  2.85, spaNetCost:  1.71, discountPct: 40.0, minQty: 100 },
      { line: 8, mfrPartNo: 'TI-ANCH-12',       description: 'Wedge Anchor 1/2 x 4" Zinc',    uom: 'EA',     listPrice:  4.10, spaNetCost:  2.46, discountPct: 40.0, minQty:  50 },
    ],
  },
  {
    id: 'DOC-002',
    fileName: 'ABB-SPA-2026-0441.pdf',
    importedAt: '5/6/2026 2:30 PM',
    source: 'Portal',
    status: 'Extracted',
    spaNumber:      'ABB-2026-0441',
    distributor:    'Regional Electric (Acct #RE-2201)',
    customer:       'Summit Manufacturing',
    customerAcct:   'SMF-338821',
    effectiveDate:  '2026-05-01',
    expirationDate: '2026-10-31',
    pricingMethod:  'Net Deviated Cost (claim-back)',
    lines: [
      { line: 1, mfrPartNo: 'ABB-MOT-75K',  description: 'ABB Motor 75kW IE3',      uom: 'EA', listPrice: 5200.00, spaNetCost: 3900.00, discountPct: 25.0, minQty: 1 },
      { line: 2, mfrPartNo: 'ABB-DRV-ACS',  description: 'ACS880 Variable Drive',   uom: 'EA', listPrice: 4100.00, spaNetCost: 3075.00, discountPct: 25.0, minQty: 1 },
    ],
  },
  {
    id: 'DOC-003',
    fileName: 'SCH-SPA-2026-1190.xlsx',
    importedAt: '5/5/2026 11:02 AM',
    source: 'Email',
    status: 'Approved',
    spaNumber:      'SCH-2026-1190',
    distributor:    'Acme Electric Dist (Acct #AE-0091)',
    customer:       'Pioneer Manufacturing',
    customerAcct:   'PMF-771209',
    effectiveDate:  '2026-04-01',
    expirationDate: '2026-12-31',
    pricingMethod:  'Special Net Price',
    lines: [
      { line: 1, mfrPartNo: 'SE-CB-200A',  description: 'Circuit Breaker 200A', uom: 'EA', listPrice: 1800.00, spaNetCost: 1260.00, discountPct: 30.0, minQty: 5 },
      { line: 2, mfrPartNo: 'SE-PLC-M580', description: 'Modicon M580 PLC',     uom: 'EA', listPrice: 4500.00, spaNetCost: 3150.00, discountPct: 30.0, minQty: 2 },
    ],
  },
  {
    id: 'DOC-004',
    fileName: 'EAT-SPA-2026-0881.pdf',
    importedAt: '5/4/2026 8:45 AM',
    source: 'SFTP',
    status: 'Exception',
    spaNumber: '', distributor: '', customer: '', customerAcct: '',
    effectiveDate: '', expirationDate: '', pricingMethod: '',
    lines: [],
  },
];

export const importStats = [
  { label: 'Imported today',    value: '47',      sub: '+18% vs avg',             color: 'green'  },
  { label: 'In pipeline',       value: '21',      sub: 'Across 5 stages',         color: 'purple' },
  { label: 'Awaiting review',   value: '18',      sub: '6 OCR · 7 mapping · 5 dup', color: 'orange' },
  { label: 'Auto-ingested 24h', value: '89%',     sub: 'Target ≥ 85%',            color: 'green'  },
  { label: 'Avg time-to-ingest',value: '3.4 min', sub: 'P95: 12 min',             color: 'gray'   },
];

export const channels = [
  { icon: '⇌', name: 'Vendor portals (API)', detail: 'Schneider, ABB, Siemens, Eaton, Rockwell', count: 5, status: 'green'  },
  { icon: '✉', name: 'Email intake',          detail: 'spa-intake@yourco.com · 14 today',         count: 1, status: 'green'  },
  { icon: '↑', name: 'Manual upload',          detail: 'PDF, XLSX, CSV · drag-drop below',         count: 1, status: 'green'  },
  { icon: '⇄', name: 'EDI feed (832/845)',     detail: 'Eaton, Rockwell · nightly batch',          count: 2, status: 'green'  },
  { icon: '📁', name: 'SFTP / SharePoint',     detail: '1 folder unreachable since 4 h',           count: 3, status: 'orange' },
];

export const overviewStats = [
  { label: 'Active SPAs',      value: '312',   sub: '+4 this week',   color: 'green'  },
  { label: 'Expiring in 30 d', value: '14',    sub: 'Action needed',  color: 'orange' },
  { label: 'Vendors covered',  value: '38',    sub: 'of 42 approved', color: 'gray'   },
  { label: 'Total SPA value',  value: '$8.4M', sub: '+12% YoY',       color: 'green'  },
  { label: 'Avg SPA duration', value: '14 mo', sub: 'Median',         color: 'gray'   },
];

export const retroStats = [
  { label: 'Eligible orders found', value: '47',      sub: 'Last 30 days',      color: 'orange' },
  { label: 'Total recoverable',     value: '$284K',   sub: 'Avg $6,043 / order', color: 'gray'   },
  { label: 'Auto-matchable',        value: '31 / 47', sub: 'Confidence > 90%',  color: 'green'  },
];

export const retroOrders = [
  { po: 'PO-88421', customer: 'Acme Industrial', vendor: 'Schneider', sku: 'SE-CB-200A',   qty: 45,  value: '$18,420', spa: 'SPA-2024-1180', reason: 'SPA created 3 days after PO',   confidence: 98, action: 'apply'  },
  { po: 'PO-88107', customer: 'Northwind Eng.',  vendor: 'ABB',       sku: 'ABB-MOT-75K', qty: 12,  value: '$42,600', spa: 'SPA-2024-0993', reason: 'Customer alias not mapped',      confidence: 76, action: 'review' },
  { po: 'PO-87922', customer: 'Pioneer MFG',     vendor: 'Siemens',   sku: 'S-DRV-15A',   qty: 200, value: '$51,200', spa: 'SPA-2024-1077', reason: 'Backdated SPA approval',         confidence: 95, action: 'apply'  },
  { po: 'PO-87841', customer: 'Coastal Power',   vendor: 'Eaton',     sku: 'ET-XFR-500',  qty: 6,   value: '$88,400', spa: 'SPA-2024-1201', reason: 'End-customer pass-through',      confidence: 64, action: 'review' },
  { po: 'PO-87655', customer: 'Acme Industrial', vendor: 'Schneider', sku: 'SE-PLC-M580', qty: 18,  value: '$27,300', spa: 'SPA-2024-1180', reason: 'SPA created 12 days after PO',  confidence: 99, action: 'apply'  },
  { po: 'PO-87521', customer: 'Delta Systems',   vendor: 'Rockwell',  sku: 'RW-1756',     qty: 22,  value: '$64,200', spa: 'SPA-2024-1034', reason: 'Subsidiary not linked',          confidence: 58, action: 'review' },
];

export const atRiskSPAs = [
  { id: 'SPA-2024-0881', parties: 'Schneider · Acme Industrial', expiry: '2025-08-15', used: 9420, total: 10000, pct: 94, value: '$312K', color: 'orange' },
  { id: 'SPA-2024-1042', parties: 'ABB · Northwind Eng.',        expiry: '2025-09-30', used: 4750, total:  5000, pct: 95, value: '$198K', color: 'red'    },
  { id: 'SPA-2024-0712', parties: 'Siemens · Pioneer MFG',       expiry: '2025-07-22', used:  880, total:  1000, pct: 88, value: '$144K', color: 'orange' },
  { id: 'SPA-2024-1180', parties: 'Schneider · Acme Industrial', expiry: '2025-12-31', used: 2710, total:  3000, pct: 90, value: '$89K',  color: 'orange' },
];

export const claimsStats = [
  { label: 'Submitted MTD',   value: '$1.34M', sub: '+8.1% vs Apr',        color: 'green'  },
  { label: 'Paid MTD',        value: '$1.08M', sub: '80.5% pay rate',       color: 'green'  },
  { label: 'Disputed',        value: '$88K',   sub: '6.5% of submitted',    color: 'orange' },
  { label: 'Avg days to pay', value: '34 d',   sub: 'Eaton fastest @ 21d',  color: 'purple' },
];

export const chartData = [
  { month: 'Nov', submitted: 760,  paid: 710,  disputed: 55  },
  { month: 'Dec', submitted: 870,  paid: 770,  disputed: 90  },
  { month: 'Jan', submitted: 1055, paid: 1050, disputed: 128 },
  { month: 'Feb', submitted: 1045, paid: 785,  disputed: 88  },
  { month: 'Mar', submitted: 1200, paid: 1005, disputed: 135 },
  { month: 'Apr', submitted: 1300, paid: 1075, disputed: 162 },
  { month: 'May', submitted: 1400, paid: 1110, disputed: 130 },
];

export const agingBuckets = [
  { label: '0–30 d',  claims: 142, amount: '$480K', pct: 92, tier: 'low',  danger: false },
  { label: '31–60 d', claims: 88,  amount: '$312K', pct: 62, tier: 'med',  danger: false },
  { label: '61–90 d', claims: 34,  amount: '$127K', pct: 28, tier: 'high', danger: false },
  { label: '90+ d',   claims: 11,  amount: '$44K',  pct: 10, tier: 'crit', danger: true  },
];

export const spaRepo = [
  { id: 'SPA-2024-1180', name: 'Q3 Distributor Price',    vendor: 'Schneider', customer: 'Acme Industrial', effective: '2024-07-01', expiry: '2025-12-31', value: '$312K', status: 'active'   },
  { id: 'SPA-2024-1042', name: 'Motor Drive Agreement',   vendor: 'ABB',       customer: 'Northwind Eng.',  effective: '2024-03-15', expiry: '2025-09-30', value: '$198K', status: 'expiring' },
  { id: 'SPA-2024-0881', name: 'Industrial Controls SPA', vendor: 'Schneider', customer: 'Acme Industrial', effective: '2024-01-01', expiry: '2025-08-15', value: '$89K',  status: 'expiring' },
  { id: 'SPA-2024-0712', name: 'Drive Systems Rebate',    vendor: 'Siemens',   customer: 'Pioneer MFG',     effective: '2024-01-15', expiry: '2025-07-22', value: '$144K', status: 'expiring' },
  { id: 'SPA-2023-0441', name: 'Annual Transformer Deal', vendor: 'Eaton',     customer: 'Coastal Power',   effective: '2023-06-01', expiry: '2024-12-31', value: '$221K', status: 'expired'  },
];

export const syncStats = [
  { label: 'Last sync',         value: '2 min ago', sub: 'On schedule',     color: 'green'  },
  { label: 'Sync errors (24h)', value: '3',         sub: '2 retrying',      color: 'orange' },
  { label: 'Queue depth',       value: '0',         sub: 'All clear',       color: 'green'  },
  { label: 'Avg sync time',     value: '1.2 s',     sub: 'Per SPA record',  color: 'gray'   },
];

export const syncEvents = [
  { time: '12:41 PM', spa: 'SPA-2024-1180', op: 'CreateSPA',    status: 'success',  duration: '0.9 s' },
  { time: '12:38 PM', spa: 'SPA-2024-0993', op: 'UpdatePricing', status: 'error',   duration: '—'     },
  { time: '12:35 PM', spa: 'SPA-2024-1042', op: 'CreateSPA',    status: 'success',  duration: '1.4 s' },
  { time: '12:31 PM', spa: 'SPA-2024-1201', op: 'CreateSPA',    status: 'retrying', duration: '—'     },
];
