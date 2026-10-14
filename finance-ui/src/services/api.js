import axios from "axios";

const host = (typeof window !== "undefined" && window.location && window.location.hostname) ? window.location.hostname : "localhost";
let override = null;
if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  if (params.get("api")) { override = params.get("api"); localStorage.setItem("finance_api_base", override); }
  else override = localStorage.getItem("finance_api_base");
}
const baseURL = import.meta.env.VITE_API_URL || override || `http://${host}:5139`;
export const api = axios.create({ baseURL, timeout: 15000 });

export const expensesApi = {
  list: (params) => api.get("/api/expenses", { params }),
  get: (id) => api.get(`/api/expenses/${id}`),
  create: (data) => api.post("/api/expenses", data),
  update: (id, data) => api.put(`/api/expenses/${id}`, data),
  remove: (id) => api.delete(`/api/expenses/${id}`),
  total: (params) => api.get("/api/expenses/total", { params }),
};

export const categoriesApi = {
  list: (includeInactive) => api.get("/api/categories", { params: { includeInactive } }),
  get: (id) => api.get(`/api/categories/${id}`),
  create: (data) => api.post("/api/categories", data),
  update: (id, data) => api.put(`/api/categories/${id}`, data),
  remove: (id) => api.delete(`/api/categories/${id}`),
};

export const incomesApi = {
  list: (params) => api.get("/api/incomes", { params }),
  get: (id) => api.get(`/api/incomes/${id}`),
  create: (data) => api.post("/api/incomes", data),
  update: (id, data) => api.put(`/api/incomes/${id}`, data),
  remove: (id) => api.delete(`/api/incomes/${id}`),
  types: () => api.get("/api/incomes/types"),
  total: (params) => api.get("/api/incomes/total", { params }),
};

export const remindersApi = {
  list: (includeDisabled) => api.get("/api/reminders", { params: { includeDisabled } }),
  get: (id) => api.get(`/api/reminders/${id}`),
  create: (data) => api.post("/api/reminders", data),
  update: (id, data) => api.put(`/api/reminders/${id}`, data),
  remove: (id) => api.delete(`/api/reminders/${id}`),
  complete: (id) => api.post(`/api/reminders/${id}/complete`),
  snooze: (id, minutes) => api.post(`/api/reminders/${id}/snooze`, { minutes }),
  due: () => api.get("/api/reminders/due"),
};

export const reportsApi = {
  summary: (params) => api.get("/api/reports/summary", { params }),
  categories: (params) => api.get("/api/reports/categories", { params }),
  monthly: (year) => api.get("/api/reports/monthly-comparison", { params: { year } }),
  expenses: (params) => api.get("/api/reports/expenses", { params }),
  income: (params) => api.get("/api/reports/income", { params }),
  incomeVsExpense: (params) => api.get("/api/reports/income-vs-expense", { params }),
};