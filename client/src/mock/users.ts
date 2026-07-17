import type { User } from "../types/user";

export const users: User[] = [
  {
    id: 1,
    username: "patient01",
    password: "123456",
    role: "patient",
    firstName: "สมชาย",
    lastName: "ใจดี",
  },

  {
    id: 2,
    username: "patient02",
    password: "123456",
    role: "patient",
    firstName: "สมหญิง",
    lastName: "สุขใจ",
  },

  {
    id: 3,
    username: "nurse01",
    password: "123456",
    role: "nurse",
    firstName: "สุดา",
    lastName: "พยาบาล",
  },

  {
    id: 4,
    username: "admin",
    password: "admin123",
    role: "admin",
    firstName: "System",
    lastName: "Administrator",
  },
];