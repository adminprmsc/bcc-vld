import { Injectable } from '@angular/core';
import { AssetMetadata, AssetMetadataService } from './asset-metadata.service';
import { MaintenanceRecord } from './asset-layer.service';

/**
 * Extended Asset Metadata with Attributes and History
 */
export interface ExtendedAssetMetadata extends Partial<AssetMetadata> {
  id: string;
  title: string;
  assetType?: string;
  category?: string;
  attributes?: Record<string, any>;
  maintenanceHistory?: MaintenanceRecord[];
}

/**
 * PDF Report Generator Service
 * Generates professional PDF reports for assets with metadata
 * Supports PRMSC branding, asset attributes, and maintenance history
 */
@Injectable({
  providedIn: 'root',
})
export class PdfReportService {
  private readonly PRMSC_LOGO_URL = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDIwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzI1NjNlYjtzdG9wLW9wYWNpdHk6MSIgLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxZTQwYWY7c3RvcC1vcGFjaXR5OjEiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9InVybCgjZ3JhZCkiIC8+PHRleHQgeD0iMTAwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjIwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5QUk1TQzwvdGV4dD48L3N2Zz4=';
  private readonly REPORT_TITLE = 'Asset Report';
  private readonly PAGE_WIDTH = 210; // A4 width in mm
  private readonly PAGE_HEIGHT = 297; // A4 height in mm
  private readonly MARGIN = 15;

  constructor(private assetMetadataService: AssetMetadataService) {}

  /**
   * Generate a professional PDF report for an asset
   */
  generateAssetReport(asset: AssetMetadata | ExtendedAssetMetadata, fileName?: string): void {
    const reportData = this.buildReportData(asset);
    const pdfContent = this.generatePdfContent(reportData);

    // For now, we'll generate HTML that can be printed to PDF
    // In production, use jsPDF or similar library
    const finalFileName = fileName || `${asset.title.replace(/\s+/g, '_')}_report.html`;
    this.downloadHtmlAsPdf(pdfContent, finalFileName);
  }

  /**
   * Generate multiple asset reports as a batch
   */
  generateBatchReport(assets: (AssetMetadata | ExtendedAssetMetadata)[], fileName = 'asset_batch_report.html'): void {
    const allReports = assets.map((asset) => this.buildReportData(asset)).join('\n\n');
    const pdfContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Asset Batch Report</title>
          ${this.getPageStyles()}
        </head>
        <body>
          ${allReports}
        </body>
      </html>
    `;

    this.downloadHtmlAsPdf(pdfContent, fileName);
  }

  /**
   * Build comprehensive report data for an asset
   */
  private buildReportData(asset: ExtendedAssetMetadata | AssetMetadata): string {
    const extAsset = asset as ExtendedAssetMetadata;
    const commissioningDate = asset.commissioningDate ?? null;
    const nextMaintenanceDate = this.resolveNextMaintenanceDate(asset);
    const assetAge = this.assetMetadataService.calculateAssetAge(commissioningDate);
    const remainingLifespan = this.assetMetadataService.calculateRemainingLifespan(
      commissioningDate,
      asset.expectedLifespanYears ?? null,
    );
    const formattedNextMaintenanceDate = this.assetMetadataService.formatNextMaintenanceDate(nextMaintenanceDate);

    return `
      <div class="report-page">
        <header class="report-header">
          <div class="header-left">
            <img src="${this.PRMSC_LOGO_URL}" alt="PRMSC Logo" class="logo" onerror="this.handleLogoError()" style="max-height: 60px; width: auto;">
          </div>
          <div class="header-right">
            <h1 class="report-title">Asset Report</h1>
            <p class="report-date">Generated: ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}</p>
          </div>
        </header>

        <main class="report-content">
          <section class="asset-summary">
            <h2>Asset Summary</h2>
            <div class="summary-grid">
              <div class="summary-item">
                <label>Asset Title:</label>
                <span class="value">${this.escapeHtml(asset.title)}</span>
              </div>
              <div class="summary-item">
                <label>Asset ID:</label>
                <span class="value">${this.escapeHtml(asset.id)}</span>
              </div>
              <div class="summary-item">
                <label>Category:</label>
                <span class="value">${this.escapeHtml(asset.category || 'N/A')}</span>
              </div>
              ${extAsset.assetType ? `
              <div class="summary-item">
                <label>Asset Type:</label>
                <span class="value">${this.escapeHtml(extAsset.assetType)}</span>
              </div>
              ` : ''}
            </div>
          </section>

          <section class="asset-details">
            <h2>Asset Details</h2>
            <table class="details-table">
              <tbody>
                <tr>
                  <th>Commissioning Date</th>
                  <td>${this.assetMetadataService.formatCommissioningDate(asset.commissioningDate)}</td>
                </tr>
                <tr>
                  <th>Next Maintenance</th>
                  <td>${formattedNextMaintenanceDate}</td>
                </tr>
                <tr>
                  <th>Expected Lifespan</th>
                  <td>${this.assetMetadataService.formatExpectedLifespan(asset.expectedLifespanYears)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          ${this.generateAssetAttributesSection(extAsset)}

          <section class="asset-analysis">
            <h2>Asset Analysis</h2>
            <div class="analysis-grid">
              ${assetAge !== null ? `
                <div class="analysis-item">
                  <label>Asset Age</label>
                  <span class="value">${assetAge} year${assetAge !== 1 ? 's' : ''}</span>
                </div>
              ` : ''}

              ${remainingLifespan !== null ? `
                <div class="analysis-item ${remainingLifespan < 1 ? 'critical' : ''}">
                  <label>Remaining Lifespan</label>
                  <span class="value">${remainingLifespan} year${remainingLifespan !== 1 ? 's' : ''}</span>
                  ${remainingLifespan < 1 ? '<span class="warning">⚠️ Near End of Life</span>' : ''}
                </div>
              ` : ''}
            </div>
          </section>

          ${this.generateHealthIndicator(asset)}

          ${this.generateMaintenanceHistorySection(extAsset)}
        </main>

        <footer class="report-footer">
          <div class="footer-content">
            <div class="signature-block">
              <div class="signature-line"></div>
              <p class="signature-label">Authorized Signature</p>
            </div>
            <div class="esign-placeholder">
              <p class="esign-label">E-Signature: ___________________</p>
              <p class="esign-date">Date: ___________________</p>
            </div>
          </div>
          <p class="footer-disclaimer">
            This report is generated by the PRMSC system and is subject to data confidentiality policies.
            For questions, contact the PRMSC administration office.
          </p>
        </footer>
      </div>
    `;
  }

  private resolveNextMaintenanceDate(asset: AssetMetadata | ExtendedAssetMetadata): string | null {
    const direct = asset?.nextMaintenanceDate ?? null;
    if (direct) {
      return direct;
    }

    const extAsset = asset as ExtendedAssetMetadata;
    if (extAsset?.attributes && typeof extAsset.attributes === 'object') {
      const byKey = extAsset.attributes['nextMaintenanceDate'] ?? extAsset.attributes['maintenanceDueDate'] ?? null;
      if (typeof byKey === 'string' && byKey.trim()) {
        return byKey;
      }
    }

    return null;
  }

  /**
   * Generate asset attributes section from attributes object
   */
  private generateAssetAttributesSection(asset: ExtendedAssetMetadata): string {
    const attributes = asset.attributes;

    if (!attributes || Object.keys(attributes).length === 0) {
      return '';
    }

    const attributeRows = Object.entries(attributes)
      .map(
        ([key, value]) => `
        <tr>
          <th>${this.formatAttributeKey(key)}</th>
          <td>${this.escapeHtml(String(value || 'N/A'))}</td>
        </tr>
      `,
      )
      .join('');

    return `
      <section class="asset-attributes">
        <h2>Asset Attributes</h2>
        <table class="attributes-table">
          <tbody>
            ${attributeRows}
          </tbody>
        </table>
      </section>
    `;
  }

  /**
   * Generate maintenance history section
   */
  private generateMaintenanceHistorySection(asset: ExtendedAssetMetadata): string {
    const history = asset.maintenanceHistory || [];

    if (history.length === 0) {
      return `
        <section class="maintenance-history">
          <h2>Maintenance History</h2>
          <p class="no-data">No maintenance records available.</p>
        </section>
      `;
    }

    const historyRows = history
      .map(
        (record) => `
        <tr>
          <td>${new Date(record.date).toLocaleDateString('en-US')}</td>
          <td>${this.escapeHtml(this.formatMaintenanceType(record.type))}</td>
          <td>${this.escapeHtml(record.description || 'N/A')}</td>
          <td class="status-${record.status}">${this.escapeHtml(record.status.toUpperCase())}</td>
          <td>PKR ${record.cost.toLocaleString('en-PK')}</td>
        </tr>
      `,
      )
      .join('');

    const totalCost = history.reduce((sum, record) => sum + record.cost, 0);

    return `
      <section class="maintenance-history">
        <h2>Maintenance History</h2>
        <table class="maintenance-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Status</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4" style="text-align: right; font-weight: 600;">Total Cost:</td>
              <td style="font-weight: 700; color: #1f2937;">PKR ${totalCost.toLocaleString('en-PK')}</td>
            </tr>
          </tfoot>
        </table>
      </section>
    `;
  }

  /**
   * Format attribute key from camelCase to readable text
   */
  private formatAttributeKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/_/g, ' ');
  }

  /**
   * Format maintenance type
   */
  private formatMaintenanceType(type: string): string {
    const typeMap: Record<string, string> = {
      preventive: 'Preventive',
      corrective: 'Corrective',
      emergency: 'Emergency',
      inspection: 'Inspection',
    };
    return typeMap[type] || type;
  }

  /**
   * Generate a health indicator section for the asset
   */
  private generateHealthIndicator(asset: ExtendedAssetMetadata | AssetMetadata): string {
    const commissioningDate = asset.commissioningDate ?? null;
    const expectedLifespanYears = (asset as any).expectedLifespanYears ?? null;
    const isNearEndOfLife = this.assetMetadataService.isNearEndOfLife(commissioningDate, expectedLifespanYears);
    const assetAge = this.assetMetadataService.calculateAssetAge(commissioningDate);

    let health = 'Good';
    let healthClass = 'good';

    if (isNearEndOfLife) {
      health = 'Critical';
      healthClass = 'critical';
    } else if (assetAge !== null && assetAge > (expectedLifespanYears ?? 30) * 0.7) {
      health = 'Needs Monitoring';
      healthClass = 'warning';
    }

    return `
      <section class="asset-health">
        <h2>Asset Health Status</h2>
        <div class="health-indicator ${healthClass}">
          <span class="health-status">${health}</span>
          <div class="health-details">
            ${
              isNearEndOfLife
                ? '<p>⚠️ This asset is approaching or has reached end of life. Replacement planning is recommended.</p>'
                : '<p>✓ Asset is operating within expected parameters.</p>'
            }
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Get CSS styles for PDF pages
   */
  private getPageStyles(): string {
    return `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          line-height: 1.6;
          background: white;
        }

        .report-page {
          page-break-after: always;
          width: 210mm;
          height: 297mm;
          margin: 0 auto;
          padding: 15mm;
          background: white;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
        }

        .report-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }

        .header-left {
          flex: 0 0 auto;
        }

        .logo {
          height: 60px;
          width: auto;
        }

        .header-right {
          flex: 1;
          text-align: right;
        }

        .report-title {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 5px;
        }

        .report-date {
          font-size: 12px;
          color: #6b7280;
        }

        .report-content {
          flex: 1;
          overflow-y: auto;
        }

        section {
          margin-bottom: 20px;
        }

        h2 {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
          border-left: 4px solid #2563eb;
          padding-left: 10px;
        }

        .summary-grid,
        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .summary-item,
        .analysis-item {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 12px;
        }

        .summary-item label,
        .analysis-item label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .summary-item .value,
        .analysis-item .value {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
          display: block;
        }

        .analysis-item.critical .value {
          color: #dc2626;
          font-weight: 700;
        }

        .analysis-item .warning {
          display: block;
          font-size: 12px;
          color: #dc2626;
          margin-top: 4px;
        }

        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }

        .details-table th,
        .details-table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .details-table th {
          background: #f3f4f6;
          font-weight: 600;
          color: #1f2937;
        }

        .details-table td {
          color: #4b5563;
        }

        .asset-health {
          background: #eff6ff;
          border: 2px solid #2563eb;
          border-radius: 6px;
          padding: 15px;
        }

        .health-indicator {
          padding: 12px;
          border-radius: 6px;
          margin-top: 10px;
        }

        .health-indicator.good {
          background: #dcfce7;
          border-left: 4px solid #16a34a;
        }

        .health-indicator.warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
        }

        .health-indicator.critical {
          background: #fee2e2;
          border-left: 4px solid #dc2626;
        }

        .health-status {
          font-weight: 700;
          font-size: 14px;
        }

        .health-details p {
          margin-top: 8px;
          font-size: 13px;
          color: #374151;
        }

        .report-footer {
          border-top: 2px solid #e5e7eb;
          padding-top: 15px;
          margin-top: auto;
          font-size: 12px;
        }

        .footer-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 15px;
        }

        .signature-block,
        .esign-placeholder {
          display: flex;
          flex-direction: column;
        }

        .signature-line {
          border-bottom: 1px solid #000;
          height: 40px;
          margin-bottom: 5px;
        }

        .signature-label,
        .esign-label,
        .esign-date {
          margin: 0;
          font-size: 11px;
          color: #6b7280;
        }

        .footer-disclaimer {
          font-size: 10px;
          color: #9ca3af;
          font-style: italic;
          line-height: 1.4;
        }

        /* Asset Attributes Section */
        .asset-attributes,
        .maintenance-history {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 15px;
        }

        .attributes-table,
        .maintenance-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .attributes-table th,
        .attributes-table td,
        .maintenance-table th,
        .maintenance-table td {
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .attributes-table th,
        .maintenance-table th {
          background: #f3f4f6;
          font-weight: 600;
          color: #1f2937;
          font-size: 12px;
        }

        .attributes-table td,
        .maintenance-table td {
          color: #4b5563;
        }

        .maintenance-table tfoot .total-row {
          background: #eff6ff;
          border-top: 2px solid #2563eb;
        }

        .maintenance-table td.status-completed {
          color: #16a34a;
          font-weight: 600;
        }

        .maintenance-table td.status-pending {
          color: #f59e0b;
          font-weight: 600;
        }

        .maintenance-table td.status-cancelled {
          color: #dc2626;
          font-weight: 600;
        }

        .no-data {
          font-size: 13px;
          color: #6b7280;
          font-style: italic;
          padding: 10px;
          background: #f3f4f6;
          border-radius: 4px;
          text-align: center;
        }

        @media print {
          body {
            background: white;
          }

          .report-page {
            box-shadow: none;
            page-break-after: always;
          }

          .maintenance-table {
            page-break-inside: avoid;
          }
        }
      </style>
    `;
  }

  /**
   * Generate complete PDF content as HTML
   */
  private generatePdfContent(reportData: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${this.REPORT_TITLE}</title>
          ${this.getPageStyles()}
        </head>
        <body>
          ${reportData}
        </body>
      </html>
    `;
  }

  /**
   * Download HTML content as PDF (using print-to-PDF mechanism)
   */
  private downloadHtmlAsPdf(htmlContent: string, fileName: string): void {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace('.html', '.pdf');
    document.body.appendChild(link);

    // Open in new window for printing to PDF
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      });
    }

    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Export report as JSON (for archival or integration)
   */
  exportAsJson(asset: AssetMetadata): string {
    const assetAge = this.assetMetadataService.calculateAssetAge(asset.commissioningDate);
    const remainingLifespan = this.assetMetadataService.calculateRemainingLifespan(
      asset.commissioningDate,
      asset.expectedLifespanYears,
    );

    return JSON.stringify(
      {
        report: {
          title: this.REPORT_TITLE,
          generatedAt: new Date().toISOString(),
          asset: {
            ...asset,
            formattedCommissioningDate: this.assetMetadataService.formatCommissioningDate(asset.commissioningDate),
            formattedNextMaintenanceDate: this.assetMetadataService.formatNextMaintenanceDate(
              this.resolveNextMaintenanceDate(asset),
            ),
            formattedExpectedLifespan: this.assetMetadataService.formatExpectedLifespan(asset.expectedLifespanYears),
            calculatedAge: assetAge,
            calculatedRemainingLifespan: remainingLifespan,
            isNearEndOfLife: this.assetMetadataService.isNearEndOfLife(asset.commissioningDate, asset.expectedLifespanYears),
          },
        },
      },
      null,
      2,
    );
  }
}
