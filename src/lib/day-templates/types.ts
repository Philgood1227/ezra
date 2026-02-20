export interface TaskCategorySummary {
  id: string;
  familyId: string;
  name: string;
  icon: string;
  colorKey: string;
  defaultItemKind?: PlanActionableKind | null;
}

export interface TemplateSummary {
  id: string;
  familyId: string;
  name: string;
  weekday: number;
  isDefault: boolean;
}

export type PlanActionableKind = "activity" | "mission" | "leisure";
export type PlanItemKind = "context" | PlanActionableKind;
export type PlanContextSubkind = "school" | "home" | "transport" | "club" | "daycare" | "other";

export interface TemplateTaskSummary {
  id: string;
  templateId: string;
  categoryId: string;
  itemKind?: PlanActionableKind;
  itemSubkind?: string | null;
  assignedProfileId?: string | null;
  assignedProfileDisplayName?: string | null;
  assignedProfileRole?: "parent" | "child" | "viewer" | null;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  sortOrder: number;
  pointsBase: number;
  knowledgeCardId?: string | null;
  knowledgeCardTitle?: string | null;
  category: TaskCategorySummary;
}

export type DayTemplateBlockType = "school" | "home" | "transport" | "club" | "daycare" | "free_time" | "other";

export interface DayTemplateBlockSummary {
  id: string;
  dayTemplateId: string;
  blockType: DayTemplateBlockType;
  label: string | null;
  startTime: string;
  endTime: string;
  sortOrder: number;
}

export type SchoolPeriodType = "vacances" | "jour_special";

export interface SchoolPeriodSummary {
  id: string;
  familyId: string;
  periodType: SchoolPeriodType;
  startDate: string;
  endDate: string;
  label: string;
}

export type DayPeriod = "ecole" | "vacances" | "weekend" | "jour_special";
export type DayMoment = "matin" | "apres-midi" | "soir";

export interface DayContextSummary {
  period: DayPeriod;
  periodLabel: string;
  currentMoment: DayMoment;
  currentContextLabel: string;
  isInSchoolBlock: boolean;
  activeSchoolBlockEndTime: string | null;
  nextVacationStartDate: string | null;
  nextVacationLabel: string | null;
  daysUntilNextVacation: number | null;
  hasSchoolPeriodsConfigured: boolean;
}

export type TaskInstanceStatus = "a_faire" | "en_cours" | "termine" | "en_retard" | "ignore";

export interface TaskInstanceSummary {
  id: string;
  familyId: string;
  childProfileId: string;
  templateTaskId: string;
  itemKind?: PlanActionableKind;
  itemSubkind?: string | null;
  assignedProfileId?: string | null;
  assignedProfileDisplayName?: string | null;
  assignedProfileRole?: "parent" | "child" | "viewer" | null;
  date: string;
  status: TaskInstanceStatus;
  startTime: string;
  endTime: string;
  pointsBase: number;
  pointsEarned: number;
  title: string;
  description: string | null;
  sortOrder: number;
  knowledgeCardId?: string | null;
  knowledgeCardTitle?: string | null;
  isReadOnly?: boolean;
  source?: "template_task" | "movie_session";
  sourceRefId?: string | null;
  category: TaskCategorySummary;
}

export interface RewardTierSummary {
  id: string;
  familyId: string;
  label: string;
  description: string | null;
  pointsRequired: number;
  sortOrder: number;
}

export interface DailyPointsSummary {
  id: string;
  familyId: string;
  childProfileId: string;
  date: string;
  pointsTotal: number;
}

export interface TemplateWithTasks extends TemplateSummary {
  tasks: TemplateTaskSummary[];
  blocks: DayTemplateBlockSummary[];
}

export interface TodayTimelineData {
  weekday: number;
  template: TemplateSummary | null;
  instances: TaskInstanceSummary[];
  blocks: DayTemplateBlockSummary[];
  dayContext: DayContextSummary;
  dailyPoints: DailyPointsSummary | null;
  rewardTiers: RewardTierSummary[];
}

export interface DayTimelineItemSummary {
  id: string;
  kind: PlanItemKind;
  subkind: string | null;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  sortOrder: number;
  status: TaskInstanceStatus | "planned" | "context";
  isActionable: boolean;
  isReadOnly: boolean;
  pointsBase: number;
  pointsEarned: number;
  source: "task_instance" | "template_block" | "movie_session" | "virtual_context";
  sourceRefId: string | null;
  category: {
    name: string;
    icon: string;
    colorKey: string;
  };
}

export type DayBalanceBucketKind = "school" | "activities" | "missions" | "leisure";

export interface DayBalanceBucketSummary {
  kind: DayBalanceBucketKind;
  label: string;
  minutesPlanned: number;
  units15Planned: number;
}

export interface DayBalanceSummary {
  unitMinutes: 15;
  totalPlannedMinutes: number;
  buckets: DayBalanceBucketSummary[];
  missionLeisureDeltaUnits15: number;
  comparisonLabel: "presque_pareil" | "un_peu_plus_missions" | "un_peu_plus_loisirs" | "ecart_important";
}

export interface WeekBalanceDaySummary {
  date: string;
  buckets: DayBalanceBucketSummary[];
  totalPlannedMinutes: number;
}

export interface WeekBalanceSummary {
  unitMinutes: 15;
  days: WeekBalanceDaySummary[];
  totals: DayBalanceBucketSummary[];
}

export interface TodayTimelineV2Data extends TodayTimelineData {
  v2Enabled: boolean;
  timelineItems: DayTimelineItemSummary[];
  currentContextItem: DayTimelineItemSummary | null;
  currentActionItem: DayTimelineItemSummary | null;
  nextTimelineItem: DayTimelineItemSummary | null;
  dayBalance: DayBalanceSummary;
}

export interface TaskPhaseFlags {
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
}

export interface TemplateWeekdayOverview {
  weekday: number;
  weekdayLabel: string;
  defaultTemplate: TemplateSummary | null;
  defaultTemplateBlocks: DayTemplateBlockSummary[];
  templates: TemplateSummary[];
}

export interface CategoryInput {
  name: string;
  icon: string;
  colorKey: string;
  defaultItemKind?: PlanActionableKind | null;
}

export interface TemplateInput {
  name: string;
  weekday: number;
  isDefault: boolean;
}

export interface TemplateTaskInput {
  categoryId: string;
  itemKind?: PlanActionableKind;
  itemSubkind?: string | null;
  assignedProfileId?: string | null;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  pointsBase: number;
  knowledgeCardId?: string | null;
}

export interface DayTemplateBlockInput {
  blockType: DayTemplateBlockType;
  label: string | null;
  startTime: string;
  endTime: string;
}

export interface SchoolPeriodInput {
  periodType: SchoolPeriodType;
  startDate: string;
  endDate: string;
  label: string;
}

export interface KnowledgeSection {
  title: string;
  text: string;
  bullets: string[];
}

export interface KnowledgeCardContent {
  sections: KnowledgeSection[];
}

export interface KnowledgeSubjectSummary {
  id: string;
  familyId: string;
  code: string;
  label: string;
  categoryCount: number;
  cardCount: number;
}

export interface KnowledgeCategorySummary {
  id: string;
  subjectId: string;
  label: string;
  sortOrder: number;
  cards: KnowledgeCardSummary[];
}

export interface KnowledgeCardSummary {
  id: string;
  categoryId: string;
  title: string;
  summary: string | null;
  difficulty: string | null;
  content: KnowledgeCardContent;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeSubjectInput {
  code: string;
  label: string;
}

export interface KnowledgeCategoryInput {
  subjectId: string;
  label: string;
  sortOrder: number;
}

export interface KnowledgeCardInput {
  categoryId: string;
  title: string;
  summary: string | null;
  difficulty: string | null;
  content: KnowledgeCardContent;
}

export interface AchievementCategorySummary {
  id: string;
  familyId: string;
  code: string;
  label: string;
  colorKey: string;
}

export interface AchievementConditionDailyPointsAtLeast {
  type: "daily_points_at_least";
  value: number;
}

export interface AchievementConditionTasksCompletedInRow {
  type: "tasks_completed_in_row";
  value: number;
}

export interface AchievementConditionPomodorosCompleted {
  type: "pomodoros_completed";
  value: number;
}

export type AchievementCondition =
  | AchievementConditionDailyPointsAtLeast
  | AchievementConditionTasksCompletedInRow
  | AchievementConditionPomodorosCompleted;

export interface AchievementSummary {
  id: string;
  categoryId: string;
  code: string;
  label: string;
  description: string | null;
  icon: string;
  autoTrigger: boolean;
  condition: AchievementCondition;
}

export interface AchievementInstanceSummary {
  id: string;
  achievementId: string;
  childProfileId: string;
  unlockedAt: string;
}

export interface AchievementWithState extends AchievementSummary {
  unlockedAt: string | null;
  isUnlocked: boolean;
}

export interface AchievementCategoryWithItems extends AchievementCategorySummary {
  achievements: AchievementWithState[];
}

export interface MovieSessionSummary {
  id: string;
  familyId: string;
  date: string;
  time: string | null;
  status: "planifiee" | "choisie" | "terminee";
  proposerProfileId: string | null;
  pickerProfileId: string | null;
  chosenOptionId: string | null;
  createdAt: string;
}

export interface MovieOptionSummary {
  id: string;
  sessionId: string;
  title: string;
  platform: string | null;
  durationMinutes: number | null;
  description: string | null;
}

export interface MovieVoteSummary {
  id: string;
  sessionId: string;
  profileId: string;
  movieOptionId: string;
  createdAt: string;
}

export interface MovieSessionInput {
  date: string;
  time: string | null;
  proposerProfileId: string | null;
  pickerProfileId: string | null;
  options: Array<{
    title: string;
    platform: string | null;
    durationMinutes: number | null;
    description: string | null;
  }>;
}

export interface FamilyMemberSummary {
  id: string;
  displayName: string;
  role: "parent" | "child" | "viewer";
}

export type MealType = "petit_dejeuner" | "dejeuner" | "diner" | "collation";

export interface IngredientSummary {
  id: string;
  familyId: string;
  label: string;
  emoji: string;
  defaultUnit: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientInput {
  label: string;
  emoji: string;
  defaultUnit: string | null;
}

export interface MealIngredientInput {
  ingredientId: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
}

export interface MealIngredientSummary {
  id: string;
  mealId: string;
  ingredientId: string;
  ingredientLabel: string;
  ingredientEmoji: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  sortOrder: number;
}

export interface RecipeIngredientSummary {
  id: string;
  recipeId: string;
  ingredientId: string;
  ingredientLabel: string;
  ingredientEmoji: string;
  quantity: number | null;
  unit: string | null;
  sortOrder: number;
}

export interface RecipeSummary {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  ingredients: RecipeIngredientSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipeInput {
  title: string;
  description: string | null;
  ingredients: MealIngredientInput[];
}

export interface WeeklyIngredientNeedSummary {
  key: string;
  ingredientLabel: string;
  ingredientEmoji: string;
  unit: string | null;
  totalQuantity: number | null;
  mealsCount: number;
}

export interface MealSummary {
  id: string;
  familyId: string;
  childProfileId: string;
  date: string;
  mealType: MealType;
  description: string;
  preparedByLabel: string | null;
  recipeId: string | null;
  recipeTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MealInput {
  date: string;
  mealType: MealType;
  description: string;
  preparedByLabel: string | null;
  recipeId?: string | null;
  ingredients?: MealIngredientInput[];
  saveAsRecipeTitle?: string | null;
}

export interface MealRatingSummary {
  id: string;
  mealId: string;
  rating: 1 | 2 | 3;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MealRatingInput {
  mealId: string;
  rating: 1 | 2 | 3;
  comment: string | null;
}

export interface MealWithRatingSummary extends MealSummary {
  ingredients: MealIngredientSummary[];
  rating: MealRatingSummary | null;
  isFavorite: boolean;
}

export type EmotionMoment = "matin" | "soir";
export type EmotionValue = "tres_content" | "content" | "neutre" | "triste" | "tres_triste";

export interface EmotionLogSummary {
  id: string;
  familyId: string;
  childProfileId: string;
  date: string;
  moment: EmotionMoment;
  emotion: EmotionValue;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmotionLogInput {
  date: string;
  moment: EmotionMoment;
  emotion: EmotionValue;
  note: string | null;
}

export interface RewardTierInput {
  label: string;
  description: string | null;
  pointsRequired: number;
  sortOrder: number;
}

export type SchoolDiaryEntryType = "devoir" | "evaluation" | "sortie" | "piscine" | "info";
export type SchoolDiaryRecurrencePattern = "none" | "weekly" | "biweekly" | "monthly";

export interface SchoolDiaryEntrySummary {
  id: string;
  familyId: string;
  childProfileId: string;
  type: SchoolDiaryEntryType;
  subject: string | null;
  title: string;
  description: string | null;
  date: string;
  recurrencePattern: SchoolDiaryRecurrencePattern;
  recurrenceUntilDate: string | null;
  recurrenceGroupId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolDiaryEntryInput {
  type: SchoolDiaryEntryType;
  subject: string | null;
  title: string;
  description: string | null;
  date: string;
  recurrencePattern?: SchoolDiaryRecurrencePattern;
  recurrenceUntilDate?: string | null;
}

export type ChecklistTemplateType = "piscine" | "sortie" | "evaluation" | "quotidien" | "autre";

export interface ChecklistTemplateItemSummary {
  id: string;
  templateId: string;
  label: string;
  sortOrder: number;
}

export interface ChecklistTemplateSummary {
  id: string;
  familyId: string;
  type: ChecklistTemplateType;
  label: string;
  description: string | null;
  isDefault: boolean;
  items: ChecklistTemplateItemSummary[];
}

export interface ChecklistTemplateInput {
  type: ChecklistTemplateType;
  label: string;
  description: string | null;
  isDefault: boolean;
}

export interface ChecklistTemplateItemInput {
  label: string;
}

export interface ChecklistInstanceItemSummary {
  id: string;
  checklistInstanceId: string;
  label: string;
  isChecked: boolean;
  sortOrder: number;
}

export interface ChecklistInstanceSummary {
  id: string;
  familyId: string;
  childProfileId: string;
  diaryEntryId: string | null;
  type: string;
  label: string;
  date: string;
  createdAt: string;
  items: ChecklistInstanceItemSummary[];
}

export interface ChecklistByDay {
  today: ChecklistInstanceSummary[];
  tomorrow: ChecklistInstanceSummary[];
}

export type AlarmMode = "ponctuelle" | "semaine_travail" | "semaine_complete" | "personnalise";
export type AlarmEventStatus = "declenchee" | "acknowledged";

export interface AlarmRuleSummary {
  id: string;
  familyId: string;
  childProfileId: string;
  label: string;
  mode: AlarmMode;
  oneShotAt: string | null;
  timeOfDay: string | null;
  daysMask: number;
  soundKey: string;
  message: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlarmRuleInput {
  label: string;
  mode: AlarmMode;
  oneShotAt: string | null;
  timeOfDay: string | null;
  daysMask: number;
  soundKey: string;
  message: string;
  enabled: boolean;
}

export interface AlarmEventSummary {
  id: string;
  alarmRuleId: string;
  familyId: string;
  childProfileId: string;
  dueAt: string;
  triggeredAt: string;
  acknowledgedAt: string | null;
  status: AlarmEventStatus;
  createdAt: string;
}

export interface AlarmEventWithRule extends AlarmEventSummary {
  ruleLabel: string;
  ruleMessage: string;
  ruleSoundKey: string;
}

export type NotificationRuleType = "rappel_devoir" | "rappel_checklist" | "rappel_journee";
export type NotificationChannel = "in_app" | "push" | "both";

export interface NotificationRuleSummary {
  id: string;
  familyId: string;
  childProfileId: string;
  type: NotificationRuleType;
  channel: NotificationChannel;
  timeOfDay: string;
  enabled: boolean;
}

export interface NotificationRuleInput {
  type: NotificationRuleType;
  channel: NotificationChannel;
  timeOfDay: string;
  enabled: boolean;
}

export interface InAppNotificationSummary {
  id: string;
  familyId: string;
  childProfileId: string;
  type: "rappel_devoir" | "rappel_checklist" | "rappel_journee" | "systeme";
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}

export interface ActionResult<TData = undefined> {
  success: boolean;
  error?: string;
  data?: TData;
}
