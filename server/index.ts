import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { setupAuth } from "./auth";
import { users, exercises, workoutDays, workoutLogs, weightLog } from "@shared/schema";

const app = express();

// Configure middleware before routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Create tables in correct order
    const createTables = async () => {
      log('Creating users table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      log('Creating exercises table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS exercises (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          name TEXT NOT NULL,
          body_part TEXT NOT NULL,
          sets_range JSONB NOT NULL,
          reps_range JSONB NOT NULL,
          weight_increment NUMERIC NOT NULL,
          rest_timer INTEGER NOT NULL DEFAULT 60
        );
      `);

      log('Creating workout_days table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS workout_days (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          day_name TEXT NOT NULL,
          exercises JSONB NOT NULL,
          display_order INTEGER NOT NULL DEFAULT 0,
          last_completed TIMESTAMP
        );
      `);

      log('Creating workout_logs table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS workout_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          date TIMESTAMP NOT NULL DEFAULT NOW(),
          exercise TEXT NOT NULL,
          completed_sets INTEGER NOT NULL,
          failed_rep INTEGER NOT NULL,
          target_reps INTEGER NOT NULL,
          weight NUMERIC NOT NULL,
          calculated_one_rm NUMERIC NOT NULL
        );
      `);

      log('Creating weight_log table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS weight_log (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          date TIMESTAMP NOT NULL DEFAULT NOW(),
          weight NUMERIC NOT NULL
        );
      `);
    };

    await createTables();

    // Verify database connection
    await db.execute(sql`SELECT 1`);
    log('Database connection and tables verified');

    // Setup authentication before routes
    setupAuth(app);

    const server = await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error('Server error:', err);
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`serving on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();