import { pgTable, text, serial, numeric, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  completedSets: numeric("completed_sets").notNull(),
  failedRep: numeric("failed_rep").notNull(),
  targetReps: numeric("target_reps").notNull(),
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

// Create insert schemas with proper validation
export const exerciseSchema = createInsertSchema(exercises);
export const workoutDaySchema = createInsertSchema(workoutDays);

// Separate validation for workout logs - only ensure non-negative numbers
export const workoutLogSchema = createInsertSchema(workoutLogs, {
  completedSets: z.number().min(0, "Number of sets cannot be negative"),
  failedRep: z.number().min(0, "Failed rep must be 0 or positive"),
  targetReps: z.number().min(1, "Target reps must be at least 1"),
  weight: z.number().min(0, "Weight cannot be negative"),
  calculatedOneRM: z.number().min(0, "1RM cannot be negative"),
  date: z.date().or(z.string().transform(val => new Date(val))),
});

export const setLogSchema = createInsertSchema(setLogs);
export const weightLogSchema = createInsertSchema(weightLog);

// Export types
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