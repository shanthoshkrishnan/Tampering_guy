// src/config/rolesSchema.js

export const ROLE_SCHEMAS = {
  USER: {
    role: 'USER',
    level: 0,
    required_fields: [
      'role',
      'user_id',
      'full_name',
      'phone',
      'shop_name',
      'shop_address',
      'city',
      'district',
      'state',
      'created_at',
      'status',
    ],
    optional_fields: [
      'email',
      'gst_number',
      'owner_id',
      'preferred_language',
      'opening_hours',
      'devices',
      'last_device_verification',
    ],
  },
  ADMIN: {
    role: 'ADMIN',
    level: 2,
    required_fields: [
      'role',
      'admin_id',
      'full_name',
      'email',
      'phone',
      'designation',
      'city',
      'district',
      'region_code',
      'created_at',
      'status',
    ],
    optional_fields: [
      'office_address',
      'permissions',
      'assigned_inspectors',
      'accessible_devices_scope',
      'device_fingerprint',
      'public_key',
    ],
  },
  DISTRICT_SUPER_ADMIN: {
    role: 'DISTRICT_SUPER_ADMIN',
    level: 3,
    required_fields: [
      'role',
      'super_admin_id',
      'full_name',
      'email',
      'phone',
      'designation',
      'state',
      'district',
      'region_code',
      'created_at',
      'status',
    ],
    optional_fields: [
      'office_address',
      'permissions',
      'accessible_devices_scope',
      'device_fingerprint',
      'public_key',
      'mfa_enabled',
    ],
  },
  LM_OFFICER: {
    role: 'LM_OFFICER',
    level: 4,
    required_fields: [
      'role',
      'lm_officer_id',
      'full_name',
      'email',
      'phone',
      'designation',
      'state',
      'assigned_zone',
      'created_at',
      'status',
    ],
    optional_fields: [
      'office_address',
      'employee_code',
      'department_location',
      'jurisdiction_districts',
    ],
  },
  MANUFACTURER: {
    role: 'MANUFACTURER',
    level: 5,
    required_fields: [
      'role',
      'manufacturer_id',
      'manufacturer_name',
      'contact_person',
      'phone',
      'email',
      'address',
      'company_registration_number',
      'approved_device_models',
      'created_at',
      'status',
    ],
    optional_fields: [
      'gst_number',
      'website',
      'notes',
    ],
  },
};

// who can create which role
export const CREATION_MAP = {
  MANUFACTURER: 'LM_OFFICER',
  LM_OFFICER: 'DISTRICT_SUPER_ADMIN',
  DISTRICT_SUPER_ADMIN: 'ADMIN',
  ADMIN: 'USER',
  USER: null,
};

export const normalizeRole = (role) =>
  role ? String(role).toUpperCase() : null;

export const canCreateRole = (parentRole, childRole) => {
  const p = normalizeRole(parentRole);
  const c = normalizeRole(childRole);
  if (!p || !c) return false;
  return CREATION_MAP[p] === c;
};

export const roleRequiresApproval = (role) => {
  const r = normalizeRole(role);
  // self-registered USER always pending; others you can tweak
  return r === 'USER';
};

export const getRoleSchema = (role) => {
  const r = normalizeRole(role);
  return ROLE_SCHEMAS[r] || null;
};
