"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toUserResponse = toUserResponse;
const role_util_1 = require("../../common/utils/role.util");
function toUserResponse(user) {
    return {
        id: user.id,
        numericId: user.simple_id ?? null,
        name: user.name,
        email: user.email,
        role: (0, role_util_1.roleEnumToApi)(user.role),
        gender: user.gender || '',
        cnic: user.cnic || '',
        cnicExpiry: user.cnic_expiry || '',
        address: user.address || '',
        dob: user.dob || '',
        phone: user.phone || '',
        activeStatus: user.active_status || '',
    };
}
//# sourceMappingURL=user.mapper.js.map