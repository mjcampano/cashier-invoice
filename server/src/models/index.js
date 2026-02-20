import AttendanceRecord from "./AttendanceRecord.js";
import AuditLog from "./AuditLog.js";
import ClassModel from "./Class.js";
import Enrollment from "./Enrollment.js";
import EventModel from "./Event.js";
import Expense from "./Expense.js";
import Invoice from "./Invoice.js";
import Message from "./Message.js";
import Notice from "./Notice.js";
import Payment from "./Payment.js";
import Role from "./Role.js";
import Setting from "./Setting.js";
import Student from "./Student.js";
import Teacher from "./Teacher.js";
import User from "./User.js";

export const COLLECTION_MODELS = {
  users: User,
  roles: Role,
  teachers: Teacher,
  students: Student,
  classes: ClassModel,
  enrollments: Enrollment,
  attendance_records: AttendanceRecord,
  payments: Payment,
  invoices: Invoice,
  expenses: Expense,
  notices: Notice,
  messages: Message,
  events: EventModel,
  audit_logs: AuditLog,
  settings: Setting,
};

export default COLLECTION_MODELS;
