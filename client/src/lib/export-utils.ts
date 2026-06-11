import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include lastAutoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

// PDF Document Styles - Using app theme colors
// Primary color: HSL(183, 57%, 41%) = RGB(45, 158, 164) - Teal
const COLORS = {
  primary: [45, 158, 164] as [number, number, number], // Teal (matches app theme)
  secondary: [107, 114, 128] as [number, number, number], // Gray
  success: [16, 185, 129] as [number, number, number], // Green
  warning: [245, 158, 11] as [number, number, number], // Yellow
  danger: [239, 68, 68] as [number, number, number], // Red
  text: [17, 24, 39] as [number, number, number], // Dark gray
  muted: [107, 114, 128] as [number, number, number], // Medium gray
  background: [249, 250, 251] as [number, number, number], // Light gray
};

// Utility to format currency
export function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value || 0);
  return `CA$${num.toFixed(2)}`;
}

// Utility to format numbers with locale
export function formatNumber(value: number | string | null | undefined): string {
  const num = Number(value || 0);
  return num.toLocaleString();
}

// Utility to format percentage
export function formatPercent(value: number | string | null | undefined): string {
  const num = Number(value || 0);
  return `${num.toFixed(1)}%`;
}

// Utility to format date
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// CSV Export Helper
export function downloadCSV(data: string[][], filename: string, headers?: string[]): void {
  const rows = headers ? [headers, ...data] : data;
  const csvContent = rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// PDF Report Types
export interface PDFReportOptions {
  title: string;
  subtitle?: string;
  dateRange?: string;
  generatedBy?: string;
}

// Create base PDF document with header
export function createPDFDocument(options: PDFReportOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Header background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title, margin, 18);

  // Subtitle
  if (options.subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(options.subtitle, margin, 26);
  }

  // Date range (right aligned)
  if (options.dateRange) {
    doc.setFontSize(10);
    doc.text(options.dateRange, pageWidth - margin, 18, { align: 'right' });
  }

  // Generated date
  doc.setFontSize(9);
  doc.text(
    `Generated: ${new Date().toLocaleString()}`,
    pageWidth - margin,
    26,
    { align: 'right' }
  );

  // Reset text color
  doc.setTextColor(...COLORS.text);

  return doc;
}

// Add section header
export function addSectionHeader(doc: jsPDF, title: string, y: number): number {
  const margin = 15;

  doc.setFillColor(...COLORS.background);
  doc.rect(margin, y, doc.internal.pageSize.getWidth() - margin * 2, 8, 'F');

  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin + 3, y + 5.5);

  doc.setTextColor(...COLORS.text);

  return y + 12;
}

// Add metrics grid
export interface MetricItem {
  label: string;
  value: string;
  subValue?: string;
}

export function addMetricsGrid(doc: jsPDF, metrics: MetricItem[], y: number, columns: number = 4): number {
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const availableWidth = pageWidth - margin * 2;
  const cardWidth = availableWidth / columns - 3;
  const cardHeight = 22;
  const gap = 4;

  metrics.forEach((metric, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + col * (cardWidth + gap);
    const cardY = y + row * (cardHeight + gap);

    // Card background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COLORS.background);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'FD');

    // Label
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(metric.label, x + 3, cardY + 6);

    // Value
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(metric.value, x + 3, cardY + 14);

    // Sub value
    if (metric.subValue) {
      doc.setTextColor(...COLORS.muted);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(metric.subValue, x + 3, cardY + 19);
    }
  });

  const rows = Math.ceil(metrics.length / columns);
  return y + rows * (cardHeight + gap) + 5;
}

// Add table to PDF
export interface TableOptions {
  head: string[][];
  body: (string | number)[][];
  startY: number;
  theme?: 'striped' | 'grid' | 'plain';
  headStyles?: Record<string, any>;
  columnStyles?: Record<number, Record<string, any>>;
}

export function addTable(doc: jsPDF, options: TableOptions): number {
  const margin = 15;

  autoTable(doc, {
    head: options.head,
    body: options.body,
    startY: options.startY,
    margin: { left: margin, right: margin },
    theme: options.theme || 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 3,
      ...options.headStyles,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: COLORS.text,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: options.columnStyles,
  });

  return doc.lastAutoTable?.finalY || options.startY + 20;
}

// Add text paragraph
export function addParagraph(doc: jsPDF, text: string, y: number, options?: { fontSize?: number; color?: [number, number, number] }): number {
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setTextColor(...(options?.color || COLORS.text));
  doc.setFontSize(options?.fontSize || 10);
  doc.setFont('helvetica', 'normal');

  const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
  doc.text(lines, margin, y);

  return y + lines.length * 5 + 3;
}

// Add page footer
export function addPageFooter(doc: jsPDF, pageNumber: number, totalPages: number): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  doc.setDrawColor(...COLORS.background);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text('AffiliateXchange Platform', margin, pageHeight - 10);
}

// Save PDF
export function savePDF(doc: jsPDF, filename: string): void {
  // Add page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter(doc, i, totalPages);
  }

  doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
}

// ================== Analytics Export Functions ==================

export interface AnalyticsData {
  totalEarnings?: number;
  totalSpent?: number;
  affiliateEarnings?: number;
  affiliateSpent?: number;
  retainerEarnings?: number;
  retainerSpent?: number;
  totalClicks?: number;
  uniqueClicks?: number;
  conversions?: number;
  conversionRate?: number;
  activeOffers?: number;
  activeCreators?: number;
  chartData?: Array<{
    date: string;
    clicks: number;
    conversions: number;
    earnings: number;
  }>;
  offerBreakdown?: Array<{
    offerId: string;
    offerTitle: string;
    companyName?: string;
    clicks: number;
    conversions: number;
    earnings: number;
  }>;
  conversionFunnel?: {
    applied: number;
    approved: number;
    active: number;
    paused: number;
    completed: number;
    conversions: number;
  };
  acquisitionSources?: Array<{ source: string; creators: number }>;
  geography?: Array<{ country: string; count: number }>;
  applicationsTimeline?: Array<{
    date: string;
    total: number;
    pending: number;
    approved: number;
    active: number;
    paused: number;
    completed: number;
  }>;
}

export function exportAnalyticsPDF(
  analytics: AnalyticsData,
  options: {
    isCompany: boolean;
    dateRange: string;
    applicationId?: string;
    offerTitle?: string;
  }
): void {
  const dateRangeLabels: Record<string, string> = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    'all': 'All Time',
  };

  const title = options.applicationId
    ? options.isCompany
      ? 'Application Analytics Report'
      : 'Application Performance Report'
    : options.isCompany
    ? 'Company Analytics Report'
    : 'Creator Analytics Report';

  const doc = createPDFDocument({
    title,
    subtitle: options.offerTitle || (options.isCompany ? 'Company Dashboard Export' : 'Creator Dashboard Export'),
    dateRange: dateRangeLabels[options.dateRange] || options.dateRange,
  });

  let y = 45;

  // Summary Section
  y = addSectionHeader(doc, 'Performance Summary', y);

  const metrics: MetricItem[] = options.isCompany
    ? [
        {
          label: 'Total Spend',
          value: formatCurrency(analytics.totalSpent || analytics.totalEarnings),
          subValue: `Affiliate: ${formatCurrency(analytics.affiliateSpent)} | Retainer: ${formatCurrency(analytics.retainerSpent)}`,
        },
        {
          label: 'Active Offers',
          value: formatNumber(analytics.activeOffers),
          subValue: `${formatNumber(analytics.activeCreators)} active creators`,
        },
        {
          label: 'Total Clicks',
          value: formatNumber(analytics.totalClicks),
          subValue: `${formatNumber(analytics.uniqueClicks)} unique visitors`,
        },
        {
          label: 'Conversion Rate',
          value: formatPercent(analytics.conversionRate),
          subValue: `${formatNumber(analytics.conversions)} total conversions`,
        },
      ]
    : [
        {
          label: 'Total Earnings',
          value: formatCurrency(analytics.totalEarnings),
          subValue: `Affiliate: ${formatCurrency(analytics.affiliateEarnings)} | Retainer: ${formatCurrency(analytics.retainerEarnings)}`,
        },
        {
          label: 'Active Offers',
          value: formatNumber(analytics.activeOffers),
        },
        {
          label: 'Total Clicks',
          value: formatNumber(analytics.totalClicks),
          subValue: `${formatNumber(analytics.uniqueClicks)} unique visitors`,
        },
        {
          label: 'Conversion Rate',
          value: formatPercent(analytics.conversionRate),
          subValue: `${formatNumber(analytics.conversions)} conversions`,
        },
      ];

  y = addMetricsGrid(doc, metrics, y);

  // Performance Timeline
  if (analytics.chartData && analytics.chartData.length > 0) {
    y = addSectionHeader(doc, 'Performance Timeline', y);

    const timelineData = analytics.chartData.map((item) => [
      item.date,
      formatNumber(item.clicks),
      formatNumber(item.conversions),
      formatCurrency(item.earnings),
    ]);

    y = addTable(doc, {
      head: [['Date', 'Clicks', 'Conversions', 'Earnings']],
      body: timelineData,
      startY: y,
      columnStyles: {
        0: { cellWidth: 40 },
        3: { halign: 'right' },
      },
    });

    y += 5;
  }

  // Offer Breakdown (if not application-specific)
  if (!options.applicationId && analytics.offerBreakdown && analytics.offerBreakdown.length > 0) {
    y = addSectionHeader(doc, 'Performance by Offer', y);

    const offerData = analytics.offerBreakdown.map((offer) => [
      offer.offerTitle,
      offer.companyName || '-',
      formatNumber(offer.clicks),
      formatNumber(offer.conversions),
      formatCurrency(offer.earnings),
    ]);

    y = addTable(doc, {
      head: [['Offer', options.isCompany ? 'Creator' : 'Company', 'Clicks', 'Conversions', options.isCompany ? 'Spent' : 'Earnings']],
      body: offerData,
      startY: y,
      columnStyles: {
        4: { halign: 'right' },
      },
    });

    y += 5;
  }

  // Conversion Funnel (Company only)
  if (options.isCompany && analytics.conversionFunnel) {
    // Check if we need a new page
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    y = addSectionHeader(doc, 'Conversion Funnel', y);

    const funnelData = [
      ['Applied', formatNumber(analytics.conversionFunnel.applied)],
      ['Approved', formatNumber(analytics.conversionFunnel.approved)],
      ['Active', formatNumber(analytics.conversionFunnel.active)],
      ['Paused', formatNumber(analytics.conversionFunnel.paused)],
      ['Completed', formatNumber(analytics.conversionFunnel.completed)],
      ['Converted', formatNumber(analytics.conversionFunnel.conversions)],
    ];

    y = addTable(doc, {
      head: [['Stage', 'Count']],
      body: funnelData,
      startY: y,
      theme: 'grid',
    });

    y += 5;
  }

  // Acquisition Sources (Company only)
  if (options.isCompany && analytics.acquisitionSources && analytics.acquisitionSources.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    y = addSectionHeader(doc, 'Creator Acquisition Sources', y);

    const sourceData = analytics.acquisitionSources.map((item) => [
      item.source || 'Direct/Other',
      formatNumber(item.creators),
    ]);

    y = addTable(doc, {
      head: [['Source', 'Creators']],
      body: sourceData,
      startY: y,
    });

    y += 5;
  }

  // Geographic Distribution (Company only)
  if (options.isCompany && analytics.geography && analytics.geography.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    y = addSectionHeader(doc, 'Geographic Distribution', y);

    const geoData = analytics.geography.map((item) => [
      item.country || 'Unknown',
      formatNumber(item.count),
    ]);

    y = addTable(doc, {
      head: [['Country', 'Count']],
      body: geoData,
      startY: y,
    });
  }

  // Save the PDF
  const filename = options.applicationId
    ? `application-analytics-${options.applicationId}`
    : options.isCompany
    ? 'company-analytics-report'
    : 'creator-analytics-report';

  savePDF(doc, filename);
}

// ================== Creator List Export Functions ==================

export interface CreatorExportData {
  id: string;
  name: string;
  email: string;
  offer: string;
  status: string;
  performance: string;
  clicks: number;
  conversions: number;
  earnings: number;
  joinDate: string;
}

export function exportCreatorListPDF(
  creators: CreatorExportData[],
  options: {
    title?: string;
    filterInfo?: string;
  } = {}
): void {
  const doc = createPDFDocument({
    title: options.title || 'Creator Management Report',
    subtitle: options.filterInfo || 'Filtered Creator List',
  });

  let y = 45;

  // Summary Stats
  y = addSectionHeader(doc, 'Summary', y);

  const totalCreators = creators.length;
  const totalClicks = creators.reduce((sum, c) => sum + c.clicks, 0);
  const totalConversions = creators.reduce((sum, c) => sum + c.conversions, 0);
  const totalEarnings = creators.reduce((sum, c) => sum + c.earnings, 0);

  const metrics: MetricItem[] = [
    { label: 'Total Creators', value: formatNumber(totalCreators) },
    { label: 'Total Clicks', value: formatNumber(totalClicks) },
    { label: 'Total Conversions', value: formatNumber(totalConversions) },
    { label: 'Total Earnings', value: formatCurrency(totalEarnings) },
  ];

  y = addMetricsGrid(doc, metrics, y);

  // Creator Table
  y = addSectionHeader(doc, 'Creator Details', y);

  const tableData = creators.map((c) => [
    c.name,
    c.email,
    c.offer,
    c.status,
    c.performance,
    formatNumber(c.clicks),
    formatNumber(c.conversions),
    formatCurrency(c.earnings),
    c.joinDate,
  ]);

  addTable(doc, {
    head: [['Name', 'Email', 'Offer', 'Status', 'Performance', 'Clicks', 'Conv.', 'Earnings', 'Join Date']],
    body: tableData,
    startY: y,
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30 },
      7: { halign: 'right' },
    },
  });

  savePDF(doc, 'creator-management-report');
}

export function exportCreatorListCSV(creators: CreatorExportData[]): void {
  const headers = [
    'Name',
    'Email',
    'Offer',
    'Status',
    'Performance',
    'Clicks',
    'Conversions',
    'Earnings',
    'Join Date',
  ];

  const data = creators.map((c) => [
    c.name,
    c.email,
    c.offer,
    c.status,
    c.performance,
    c.clicks.toString(),
    c.conversions.toString(),
    formatCurrency(c.earnings),
    c.joinDate,
  ]);

  downloadCSV(data, 'creator-management', headers);
}

// ================== Admin Reports Export Functions ==================

export interface AdminFinancialData {
  totalRevenue: number;
  listingFees: number;
  platformFees: number;
  processingFees: number;
  totalPayouts: number;
  pendingPayouts: number;
  completedPayouts: number;
  disputedPayments: number;
  revenueByPeriod?: Array<{
    period: string;
    listingFees: number;
    platformFees: number;
    processingFees: number;
    total: number;
  }>;
  payoutsByPeriod?: Array<{
    period: string;
    amount: number;
    count: number;
  }>;
}

export function exportAdminFinancialReportPDF(data: AdminFinancialData): void {
  const doc = createPDFDocument({
    title: 'Financial Report',
    subtitle: 'Platform Revenue & Payouts',
  });

  let y = 45;

  // Revenue Summary
  y = addSectionHeader(doc, 'Revenue Summary', y);

  const revenueMetrics: MetricItem[] = [
    { label: 'Total Revenue', value: formatCurrency(data.totalRevenue) },
    { label: 'Listing Fees', value: formatCurrency(data.listingFees) },
    { label: 'Platform Fees (4%)', value: formatCurrency(data.platformFees) },
    { label: 'Processing Fees (3%)', value: formatCurrency(data.processingFees) },
  ];

  y = addMetricsGrid(doc, revenueMetrics, y);

  // Payout Summary
  y = addSectionHeader(doc, 'Payout Summary', y);

  const payoutMetrics: MetricItem[] = [
    { label: 'Total Payouts', value: formatCurrency(data.totalPayouts) },
    { label: 'Pending Payouts', value: formatCurrency(data.pendingPayouts) },
    { label: 'Completed Payouts', value: formatCurrency(data.completedPayouts) },
    { label: 'Disputed Payments', value: formatCurrency(data.disputedPayments) },
  ];

  y = addMetricsGrid(doc, payoutMetrics, y);

  // Revenue by Period
  if (data.revenueByPeriod && data.revenueByPeriod.length > 0) {
    y = addSectionHeader(doc, 'Revenue by Period', y);

    const revenueData = data.revenueByPeriod.map((r) => [
      r.period,
      formatCurrency(r.listingFees),
      formatCurrency(r.platformFees),
      formatCurrency(r.processingFees),
      formatCurrency(r.total),
    ]);

    y = addTable(doc, {
      head: [['Period', 'Listing Fees', 'Platform Fees', 'Processing Fees', 'Total']],
      body: revenueData,
      startY: y,
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
    });
  }

  // Payouts by Period
  if (data.payoutsByPeriod && data.payoutsByPeriod.length > 0) {
    if (y > 200) {
      doc.addPage();
      y = 20;
    }

    y = addSectionHeader(doc, 'Payouts by Period', y);

    const payoutData = data.payoutsByPeriod.map((p) => [
      p.period,
      formatCurrency(p.amount),
      formatNumber(p.count),
    ]);

    addTable(doc, {
      head: [['Period', 'Amount', 'Count']],
      body: payoutData,
      startY: y,
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
      },
    });
  }

  savePDF(doc, 'admin-financial-report');
}

export interface AdminUserStats {
  totalUsers: number;
  totalCreators: number;
  totalCompanies: number;
  totalAdmins: number;
  newUsersThisWeek: number;
  newCreatorsThisWeek: number;
  newCompaniesThisWeek: number;
  activeCreators: number;
  activeCompanies: number;
  pendingCompanies: number;
  suspendedUsers: number;
  userGrowth?: Array<{
    period: string;
    creators: number;
    companies: number;
    total: number;
  }>;
  topCreators?: Array<{
    name: string;
    email: string;
    earnings: number;
    clicks: number;
    conversions: number;
  }>;
  topCompanies?: Array<{
    name: string;
    offers: number;
    spend: number;
    creators: number;
  }>;
}

export function exportAdminUserReportPDF(data: AdminUserStats): void {
  const doc = createPDFDocument({
    title: 'User Report',
    subtitle: 'Platform User Statistics',
  });

  let y = 45;

  // User Overview
  y = addSectionHeader(doc, 'User Overview', y);

  const userMetrics: MetricItem[] = [
    { label: 'Total Users', value: formatNumber(data.totalUsers) },
    { label: 'Creators', value: formatNumber(data.totalCreators), subValue: `${data.newCreatorsThisWeek} this week` },
    { label: 'Companies', value: formatNumber(data.totalCompanies), subValue: `${data.newCompaniesThisWeek} this week` },
    { label: 'Admins', value: formatNumber(data.totalAdmins) },
  ];

  y = addMetricsGrid(doc, userMetrics, y);

  // Activity Stats
  y = addSectionHeader(doc, 'Activity Statistics', y);

  const activityMetrics: MetricItem[] = [
    { label: 'Active Creators', value: formatNumber(data.activeCreators) },
    { label: 'Active Companies', value: formatNumber(data.activeCompanies) },
    { label: 'Pending Companies', value: formatNumber(data.pendingCompanies) },
    { label: 'Suspended Users', value: formatNumber(data.suspendedUsers) },
  ];

  y = addMetricsGrid(doc, activityMetrics, y);

  // User Growth
  if (data.userGrowth && data.userGrowth.length > 0) {
    y = addSectionHeader(doc, 'User Growth', y);

    const growthData = data.userGrowth.map((g) => [
      g.period,
      formatNumber(g.creators),
      formatNumber(g.companies),
      formatNumber(g.total),
    ]);

    y = addTable(doc, {
      head: [['Period', 'Creators', 'Companies', 'Total']],
      body: growthData,
      startY: y,
    });

    y += 5;
  }

  // Top Creators
  if (data.topCreators && data.topCreators.length > 0) {
    if (y > 200) {
      doc.addPage();
      y = 20;
    }

    y = addSectionHeader(doc, 'Top Performing Creators', y);

    const creatorData = data.topCreators.map((c) => [
      c.name,
      c.email,
      formatCurrency(c.earnings),
      formatNumber(c.clicks),
      formatNumber(c.conversions),
    ]);

    y = addTable(doc, {
      head: [['Name', 'Email', 'Earnings', 'Clicks', 'Conversions']],
      body: creatorData,
      startY: y,
      columnStyles: {
        2: { halign: 'right' },
      },
    });

    y += 5;
  }

  // Top Companies
  if (data.topCompanies && data.topCompanies.length > 0) {
    if (y > 200) {
      doc.addPage();
      y = 20;
    }

    y = addSectionHeader(doc, 'Top Companies', y);

    const companyData = data.topCompanies.map((c) => [
      c.name,
      formatNumber(c.offers),
      formatCurrency(c.spend),
      formatNumber(c.creators),
    ]);

    addTable(doc, {
      head: [['Company', 'Offers', 'Total Spend', 'Creators']],
      body: companyData,
      startY: y,
      columnStyles: {
        2: { halign: 'right' },
      },
    });
  }

  savePDF(doc, 'admin-user-report');
}

export function exportAdminUserReportCSV(data: AdminUserStats): void {
  const headers = ['Metric', 'Value'];
  const rows = [
    ['Total Users', data.totalUsers.toString()],
    ['Total Creators', data.totalCreators.toString()],
    ['Total Companies', data.totalCompanies.toString()],
    ['Total Admins', data.totalAdmins.toString()],
    ['New Users This Week', data.newUsersThisWeek.toString()],
    ['New Creators This Week', data.newCreatorsThisWeek.toString()],
    ['New Companies This Week', data.newCompaniesThisWeek.toString()],
    ['Active Creators', data.activeCreators.toString()],
    ['Active Companies', data.activeCompanies.toString()],
    ['Pending Companies', data.pendingCompanies.toString()],
    ['Suspended Users', data.suspendedUsers.toString()],
  ];

  downloadCSV(rows, 'admin-user-report', headers);
}

export function exportAdminFinancialReportCSV(data: AdminFinancialData): void {
  const headers = ['Metric', 'Value'];
  const rows = [
    ['Total Revenue', formatCurrency(data.totalRevenue)],
    ['Listing Fees', formatCurrency(data.listingFees)],
    ['Platform Fees (4%)', formatCurrency(data.platformFees)],
    ['Processing Fees (3%)', formatCurrency(data.processingFees)],
    ['Total Payouts', formatCurrency(data.totalPayouts)],
    ['Pending Payouts', formatCurrency(data.pendingPayouts)],
    ['Completed Payouts', formatCurrency(data.completedPayouts)],
    ['Disputed Payments', formatCurrency(data.disputedPayments)],
  ];

  downloadCSV(rows, 'admin-financial-report', headers);
}

// ================== Conversation Export Functions ==================

export interface ConversationMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'creator' | 'company' | 'platform';
  content: string;
  attachments?: string[];
  createdAt: string;
  isRead: boolean;
}

export interface ConversationExportData {
  id: string;
  offerTitle: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  company: {
    id: string;
    name: string;
  };
  messages: ConversationMessage[];
  createdAt: string;
  lastMessageAt: string;
  totalMessages: number;
}

export function exportConversationPDF(data: ConversationExportData): void {
  const doc = createPDFDocument({
    title: 'Conversation Export',
    subtitle: `${data.creator.name} ↔ ${data.company.name}`,
    dateRange: `Offer: ${data.offerTitle}`,
  });

  let y = 45;

  // Conversation Summary Section
  y = addSectionHeader(doc, 'Conversation Summary', y);

  const metrics: MetricItem[] = [
    { label: 'Total Messages', value: formatNumber(data.totalMessages) },
    { label: 'Creator', value: data.creator.name, subValue: data.creator.email },
    { label: 'Company', value: data.company.name },
    { label: 'Started', value: formatDate(data.createdAt) },
  ];

  y = addMetricsGrid(doc, metrics, y);

  // Legal Compliance Notice
  y = addSectionHeader(doc, 'Export Information', y);
  y = addParagraph(
    doc,
    `This conversation export was generated for legal compliance and dispute resolution purposes. ` +
    `Export Date: ${new Date().toLocaleString()}. ` +
    `Conversation ID: ${data.id}`,
    y,
    { fontSize: 9, color: COLORS.muted }
  );

  y += 5;

  // Messages Section
  y = addSectionHeader(doc, 'Message History', y);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Add each message
  data.messages.forEach((message, index) => {
    // Check if we need a new page
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }

    const messageDate = new Date(message.createdAt);
    const dateStr = messageDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Sender info with role badge
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const senderColor = message.senderType === 'platform'
      ? COLORS.warning
      : (message.senderType === 'creator' ? COLORS.primary : COLORS.success);
    const senderLabel = message.senderType === 'platform'
      ? 'Platform'
      : (message.senderType === 'creator' ? 'Creator' : 'Company');
    doc.setTextColor(...senderColor);
    doc.text(`${message.senderName} (${senderLabel})`, margin, y);

    // Timestamp
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.text(dateStr, pageWidth - margin, y, { align: 'right' });

    y += 5;

    // Message content
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const messageContent = message.content || (message.attachments?.length ? '[Attachment]' : '[Empty message]');
    const lines = doc.splitTextToSize(messageContent, pageWidth - margin * 2);

    lines.forEach((line: string) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 4;
    });

    // Show attachment indicator
    if (message.attachments && message.attachments.length > 0) {
      doc.setTextColor(...COLORS.muted);
      doc.setFontSize(8);
      doc.text(`[${message.attachments.length} attachment(s)]`, margin, y);
      y += 4;
    }

    y += 4;

    // Add separator line between messages (except last)
    if (index < data.messages.length - 1) {
      doc.setDrawColor(...COLORS.background);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
    }
  });

  savePDF(doc, `conversation-${data.id}-export`);
}

export function exportConversationCSV(data: ConversationExportData): void {
  const headers = [
    'Message ID',
    'Timestamp',
    'Sender Name',
    'Sender Type',
    'Message Content',
    'Has Attachments',
    'Attachment Count',
    'Is Read',
  ];

  const rows = data.messages.map((message) => [
    message.id,
    new Date(message.createdAt).toISOString(),
    message.senderName,
    message.senderType,
    message.content || '',
    message.attachments && message.attachments.length > 0 ? 'Yes' : 'No',
    (message.attachments?.length || 0).toString(),
    message.isRead ? 'Yes' : 'No',
  ]);

  // Add metadata rows at the beginning
  const metadataRows = [
    ['--- CONVERSATION METADATA ---', '', '', '', '', '', '', ''],
    ['Conversation ID', data.id, '', '', '', '', '', ''],
    ['Offer', data.offerTitle, '', '', '', '', '', ''],
    ['Creator', data.creator.name, data.creator.email, '', '', '', '', ''],
    ['Company', data.company.name, '', '', '', '', '', ''],
    ['Started', formatDate(data.createdAt), '', '', '', '', '', ''],
    ['Last Message', formatDate(data.lastMessageAt), '', '', '', '', '', ''],
    ['Total Messages', data.totalMessages.toString(), '', '', '', '', '', ''],
    ['Export Date', new Date().toISOString(), '', '', '', '', '', ''],
    ['--- MESSAGE HISTORY ---', '', '', '', '', '', '', ''],
  ];

  downloadCSV([...metadataRows, ...rows], `conversation-${data.id}-export`, headers);
}

export function exportConversationJSON(data: ConversationExportData): void {
  const exportData = {
    exportMetadata: {
      exportDate: new Date().toISOString(),
      exportPurpose: 'Legal compliance and dispute resolution',
      platform: 'AffiliateXchange',
    },
    conversation: {
      id: data.id,
      offerTitle: data.offerTitle,
      creator: data.creator,
      company: data.company,
      createdAt: data.createdAt,
      lastMessageAt: data.lastMessageAt,
      totalMessages: data.totalMessages,
    },
    messages: data.messages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderType: msg.senderType,
      content: msg.content,
      attachments: msg.attachments || [],
      createdAt: msg.createdAt,
      isRead: msg.isRead,
    })),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `conversation-${data.id}-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
