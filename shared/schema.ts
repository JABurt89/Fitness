import { pgTable, text, serial, numeric, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Progression scheme enum and types
export const ProgressionScheme = {
  RETARDED_VOLUME: "RETARDED_VOLUME",
  STRAIGHT_SETS: "STRAIGHT_SETS",
  RPT_INDEPENDENT: "RPT_INDEPENDENT",
} as const;

export type ProgressionSchemeType = typeof ProgressionScheme[keyof typeof ProgressionScheme];

// Progression scheme settings types
export type StraightSetsSettings = {
  targetWeight?: number;
  targetSets: number;
  targetReps: number;
};

export type RptIndependentSettings = {
  topSetRepRange: [number, number];
  dropPercentage: number; // 10-15%
  backoffSets: Array<{
    repRange: [number, number];
    weight?: number;
  }>;
};

export type ProgressionSettings = {
  type: ProgressionSchemeType;
  straightSets?: StraightSetsSettings;
  rptIndependent?: RptIndependentSettings;
};

// User table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Modified tables to include user references
export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  bodyPart: text("body_part").notNull(),
  setsRange: jsonb("sets_range").$type<[number, number]>().notNull(),
  repsRange: jsonb("reps_range").$type<[number, number]>().notNull(),
  weightIncrement: numeric("weight_increment").notNull(),
  restTimer: integer("rest_timer").notNull().default(60),
});

export const workoutDays = pgTable("workout_days", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  dayName: text("day_name").notNull(),
  exercises: jsonb("exercises").$type<string[]>().notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  lastCompleted: timestamp("last_completed"),
  progressionSchemes: jsonb("progression_schemes").$type<Record<string, ProgressionSettings>>().notNull().default({}),
});

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

// Progression scheme validation
const progressionSettingsSchema = z.object({
  type: z.enum([ProgressionScheme.RETARDED_VOLUME, ProgressionScheme.STRAIGHT_SETS, ProgressionScheme.RPT_INDEPENDENT]),
  straightSets: z.object({
    targetWeight: z.number().optional(),
    targetSets: z.number().int().positive(),
    targetReps: z.number().int().positive(),
  }).optional(),
  rptIndependent: z.object({
    topSetRepRange: z.tuple([z.number().int(), z.number().int()]),
    dropPercentage: z.number().min(10).max(15),
    backoffSets: z.array(z.object({
      repRange: z.tuple([z.number().int(), z.number().int()]),
      weight: z.number().optional(),
    })),
  }).optional(),
}).refine(
  (data) => {
    switch (data.type) {
      case ProgressionScheme.STRAIGHT_SETS:
        return !!data.straightSets;
      case ProgressionScheme.RPT_INDEPENDENT:
        return !!data.rptIndependent;
      default:
        return true;
    }
  },
  {
    message: "Progression scheme settings must match the selected type",
  }
);

// Other schemas remain unchanged but will include userId in their types
export const exerciseSchema = createInsertSchema(exercises);
export const workoutDaySchema = createInsertSchema(workoutDays).extend({
  lastCompleted: z.string().datetime().nullable().optional()
    .transform(val => val ? new Date(val) : null),
  progressionSchemes: z.record(z.string(), progressionSettingsSchema).default({}),
});
export const weightLogSchema = createInsertSchema(weightLog);

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