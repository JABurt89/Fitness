import { pgTable, text, serial, numeric, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Database table definitions remain unchanged
export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bodyPart: text("body_part").notNull(),
  setsRange: jsonb("sets_range").$type<[number, number]>().notNull(),
  repsRange: jsonb("reps_range").$type<[number, number]>().notNull(),
  weightIncrement: numeric("weight_increment").notNull(),
});

export const workoutDays = pgTable("workout_days", {
  id: serial("id").primaryKey(),
  dayName: text("day_name").notNull(),
  exercises: jsonb("exercises").$type<string[]>().notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  lastCompleted: timestamp("last_completed"),
});

export const workoutLogs = pgTable("workout_logs", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull().defaultNow(),
  exercise: text("exercise").notNull(),
  completedSets: integer("completed_sets").notNull(),  
  failedRep: integer("failed_rep").notNull(),          
  targetReps: integer("target_reps").notNull(),        
  weight: numeric("weight").notNull(),
  calculatedOneRM: numeric("calculated_one_rm").notNull(),
});

export const setLogs = pgTable("set_logs", {
  id: serial("id").primaryKey(),
  workoutLogId: integer("workout_log_id").notNull(),
  setNumber: integer("set_number").notNull(),
  isSuccess: integer("is_success").notNull(),
  actualReps: integer("actual_reps"),
  notes: text("notes"),
});

export const weightLog = pgTable("weight_log", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull().defaultNow(),
  weight: numeric("weight").notNull(),
});

// Schema definitions
export const exerciseSchema = createInsertSchema(exercises);
export const workoutDaySchema = createInsertSchema(workoutDays);

// Base validation rules that apply to all workout logs
const baseWorkoutLogValidation = {
  exercise: z.string().min(1, "Exercise name is required"),
  completedSets: z.number()
    .int("Completed sets must be an integer")
    .nonnegative("Completed sets cannot be negative"),
  failedRep: z.number()
    .int("Failed rep must be an integer")
    .nonnegative("Failed rep cannot be negative"),
  targetReps: z.number()
    .int("Target reps must be an integer")
    .positive("Target reps must be greater than 0"),
  weight: z.number()
    .nonnegative("Weight cannot be negative"),
  calculatedOneRM: z.number()
    .nonnegative("Calculated 1RM cannot be negative"),
  date: z.date().or(z.string().transform(val => new Date(val))).optional(),
  isManualEntry: z.boolean(),
};

// Create the workout log schema with conditional validation
export const workoutLogSchema = z.object(baseWorkoutLogValidation)
  .superRefine((data, ctx) => {
    console.log('SuperRefine validation:', {
      data,
      isManualEntry: data.isManualEntry,
      typeofIsManualEntry: typeof data.isManualEntry
    });

    // Skip validation for manual entries
    if (data.isManualEntry === true) {
      console.log('Manual entry detected, skipping additional validation');
      return;
    }

    // Apply automatic entry validation rules
    if (data.completedSets < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Completed sets must be at least 3 for automatic entries",
        path: ["completedSets"]
      });
    }
  })
  .transform(data => {
    console.log('Schema transform:', {
      beforeTransform: data,
      isManualEntry: data.isManualEntry,
      typeofIsManualEntry: typeof data.isManualEntry
    });

    return {
      ...data,
      date: data.date || new Date(),
      isManualEntry: Boolean(data.isManualEntry)
    };
  });

export const setLogSchema = createInsertSchema(setLogs);
export const weightLogSchema = createInsertSchema(weightLog);

export type Exercise = typeof exercises.$inferSelect;
export type WorkoutDay = typeof workoutDays.$inferSelect;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type SetLog = typeof setLogs.$inferSelect;
export type WeightLog = typeof weightLog.$inferSelect;

export type InsertExercise = z.infer<typeof exerciseSchema>;
export type InsertWorkoutDay = z.infer<typeof workoutDaySchema>;
export type InsertWorkoutLog = z.infer<typeof workoutLogSchema>;
export type InsertSetLog = z.infer<typeof setLogSchema>;
export type InsertWeightLog = z.infer<typeof weightLogSchema>;