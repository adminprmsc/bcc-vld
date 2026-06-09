"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeString = safeString;
exports.isValidId = isValidId;
exports.parseId = parseId;
exports.limitInt = limitInt;
exports.escapeLike = escapeLike;
exports.parseDate = parseDate;
exports.parseCoords = parseCoords;
exports.parseMetrics = parseMetrics;
exports.normalizeLabMetrics = normalizeLabMetrics;
exports.toneForStatus = toneForStatus;
exports.labelForStatus = labelForStatus;
exports.labelForRating = labelForRating;
exports.buildStatusEvent = buildStatusEvent;
exports.canCreate = canCreate;
exports.canReadSample = canReadSample;
const client_1 = require("@prisma/client");
const water_quality_constants_1 = require("./water-quality.constants");
function safeString(value) {
    return (value ?? '').toString().trim();
}
function isValidId(value) {
    if (!value) {
        return false;
    }
    const num = Number(value);
    return num > 0 && Number.isFinite(num);
}
function parseId(value) {
    if (!value) {
        return null;
    }
    const num = Number(value);
    return num > 0 && Number.isFinite(num) ? num : null;
}
function limitInt(value, fallback) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) {
        return Math.min(num, fallback);
    }
    return fallback;
}
function escapeLike(value) {
    return safeString(value).replace(/[%_\\]/g, '\\$&');
}
function parseDate(raw) {
    if (!raw) {
        return null;
    }
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
}
function parseCoords(value) {
    if (!value) {
        return null;
    }
    if (typeof value === 'string') {
        const text = value.trim();
        if (!text) {
            return null;
        }
        try {
            return parseCoords(JSON.parse(text));
        }
        catch {
            const parts = text.split(',').map(Number);
            if (parts.length >= 2 && parts.every(Number.isFinite)) {
                return { lat: parts[0], lng: parts[1] };
            }
            return null;
        }
    }
    if (Array.isArray(value) && value.length >= 2) {
        const [lng, lat] = value.map(Number);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lng };
        }
    }
    if (typeof value === 'object' && value !== null) {
        const obj = value;
        const lat = Number(obj.lat ?? obj.latitude);
        const lng = Number(obj.lng ?? obj.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lng };
        }
    }
    return null;
}
function parseMetrics(raw) {
    if (!raw) {
        return {};
    }
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return typeof parsed === 'object' && parsed !== null ? parsed : {};
        }
        catch {
            return {};
        }
    }
    if (typeof raw === 'object' && raw !== null) {
        return { ...raw };
    }
    return {};
}
function normalizeLabMetrics(metrics = {}) {
    const output = { ...(metrics || {}) };
    const mapping = {
        tehsil: ['tehsil', 'tehsil_name'],
        locationName: ['locationName', 'location', 'village', 'villageName'],
        settlementsOperational: [
            'settlementsOperational',
            'numberOfSettlementsOperational',
            'settlements',
        ],
        waterStatus: ['waterStatus', 'status'],
        color: ['color'],
        taste: ['taste'],
        odour: ['odour', 'odor'],
        ec: ['ec', 'conductivity', 'electricalConductivity'],
        turbidity: ['turbidity'],
        physicalContamination: ['physicalContamination', 'physical'],
        ph: ['ph'],
        hco3: ['hco3', 'bicarbonate'],
        co3: ['co3', 'carbonate'],
        calcium: ['calcium', 'ca'],
        magnesium: ['magnesium', 'mg'],
        hardness: ['hardness', 'totalHardness'],
        chloride: ['chloride', 'cl'],
        sodium: ['sodium', 'na'],
        potassium: ['potassium', 'k'],
        sulfate: ['sulfate', 'so4'],
        nitrate: ['nitrate', 'no3'],
        tds: ['tds'],
        phosphate: ['phosphate', 'po4'],
        iron: ['iron', 'fe'],
        nitrite: ['nitrite', 'no2'],
        fluoride: ['fluoride', 'f'],
        aluminum: ['aluminum', 'al'],
        arsenic: ['arsenic', 'as'],
        barium: ['barium', 'ba'],
        cadmium: ['cadmium', 'cd'],
        cobalt: ['cobalt', 'co'],
        chromium: ['chromium', 'cr'],
        copper: ['copper', 'cu'],
        manganese: ['manganese', 'mn'],
        molybdenum: ['molybdenum', 'mo'],
        nickel: ['nickel', 'ni'],
        lead: ['lead', 'pb'],
        strontium: ['strontium', 'sr'],
        zinc: ['zinc', 'zn'],
        chemicalContamination: ['chemicalContamination'],
        totalColiforms: ['totalColiforms', 'total_coliforms'],
        fecalColiforms: ['fecalColiforms', 'fecal_coliforms'],
        ecoli: ['ecoli', 'e_coli'],
        biologicalContamination: ['biologicalContamination'],
        remarks: ['remarks', 'labRemarks'],
        safe: ['safe'],
        unsafe: ['unsafe'],
    };
    const canonical = {};
    Object.entries(mapping).forEach(([targetKey, aliases]) => {
        for (const alias of aliases) {
            if (alias in output) {
                canonical[targetKey] = output[alias];
                break;
            }
        }
    });
    return canonical;
}
function toneForStatus(code) {
    switch (code) {
        case 'critical_flagged':
            return client_1.water_quality_sample_status_history_tone.critical;
        case 'results_posted':
        case 'closed':
            return client_1.water_quality_sample_status_history_tone.success;
        default:
            return client_1.water_quality_sample_status_history_tone.info;
    }
}
function labelForStatus(code) {
    switch (code) {
        case 'critical_flagged':
            return 'Critical Flagged';
        case 'assignment':
            return 'Sampler Assigned';
        case 'collection_started':
            return 'Sampling Started';
        case 'collection_complete':
            return 'Sample Collected';
        case 'in_lab':
            return 'In Lab';
        case 'results_posted':
            return 'Lab Results Posted';
        case 'closed':
            return 'Closed';
        case 'cancelled':
            return 'Cancelled';
        default:
            return 'Updated';
    }
}
function labelForRating(rating) {
    switch (rating) {
        case 'excellent':
            return 'Excellent';
        case 'good':
            return 'Good';
        case 'fair':
            return 'Fair';
        case 'poor':
            return 'Poor';
        default:
            return 'Pending';
    }
}
function buildStatusEvent(code, user, note) {
    return {
        code,
        label: labelForStatus(code),
        note: note || '',
        tone: toneForStatus(code),
        created_by: user?.userId ? BigInt(user.userId) : BigInt(0),
        created_by_name: safeString(user?.name),
    };
}
function canCreate(role) {
    return water_quality_constants_1.RA_ROLES.has(role || '') || water_quality_constants_1.MANAGER_ROLES.has(role || '');
}
function canReadSample(user, sample) {
    const role = user?.role || '';
    if (water_quality_constants_1.MANAGER_ROLES.has(role)) {
        return true;
    }
    if (water_quality_constants_1.RA_ROLES.has(role)) {
        return Number(sample.created_by) === Number(user?.userId);
    }
    if (water_quality_constants_1.PCRWR_ROLES.has(role)) {
        return (Number(sample.assigned_sampler) === Number(user?.userId) ||
            ['awaiting_collection', 'collecting', 'in_lab', 'results_ready'].includes(sample.status || ''));
    }
    return false;
}
//# sourceMappingURL=water-quality.helpers.js.map