"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequisitionPdfService = void 0;
const common_1 = require("@nestjs/common");
const PDFDocument = require('pdfkit');
const requisition_mapper_1 = require("./requisition.mapper");
function formatDateTime(value) {
    if (!value) {
        return '—';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }
    return date.toLocaleString('en-PK', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}
function renderPrmscLogo(doc, x, y) {
    doc.save();
    doc.translate(x, y);
    doc.path('M0 0 L120 0 L120 60 L0 60 Z').fill('#FFFFFF');
    doc.save();
    doc.translate(24, 14);
    doc.fillColor('#0B60B0');
    doc.moveTo(18, 40);
    doc.bezierCurveTo(12, 30, 6, 20, 18, 0);
    doc.bezierCurveTo(30, 20, 24, 30, 18, 40);
    doc.fill();
    doc.restore();
    doc.save();
    doc.translate(8, 36);
    doc.fillColor('#22A366');
    doc.moveTo(0, 12);
    doc.bezierCurveTo(18, 2, 42, 18, 70, 6);
    doc.bezierCurveTo(48, 28, 18, 24, 0, 12);
    doc.fill();
    doc.restore();
    doc.save();
    doc.translate(6, 44);
    doc.fillColor('#54C4E8');
    doc.moveTo(0, 8);
    doc.bezierCurveTo(18, -4, 46, 16, 76, 2);
    doc.bezierCurveTo(54, 20, 22, 18, 0, 8);
    doc.fill();
    doc.restore();
    doc.fillColor('#0E2F56').fontSize(16).font('Helvetica-Bold').text('PRMSC', 70, 6);
    doc.fontSize(8).font('Helvetica').text('Punjab Rural Municipal Services Company', 70, 26, {
        width: 200,
    });
    doc.restore();
    doc.fillColor('#000000');
}
function writeKeyValue(doc, key, value, options = {}) {
    const { keyWidth = 140, lineGap = 6 } = options;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0E2F56').text(`${key}:`, {
        continued: true,
        width: keyWidth,
    });
    doc.font('Helvetica').fontSize(11).fillColor('#222222').text(value, {
        continued: false,
    });
    doc.moveDown(lineGap / 12);
}
let RequisitionPdfService = class RequisitionPdfService {
    streamDueDiligencePdf(serialized, res) {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const sequenceNumber = serialized.sequenceNumber;
        const id = serialized.id;
        const filenameBase = sequenceNumber != null ? `due-diligence-${sequenceNumber}` : `due-diligence-${id}`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filenameBase}.pdf`);
        doc.pipe(res);
        renderPrmscLogo(doc, 40, 30);
        doc
            .font('Helvetica-Bold')
            .fontSize(18)
            .fillColor('#0E2F56')
            .text('Due Diligence Form', 0, 40, { align: 'right' });
        doc
            .font('Helvetica-Bold')
            .fontSize(14)
            .fillColor('#333333')
            .text('Land Requisition Assessment', 0, 60, { align: 'right' });
        doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor('#666666')
            .text(`Generated on ${formatDateTime(new Date())}`, { align: 'right' });
        doc.moveDown(1.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#0E2F56').lineWidth(2).stroke();
        doc.moveDown(0.8);
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#0E2F56').text('Section 1: Basic Information');
        doc.moveDown(0.4);
        doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#4A90A4').lineWidth(1).stroke();
        doc.moveDown(0.4);
        writeKeyValue(doc, 'Reference Number', sequenceNumber != null ? `REQ-${sequenceNumber}` : String(id));
        writeKeyValue(doc, 'Title', serialized.title || '—');
        writeKeyValue(doc, 'Purpose', serialized.purpose || '—');
        writeKeyValue(doc, 'Status', serialized.status || '—');
        writeKeyValue(doc, 'Priority', serialized.priority || '—');
        writeKeyValue(doc, 'Requested By', (0, requisition_mapper_1.summarizeUser)(serialized.requestedBy));
        writeKeyValue(doc, 'Assigned To', (0, requisition_mapper_1.summarizeUser)(serialized.assignedTo));
        writeKeyValue(doc, 'Date Created', formatDateTime(serialized.dateCreated));
        writeKeyValue(doc, 'Required By', formatDateTime(serialized.requiredDate));
        doc.moveDown(0.8);
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#0E2F56').text('Section 2: Location Details');
        doc.moveDown(0.4);
        doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#4A90A4').lineWidth(1).stroke();
        doc.moveDown(0.4);
        const location = serialized.location;
        writeKeyValue(doc, 'Division', serialized.division || '—');
        writeKeyValue(doc, 'District', serialized.district || '—');
        writeKeyValue(doc, 'Tehsil', serialized.tehsil || '—');
        writeKeyValue(doc, 'Address', location?.address || '—');
        if (location?.coordinates?.lat && location?.coordinates?.lng) {
            writeKeyValue(doc, 'Coordinates', `${location.coordinates.lat.toFixed(6)}, ${location.coordinates.lng.toFixed(6)}`);
        }
        doc.moveDown(0.8);
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#0E2F56').text('Section 3: Land Details');
        doc.moveDown(0.4);
        doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#4A90A4').lineWidth(1).stroke();
        doc.moveDown(0.4);
        writeKeyValue(doc, 'Land Type', serialized.landType || '—');
        writeKeyValue(doc, 'Land Area', serialized.landArea || '—');
        const calcSqFt = Number(serialized.calculatedAreaSqFt);
        const calcMarlas = Number(serialized.calculatedAreaMarlas);
        const calcKanals = Number(serialized.calculatedAreaKanals);
        writeKeyValue(doc, 'Calculated Area (Sq Ft)', calcSqFt ? calcSqFt.toLocaleString() : '—');
        writeKeyValue(doc, 'Calculated Area (Marlas)', calcMarlas ? calcMarlas.toFixed(2) : '—');
        writeKeyValue(doc, 'Calculated Area (Kanals)', calcKanals ? calcKanals.toFixed(2) : '—');
        writeKeyValue(doc, 'Land Dimensions', serialized.landBreadth && serialized.landDepth
            ? `${serialized.landBreadth} x ${serialized.landDepth} ft`
            : '—');
        const landAcq = (serialized.landAcquisition || {});
        doc.moveDown(0.8);
        doc
            .font('Helvetica-Bold')
            .fontSize(14)
            .fillColor('#0E2F56')
            .text('Section 4: Land Acquisition Information');
        doc.moveDown(0.4);
        doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#4A90A4').lineWidth(1).stroke();
        doc.moveDown(0.4);
        writeKeyValue(doc, 'Acquisition Type', landAcq.type || '—');
        writeKeyValue(doc, 'Acquisition Status', landAcq.status || '—');
        if (landAcq.donor) {
            doc.moveDown(0.4);
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#333333').text('Donor Information:');
            doc.moveDown(0.2);
            writeKeyValue(doc, 'Full Name', landAcq.donor.fullName || '—');
            writeKeyValue(doc, 'CNIC', landAcq.donor.cnic || '—');
            writeKeyValue(doc, 'Contact Number', landAcq.donor.contactNumber || '—');
            writeKeyValue(doc, 'Address', landAcq.donor.address || '—');
            writeKeyValue(doc, 'Village', landAcq.donor.villageName || '—');
            writeKeyValue(doc, 'Tehsil', landAcq.donor.tehsil || '—');
            writeKeyValue(doc, 'District', landAcq.donor.district || '—');
        }
        if (landAcq.land) {
            doc.moveDown(0.4);
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#333333').text('Land Registration Details:');
            doc.moveDown(0.2);
            writeKeyValue(doc, 'Khasra Number', landAcq.land.khasraNumber || '—');
            writeKeyValue(doc, 'Land Category', landAcq.land.landCategory || '—');
            writeKeyValue(doc, 'Area', landAcq.land.area || '—');
            writeKeyValue(doc, 'Current Use', landAcq.land.currentUse || '—');
            writeKeyValue(doc, 'Ownership Proof', landAcq.land.ownershipProof || '—');
            writeKeyValue(doc, 'Mutation Number', landAcq.land.mutationNumber || '—');
            if (landAcq.land.latitude && landAcq.land.longitude) {
                writeKeyValue(doc, 'Land Coordinates', `${Number(landAcq.land.latitude).toFixed(6)}, ${Number(landAcq.land.longitude).toFixed(6)}`);
            }
        }
        if (landAcq.donation) {
            doc.moveDown(0.4);
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#333333').text('Donation Details:');
            doc.moveDown(0.2);
            writeKeyValue(doc, 'Donation Type', landAcq.donation.donationType || '—');
            writeKeyValue(doc, 'Purpose', landAcq.donation.purpose || '—');
            writeKeyValue(doc, 'Willingness Date', formatDateTime(landAcq.donation.willingnessDate));
            writeKeyValue(doc, 'Remarks', landAcq.donation.remarks || '—');
        }
        if (landAcq.verification) {
            doc.moveDown(0.4);
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#333333').text('Verification Status:');
            doc.moveDown(0.2);
            writeKeyValue(doc, 'Verified By', landAcq.verification.verifiedBy || '—');
            writeKeyValue(doc, 'Verification Date', formatDateTime(landAcq.verification.verifiedDate));
            writeKeyValue(doc, 'Approved By', landAcq.verification.approvedBy || '—');
            writeKeyValue(doc, 'Approval Status', landAcq.verification.approvalStatus || '—');
        }
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#0E2F56').text('Section 5: Due Diligence Checklist');
        doc.moveDown(0.4);
        doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#4A90A4').lineWidth(1).stroke();
        doc.moveDown(0.4);
        const checklist = serialized.landType === 'Private Land'
            ? serialized.privateLandChecklist
            : serialized.govtLandChecklist;
        if (checklist && typeof checklist === 'object' && Object.keys(checklist).length > 0) {
            Object.entries(checklist).forEach(([key, value]) => {
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
                const status = value ? '✓ Completed' : '○ Pending';
                const color = value ? '#27ae60' : '#e74c3c';
                doc.font('Helvetica').fontSize(11).fillColor(color).text(`${status}  ${label}`);
                doc.moveDown(0.2);
            });
        }
        else {
            doc.font('Helvetica').fontSize(11).fillColor('#666666').text('No checklist items recorded.');
        }
        doc.moveDown(0.8);
        doc
            .font('Helvetica-Bold')
            .fontSize(14)
            .fillColor('#0E2F56')
            .text('Section 6: Workflow Activity History');
        doc.moveDown(0.4);
        doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#4A90A4').lineWidth(1).stroke();
        doc.moveDown(0.4);
        const activityLog = (serialized.activityLog || []);
        if (!activityLog.length) {
            doc.font('Helvetica').fontSize(11).fillColor('#666666').text('No activity recorded yet.');
        }
        else {
            const sortedLogs = [...activityLog].sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
            sortedLogs.slice(-15).forEach((entry) => {
                doc
                    .font('Helvetica-Bold')
                    .fontSize(10)
                    .fillColor('#0E2F56')
                    .text(`${formatDateTime(entry.timestamp)} — ${entry.action || 'Activity'}`);
                doc
                    .font('Helvetica')
                    .fontSize(10)
                    .fillColor('#444444')
                    .text(`   By: ${(0, requisition_mapper_1.summarizeUser)(entry.user)}`);
                if (entry.remarks) {
                    doc
                        .font('Helvetica-Oblique')
                        .fontSize(9)
                        .fillColor('#666666')
                        .text(`   "${entry.remarks}"`, { indent: 16 });
                }
                doc.moveDown(0.3);
            });
        }
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').lineWidth(0.5).stroke();
        doc.moveDown(0.5);
        doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor('#888888')
            .text('This Due Diligence Form represents the state of the requisition at the time of generation. For official purposes, please verify with the system of record.', { align: 'center' });
        doc.moveDown(1.5);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333').text('Prepared By:', 50);
        doc.moveDown(0.8);
        doc.text('_________________________', 50);
        doc.font('Helvetica').fontSize(9).text('Name & Designation', 50);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333').text('Verified By:', 300, doc.y - 36);
        doc.moveDown(0.8);
        doc.text('_________________________', 300, doc.y - 24);
        doc.font('Helvetica').fontSize(9).text('Name & Designation', 300);
        doc.end();
    }
    streamWorkflowPdf(serialized, res) {
        const doc = new PDFDocument({ margin: 50 });
        const sequenceNumber = serialized.sequenceNumber;
        const id = serialized.id;
        const filenameBase = sequenceNumber != null ? `requisition-${sequenceNumber}` : `requisition-${id}`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filenameBase}.pdf`);
        doc.pipe(res);
        renderPrmscLogo(doc, 40, 30);
        doc
            .font('Helvetica-Bold')
            .fontSize(20)
            .fillColor('#0E2F56')
            .text('Requisition Workflow Report', 0, 40, { align: 'right' });
        doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor('#333333')
            .text(`Generated on ${formatDateTime(new Date())}`, { align: 'right' });
        doc.moveDown(1.2);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#0E2F56').lineWidth(1).stroke();
        doc.moveDown(0.8);
        writeKeyValue(doc, 'Reference', sequenceNumber != null ? `#${sequenceNumber}` : String(id));
        writeKeyValue(doc, 'Title', serialized.title || '—');
        writeKeyValue(doc, 'Status', serialized.status || '—');
        writeKeyValue(doc, 'Priority', serialized.priority || '—');
        writeKeyValue(doc, 'Requested By', (0, requisition_mapper_1.summarizeUser)(serialized.requestedBy));
        writeKeyValue(doc, 'Assigned To', (0, requisition_mapper_1.summarizeUser)(serialized.assignedTo));
        writeKeyValue(doc, 'Created On', formatDateTime(serialized.dateCreated));
        writeKeyValue(doc, 'Last Updated', formatDateTime(serialized.lastUpdated));
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#0E2F56').text('Key Details');
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(11).fillColor('#222222');
        const summaryLines = [
            `Purpose: ${serialized.purpose || '—'}`,
            `Division / District / Tehsil: ${[serialized.division, serialized.district, serialized.tehsil]
                .filter(Boolean)
                .join(' · ') || '—'}`,
            `Land Type: ${serialized.landType || '—'} | Area: ${serialized.landArea || '—'}`,
            `Required Date: ${formatDateTime(serialized.requiredDate)}`,
        ];
        summaryLines.forEach((line) => {
            doc.text(line);
        });
        const location = serialized.location;
        if (location) {
            const address = location.address ? `Address: ${location.address}` : null;
            const coords = location.coordinates &&
                Number.isFinite(location.coordinates.lat) &&
                Number.isFinite(location.coordinates.lng)
                ? `Coordinates: ${location.coordinates.lat.toFixed(6)}, ${location.coordinates.lng.toFixed(6)}`
                : null;
            if (address || coords) {
                if (address) {
                    doc.text(address);
                }
                if (coords) {
                    doc.text(coords);
                }
            }
        }
        doc.moveDown(0.8);
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#0E2F56').text('Activity Trail');
        doc.moveDown(0.3);
        const pdfActivityLog = (serialized.activityLog || []);
        if (!pdfActivityLog.length) {
            doc.font('Helvetica').fontSize(11).fillColor('#444444').text('No activity recorded yet.');
        }
        else {
            [...pdfActivityLog]
                .sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime())
                .forEach((entry) => {
                doc
                    .font('Helvetica-Bold')
                    .fontSize(11)
                    .fillColor('#0E2F56')
                    .text(`${formatDateTime(entry.timestamp)} · ${entry.action || 'Activity'}`);
                doc
                    .font('Helvetica')
                    .fontSize(11)
                    .fillColor('#222222')
                    .text(`By ${(0, requisition_mapper_1.summarizeUser)(entry.user)}`);
                if (entry.remarks) {
                    doc.font('Helvetica-Oblique').fontSize(10).fillColor('#555555').text(entry.remarks, {
                        indent: 16,
                    });
                }
                if (entry.meta?.toStatus) {
                    doc
                        .font('Helvetica')
                        .fontSize(10)
                        .fillColor('#666666')
                        .text(`Next Stage: ${entry.meta.toStatus}`, { indent: 16 });
                }
                doc.moveDown(0.4);
            });
        }
        const pdfLandAcq = (serialized.landAcquisition || {});
        if (pdfLandAcq.type || pdfLandAcq.status) {
            doc.moveDown(0.6);
            doc.font('Helvetica-Bold').fontSize(13).fillColor('#0E2F56').text('Land Acquisition Snapshot');
            doc.moveDown(0.3);
            writeKeyValue(doc, 'Stage', pdfLandAcq.status || '—');
            writeKeyValue(doc, 'Donor', pdfLandAcq.donor?.fullName
                ? `${pdfLandAcq.donor.fullName}${pdfLandAcq.donor.contactNumber ? ` · ${pdfLandAcq.donor.contactNumber}` : ''}`
                : '—');
            writeKeyValue(doc, 'Land Reference', pdfLandAcq.land?.khasraNumber || '—');
            writeKeyValue(doc, 'Updated By', (0, requisition_mapper_1.summarizeUser)(pdfLandAcq.updatedBy));
            writeKeyValue(doc, 'Updated On', formatDateTime(pdfLandAcq.updatedAt));
        }
        doc.moveDown(1.2);
        doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor('#777777')
            .text('This report captures the requisition state at the time of download. Workflow changes after this point will require a fresh export.', { align: 'center' });
        doc.end();
    }
};
exports.RequisitionPdfService = RequisitionPdfService;
exports.RequisitionPdfService = RequisitionPdfService = __decorate([
    (0, common_1.Injectable)()
], RequisitionPdfService);
//# sourceMappingURL=requisition-pdf.service.js.map