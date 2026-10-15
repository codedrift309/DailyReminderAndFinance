import { localRequest } from "./localData";
import { removePushReminder, syncPushReminder } from "./pushClient";

// All finance records are stored in this browser profile's local storage. No API
// request sends these records to Render or another device.
export const api = {
  get: async (url, options = {}) => ({ data: localRequest("GET", url, null, options.params || {}) }),
  post: async (url, data) => ({ data: localRequest("POST", url, data) }),
  put: async (url, data) => ({ data: localRequest("PUT", url, data) }),
  delete: async (url) => ({ data: localRequest("DELETE", url) }),
};

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
  create: async (data) => {
    const result = await api.post("/api/reminders", data);
    await syncPushReminder(result.data).catch(error => console.warn("Push reminder sync failed", error));
    return result;
  },
  update: async (id, data) => {
    const result = await api.put(`/api/reminders/${id}`, data);
    await syncPushReminder(result.data).catch(error => console.warn("Push reminder sync failed", error));
    return result;
  },
  remove: async (id) => {
    const result = await api.delete(`/api/reminders/${id}`);
    await removePushReminder(id).catch(error => console.warn("Push reminder removal failed", error));
    return result;
  },
  complete: async (id) => {
    const result = await api.post(`/api/reminders/${id}/complete`);
    await syncPushReminder(result.data).catch(error => console.warn("Push reminder sync failed", error));
    return result;
  },
  snooze: async (id, option) => {
    const result = await api.post(`/api/reminders/${id}/snooze`, typeof option === "number" ? { minutes: option } : { option });
    await syncPushReminder(result.data).catch(error => console.warn("Push reminder sync failed", error));
    return result;
  },
  due: () => api.get("/api/reminders/due"),
};

export const reportsApi = {
  summary: (params) => api.get("/api/reports/summary", { params }),
  categories: (params) => api.get("/api/reports/categories", { params }),
  monthly: (year) => api.get("/api/reports/monthly-comparison", { params: { year } }),
  expenses: (params) => api.get("/api/reports/expenses", { params }),
  income: (params) => api.get("/api/reports/income", { params }),
  incomeVsExpense: (params) => api.get("/api/reports/income-vs-expense", { params }),
  export: (type, params) => api.get("/api/reports/export", { params: { ...params, type } }),
};
