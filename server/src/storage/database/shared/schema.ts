import { pgTable, serial, timestamp, varchar, integer, boolean, text, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 系统健康检查表（必须保留）
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 学生信息表
export const students = pgTable(
  "students",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    student_no: varchar("student_no", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 50 }).notNull(),
    grade: integer("grade").notNull(), // 1-4 表示大一到大四
    class_name: varchar("class_name", { length: 20 }).notNull(),
    gender: varchar("gender", { length: 10 }),
    major: varchar("major", { length: 100 }),
    advisor_name: varchar("advisor_name", { length: 100 }),
    email: varchar("email", { length: 200 }),
    phone: varchar("phone", { length: 20 }),
    password: varchar("password", { length: 100 }), // 学生自己设置的密码
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("students_student_no_idx").on(table.student_no),
    index("students_grade_idx").on(table.grade),
    index("students_class_name_idx").on(table.class_name),
  ]
);

// 考证记录表
export const examRecords = pgTable(
  "exam_records",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    student_id: varchar("student_id", { length: 36 }).notNull().references(() => students.id, { onDelete: "cascade" }),
    subject_name: varchar("subject_name", { length: 100 }).notNull(),
    subject_code: varchar("subject_code", { length: 20 }).notNull(), // F1-F9, P1-P7 等
    score: integer("score"), // 0-100 分，未考为 null
    pass_status: boolean("pass_status").default(false).notNull(),
    exam_season: varchar("exam_season", { length: 20 }).notNull(), // 如 2024-03, 2024-09
    exam_type: varchar("exam_type", { length: 20 }).default('global_exam').notNull(), // global_exam 全球考, final_exam 期末考试（免考科目）
    screenshot_key: varchar("screenshot_key", { length: 200 }), // 成绩截图在对象存储的 key
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("exam_records_student_id_idx").on(table.student_id),
    index("exam_records_exam_season_idx").on(table.exam_season),
    index("exam_records_subject_code_idx").on(table.subject_code),
    index("exam_records_pass_status_idx").on(table.pass_status),
    index("exam_records_exam_type_idx").on(table.exam_type),
  ]
);

// 考季信息表（用于成绩公布提醒）
export const examSeasons = pgTable(
  "exam_seasons",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    season_name: varchar("season_name", { length: 20 }).notNull().unique(), // 如 2024-03
    result_date: timestamp("result_date", { withTimezone: true }), // 成绩公布日期
    reminder_enabled: boolean("reminder_enabled").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("exam_seasons_season_name_idx").on(table.season_name),
    index("exam_seasons_result_date_idx").on(table.result_date),
  ]
);

// 导师表
export const advisors = pgTable(
  "advisors",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 100 }).notNull().unique(),
    email: varchar("email", { length: 200 }),
    phone: varchar("phone", { length: 50 }),
    password_hash: varchar("password_hash", { length: 255 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("advisors_name_idx").on(table.name),
  ]
);

// 类型导出
export type Student = typeof students.$inferSelect;
export type ExamRecord = typeof examRecords.$inferSelect;
export type ExamSeason = typeof examSeasons.$inferSelect;
export type Advisor = typeof advisors.$inferSelect;