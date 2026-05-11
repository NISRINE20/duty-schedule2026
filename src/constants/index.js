// Application Constants

export const LEAVE_TYPES = [
  'Sick Leave',
  'Informal Leave',
  'Ordinary Leave',
  'Passes',
  'Mental Wellness Break (MWB)',
];

export const SHIFT_TYPES = ['AM', 'PM', 'Leave'];

export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};

export const STORAGE_KEYS = {
  AUTH_ROLE: 'authRole',
  AUTH_NAME: 'authName',
  AUTH_UID: 'authUid',
};

export const ROUTE_PATHS = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  CALENDAR: '/calendar',
  TEMPLATES: '/templates',
  SUMMARY: '/summary',
};

export const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export const USER_COLORS = [
  '#bae6fd', '#bbf7d0', '#fef08a', '#fbcfe8', '#fed7aa',
  '#e9d5ff', '#ccfbf1', '#fecaca', '#e5e7eb',
];