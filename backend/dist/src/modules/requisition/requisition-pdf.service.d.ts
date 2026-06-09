import { Response } from 'express';
export declare class RequisitionPdfService {
    streamDueDiligencePdf(serialized: Record<string, unknown>, res: Response): void;
    streamWorkflowPdf(serialized: Record<string, unknown>, res: Response): void;
}
