export interface ParentNavBadges {
  notifications: number;
  schoolDiary: number;
  checklists: number;
  alarms: number;
}

export const EMPTY_PARENT_NAV_BADGES: ParentNavBadges = {
  notifications: 0,
  schoolDiary: 0,
  checklists: 0,
  alarms: 0,
};
