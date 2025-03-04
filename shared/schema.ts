import { pgTable, text, serial, numeric, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Add more progression scheme types
export const ProgressionScheme = {
  STRAIGHT_SETS: "STRAIGHT_SETS",
  REVERSE_PYRAMID: "REVERSE_PYRAMID",
  DOUBLE_PROGRESSION: "DOUBLE_PROGRESSION",
  RPT_INDEPENDENT: "RPT_INDEPENDENT",
  RETARDED_VOLUME: "RETARDED_VOLUME"
} as const;

export type ProgressionSchemeType = typeof ProgressionScheme[keyof typeof ProgressionScheme];

// Define settings for each progression type
export type StraightSetsSettings = {
  targetSets: number;
  targetReps: number;
  weight: number;
};

export type ReversePyramidSettings = {
  topSetWeight: number;
  topSetReps: number;
  dropPercentage: number; // e.g., 10% = 0.10
  backoffSets: number;
};

export type DoubleProgressionSettings = {
  repRangeMin: number;
  repRangeMax: number;
  targetSets: number;
  currentWeight: number;
};

export type RptIndependentSettings = {
  topSetRepRange: [number, number];
  dropPercentage: number;
  backoffSets: Array<{
    repRange: [number, number];
    weight?: number;
  }>;
};

export type RetardedVolumeSettings = {
  baseWeight: number;
  targetSets: number;
  setVariations: Array<{
    reps: number;
    weightMultiplier: number; // percentage of base weight
    isOptional?: boolean;
  }>;
  failureHandling: {
    minRepsBeforeFailure: number;
    deloadPercentage: number;
  };
};

export type ProgressionSettings = {
  type: ProgressionSchemeType;
  straightSets?: StraightSetsSettings;
  reversePyramid?: ReversePyramidSettings;
  doubleProgression?: DoubleProgressionSettings;
  rptIndependent?: RptIndependentSettings;
  retardedVolume?: RetardedVolumeSettings;
};

// Table definitions
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  bodyPart: text("body_part").notNull(),
  setsRange: jsonb("sets_range").$type<[number, number]>().notNull(),
  repsRange: jsonb("reps_range").$type<[number, number]>().notNull(),
  weightIncrement: numeric("weight_increment").notNull(),
  restTimer: integer("rest_timer").notNull().default(60),
  startingWeightType: text("starting_weight_type").notNull().default('Barbell'),
  customStartingWeight: numeric("custom_starting_weight"),
});

// Validation schemas
const progressionSettingsSchema = z.object({
  type: z.enum([
    ProgressionScheme.STRAIGHT_SETS,
    ProgressionScheme.REVERSE_PYRAMID,
    ProgressionScheme.DOUBLE_PROGRESSION,
    ProgressionScheme.RPT_INDEPENDENT,
    ProgressionScheme.RETARDED_VOLUME
  ]),
  straightSets: z.object({
    targetSets: z.number().int().positive(),
    targetReps: z.number().int().positive(),
    weight: z.number().positive()
  }).optional(),
  reversePyramid: z.object({
    topSetWeight: z.number().positive(),
    topSetReps: z.number().int().positive(),
    dropPercentage: z.number().min(0.05).max(0.15),
    backoffSets: z.number().int().positive()
  }).optional(),
  doubleProgression: z.object({
    repRangeMin: z.number().int().positive(),
    repRangeMax: z.number().int().positive(),
    targetSets: z.number().int().positive(),
    currentWeight: z.number().positive()
  }).optional(),
  rptIndependent: z.object({
    topSetRepRange: z.tuple([z.number().int(), z.number().int()]),
    dropPercentage: z.number().min(0.05).max(0.15),
    backoffSets: z.array(z.object({
      repRange: z.tuple([z.number().int(), z.number().int()]),
      weight: z.number().optional()
    }))
  }).optional(),
  retardedVolume: z.object({
    baseWeight: z.number().positive(),
    targetSets: z.number().int().positive(),
    setVariations: z.array(z.object({
      reps: z.number().int().positive(),
      weightMultiplier: z.number().positive(),
      isOptional: z.boolean().optional()
    })).min(1),
    failureHandling: z.object({
      minRepsBeforeFailure: z.number().int().positive(),
      deloadPercentage: z.number().min(0.05).max(0.20)
    })
  }).optional()
}).refine(
  (data) => {
    switch (data.type) {
      case ProgressionScheme.STRAIGHT_SETS:
        return !!data.straightSets;
      case ProgressionScheme.REVERSE_PYRAMID:
        return !!data.reversePyramid;
      case ProgressionScheme.DOUBLE_PROGRESSION:
        return !!data.doubleProgression;
      case ProgressionScheme.RPT_INDEPENDENT:
        return !!data.rptIndependent;
      case ProgressionScheme.RETARDED_VOLUME:
        return !!data.retardedVolume;
      default:
        return false;
    }
  },
  {
    message: "Progression scheme settings must match the selected type",
  }
);

// Add exercise schema
export const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required"),
  bodyPart: z.string().min(1, "Body part is required"),
  setsRange: z.tuple([
    z.number().int().min(1, "Minimum sets must be at least 1"),
    z.number().int().min(1, "Maximum sets must be at least 1")
  ]).refine(([min, max]) => min <= max, "Minimum sets must be less than or equal to maximum sets"),
  repsRange: z.tuple([
    z.number().int().min(1, "Minimum reps must be at least 1"),
    z.number().int().min(1, "Maximum reps must be at least 1")
  ]).refine(([min, max]) => min <= max, "Minimum reps must be less than or equal to maximum reps"),
  weightIncrement: z.number().min(0.5, "Weight increment must be at least 0.5"),
  restTimer: z.number().int().min(0, "Rest timer must be non-negative").default(60),
  startingWeightType: z.enum(["Barbell", "EZ Bar", "Dumbbell", "Smith Machine", "Custom"]),
  customStartingWeight: z.number().positive("Custom starting weight must be positive").optional(),
}).refine(
  (data) => {
    if (data.startingWeightType === "Custom") {
      return data.customStartingWeight != null;
    }
    return true;
  },
  {
    message: "Custom starting weight is required when using Custom type",
    path: ["customStartingWeight"],
  }
);

// Workout days table and schema
export const workoutDays = pgTable("workout_days", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  dayName: text("day_name").notNull(),
  exercises: jsonb("exercises").$type<string[]>().notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  lastCompleted: timestamp("last_completed"),
  progressionSchemes: jsonb("progression_schemes").$type<Record<string, ProgressionSettings>>().notNull().default({}),
});

export const workoutDaySchema = z.object({
  userId: z.number().optional(), // Made optional since it will be injected by the server
  dayName: z.string().min(1, "Day name is required"),
  exercises: z.array(z.string()).min(1, "Select at least one exercise"),
  displayOrder: z.number().int().min(0).default(0),
  lastCompleted: z.date().nullable().optional(),
  progressionSchemes: z.record(z.string(), progressionSettingsSchema).default({})
});

// Workout logs and weight log tables
export const workoutLogs = pgTable("workout_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull().defaultNow(),
  exercise: text("exercise").notNull(),
  completedSets: integer("completed_sets").notNull(),
  failedRep: integer("failed_rep").notNull(),
  targetReps: integer("target_reps").notNull(),
  weight: numeric("weight").notNull(),
  calculatedOneRM: numeric("calculated_one_rm").notNull(),
});

export const weightLog = pgTable("weight_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull().defaultNow(),
  weight: numeric("weight").notNull(),
});

// Authentication schemas
export const userSchema = createInsertSchema(users).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Base workout log validation
const baseWorkoutLogFields = {
  userId: z.number(),
  exercise: z.string().min(1, "Exercise name is required"),
  weight: z.number().nonnegative("Weight cannot be negative"),
  targetReps: z.number().int().positive("Target reps must be greater than 0"),
  completedSets: z.number().int().nonnegative("Completed sets cannot be negative"),
  failedRep: z.number().int().nonnegative("Failed rep cannot be negative"),
  calculatedOneRM: z.number().nonnegative("Calculated 1RM cannot be negative"),
  date: z.date().or(z.string().transform(val => new Date(val))).optional(),
};

export const manualWorkoutLogSchema = z.object(baseWorkoutLogFields)
  .transform(data => ({
    ...data,
    date: data.date || new Date()
  }));

export const automaticWorkoutLogSchema = z.object(baseWorkoutLogFields)
  .extend({
    completedSets: z.number()
      .int()
      .min(3, "Automated workouts require at least 3 sets"),
  })
  .transform(data => ({
    ...data,
    date: data.date || new Date()
  }));

// Weight log schema
export const weightLogSchema = z.object({
  weight: z.number().positive("Weight must be positive"),
  date: z.date().or(z.string().transform(val => new Date(val))).optional()
}).transform(data => ({
  ...data,
  date: data.date || new Date()
}));

// Export types
export type User = typeof users.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type WorkoutDay = typeof workoutDays.$inferSelect;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type WeightLog = typeof weightLog.$inferSelect;

export type InsertUser = z.infer<typeof userSchema>;
export type InsertExercise = z.infer<typeof exerciseSchema>;
export type InsertWorkoutDay = z.infer<typeof workoutDaySchema>;
export type InsertWorkoutLog = z.infer<typeof manualWorkoutLogSchema>;
export type InsertWeightLog = z.infer<typeof weightLogSchema>;

// Helper type for automatic entries
export type AutomaticWorkoutLog = z.infer<typeof automaticWorkoutLogSchema>;