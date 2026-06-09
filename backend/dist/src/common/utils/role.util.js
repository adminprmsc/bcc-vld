"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleEnumToApi = roleEnumToApi;
exports.roleApiToEnum = roleApiToEnum;
function roleEnumToApi(role) {
    if (!role) {
        return '';
    }
    return role.toString().replace(/_/g, ' ');
}
function roleApiToEnum(role) {
    return role.replace(/ /g, '_');
}
//# sourceMappingURL=role.util.js.map