"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandRoleAliases = expandRoleAliases;
exports.roleMatches = roleMatches;
const ROLE_SYNONYMS = {
    'infra engineer': ['Infra Engineer', 'Infra Head', 'Infrastructure Engineer', 'Infra Incharge'],
    'infra head': ['Infra Head', 'Infra Engineer'],
    cid: ['CID', 'CID Officer'],
    'cid officer': ['CID Officer', 'CID'],
    'bcc officer tehsil': ['BCC Officer Tehsil', 'BCC Officer'],
    'bcc officer': ['BCC Officer', 'BCC Officer Tehsil'],
    'bcc specialist': ['BCC Specialist'],
    'dm tehsil': ['DM Tehsil', 'Tehsil DM'],
    'tehsil dm': ['Tehsil DM', 'DM Tehsil'],
    'edcs consultant': ['EDCS Consultant', 'Consultant', 'EDCS', 'EDCS User'],
    'edcs user': ['EDCS User', 'EDCS Consultant', 'EDCS'],
    'tehsil manager': ['Tehsil Manager', 'TM', 'TM User'],
    tm: ['Tehsil Manager', 'TM', 'TM User'],
    'wb user': ['WB User', 'World Bank User', 'WB'],
    wb: ['WB User', 'World Bank User', 'WB'],
};
function expandRoleAliases(roleInput) {
    const roles = Array.isArray(roleInput) ? roleInput : [roleInput];
    const expanded = new Set();
    roles.forEach((role) => {
        const raw = (role || '').toString().trim();
        if (!raw) {
            return;
        }
        expanded.add(raw);
        const aliasList = ROLE_SYNONYMS[raw.toLowerCase()];
        if (aliasList) {
            aliasList.forEach((alias) => expanded.add(alias));
        }
    });
    return Array.from(expanded);
}
function roleMatches(userRole, allowedRoles) {
    const expanded = expandRoleAliases(allowedRoles).map((r) => r.toLowerCase());
    const allowedSet = new Set(expanded);
    return allowedSet.has((userRole || '').toString().trim().toLowerCase());
}
//# sourceMappingURL=role-synonyms.js.map