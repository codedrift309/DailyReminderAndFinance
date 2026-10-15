const STORAGE_KEY = "personal-finance-device-data-v1";
const FINISHED = "9999-12-31T23:59:59.9999999";
const DEFAULT_INCOME_TYPES = ["Salary", "Rent Received", "Borrow Return / Money Returned"];

function indiaNow() {
  return formatIndiaTime(new Date());
}

function formatIndiaTime(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  const part = (type) => parts.find(x => x.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}`;
}

function initialData() {
  const createdAt = new Date().toISOString();
  const names = ["Food", "Recharge", "Petrol", "Traveling", "Other"];
  return {
    nextIds: { category: names.length + 1, expense: 1, income: 1, reminder: 1 },
    categories: names.map((name, index) => ({ id: index + 1, name, isActive: true, isDefault: true, createdAt })),
    expenses: [], incomes: [], reminders: []
  };
}

function readData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialData();
    const data = JSON.parse(stored);
    return { ...initialData(), ...data, nextIds: { ...initialData().nextIds, ...data.nextIds } };
  } catch {
    return initialData();
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function nextId(data, kind) {
  const id = data.nextIds[kind] || 1;
  data.nextIds[kind] = id + 1;
  return id;
}

function fail(message, status = 400) {
  const error = new Error(message);
  error.response = { status, data: { error: message } };
  throw error;
}

function dateOnly(value) { return value ? String(value).slice(0, 10) : ""; }
function addDays(date, days) {
  const [year, month, day] = dateOnly(date).split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, "0")}-${String(result.getUTCDate()).padStart(2, "0")}`;
}
function addMonths(date, months) {
  const [year, month, day] = dateOnly(date).split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}
function addYears(date, years) { return addMonths(date, years * 12); }

function computeNext(reminder, after = indiaNow()) {
  const time = String(reminder.reminderTime || "09:00:00").slice(0, 8).padEnd(8, "0");
  const startDate = dateOnly(reminder.startDate);
  const start = `${startDate}T${time}`;
  if (Number(reminder.recurrence) === 0) return start;

  let candidate = start;
  const interval = Math.max(1, Number(reminder.recurrenceInterval || 1));
  let guard = 0;
  while (candidate < after && guard++ < 10000) {
    const date = candidate.slice(0, 10);
    let nextDate;
    switch (Number(reminder.recurrence)) {
      case 1: nextDate = addDays(date, interval); break;
      case 2:
      case 5: {
        const [startYear, startMonth] = startDate.split("-").map(Number);
        const [currentYear, currentMonth] = date.split("-").map(Number);
        const monthOffset = (currentYear - startYear) * 12 + currentMonth - startMonth + interval;
        nextDate = addMonths(startDate, monthOffset);
        break;
      }
      case 3: {
        const startYear = Number(startDate.slice(0, 4));
        const currentYear = Number(date.slice(0, 4));
        nextDate = addYears(startDate, currentYear - startYear + interval);
        break;
      }
      case 4: nextDate = addDays(date, interval); break;
      default: nextDate = addDays(date, 1);
    }
    candidate = `${nextDate}T${time}`;
  }
  if (reminder.endDate && dateOnly(candidate) > dateOnly(reminder.endDate)) return FINISHED;
  return candidate;
}

function decorateExpense(data, expense) {
  return { ...expense, categoryName: data.categories.find(c => c.id === expense.categoryId)?.name || "Unknown" };
}
function filteredTransactions(rows, params, dateField, textFields) {
  let result = rows.filter(row => {
    const date = dateOnly(row[dateField]);
    const from = dateOnly(params[dateField === "paymentDate" ? "paymentFrom" : "receivedFrom"]);
    const to = dateOnly(params[dateField === "paymentDate" ? "paymentTo" : "receivedTo"]);
    const entryFrom = dateOnly(params.entryFrom);
    const entryTo = dateOnly(params.entryTo);
    const amount = Number(row.amount || 0);
    const search = String(params.search || "").trim().toLowerCase();
    return (!from || date >= from) && (!to || date <= to)
      && (!entryFrom || dateOnly(row.entryDate) >= entryFrom) && (!entryTo || dateOnly(row.entryDate) <= entryTo)
      && (params.minAmount === undefined || params.minAmount === "" || amount >= Number(params.minAmount))
      && (params.maxAmount === undefined || params.maxAmount === "" || amount <= Number(params.maxAmount))
      && (!params.categoryId || Number(row.categoryId) === Number(params.categoryId))
      && (!params.incomeType || row.incomeType === params.incomeType)
      && (!search || textFields(row).some(value => String(value || "").toLowerCase().includes(search)));
  });

  const sortBy = String(params.sortBy || dateField).toLowerCase();
  const key = sortBy === "amount" ? "amount" : sortBy === "entrydate" ? "entryDate" : dateField;
  const dir = String(params.sortDir || "desc").toLowerCase() === "asc" ? 1 : -1;
  result.sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * dir);
  return result;
}
function page(rows, params) {
  const pageNumber = Math.max(1, Number(params.page || 1));
  const pageSize = Math.min(1000, Math.max(1, Number(params.pageSize || 20)));
  return { items: rows.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), total: rows.length, page: pageNumber, pageSize };
}
function sum(rows) { return rows.reduce((total, row) => total + Number(row.amount || 0), 0); }
function inRange(row, field, params) {
  const date = dateOnly(row[field]);
  return (!params.from || date >= dateOnly(params.from)) && (!params.to || date <= dateOnly(params.to));
}
function categoryTotals(data, expenses, params) {
  const groups = new Map();
  expenses.filter(e => inRange(e, "paymentDate", params)).forEach(expense => {
    const name = data.categories.find(c => c.id === expense.categoryId)?.name || "Unknown";
    const group = groups.get(name) || { category: name, total: 0, count: 0 };
    group.total += Number(expense.amount); group.count += 1; groups.set(name, group);
  });
  return [...groups.values()].sort((a, b) => b.total - a.total);
}
function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export function exportLocalBackup() {
  return JSON.stringify(readData(), null, 2);
}

export function localRequest(method, url, body, params = {}) {
  const data = readData();
  const path = String(url).split("?")[0].replace(/\/$/, "");
  const parts = path.split("/").filter(Boolean);
  const verb = method.toUpperCase();
  const stamp = new Date().toISOString();
  let result = null;

  if (path === "/api/categories") {
    if (verb === "GET") result = data.categories.filter(c => params.includeInactive === true || String(params.includeInactive) === "true" || c.isActive).sort((a, b) => a.name.localeCompare(b.name));
    else if (verb === "POST") {
      const name = String(body?.name || "").trim();
      if (!name) fail("Name is required.");
      if (data.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) fail("A category with this name already exists.");
      result = { id: nextId(data, "category"), name, isActive: true, isDefault: false, createdAt: stamp };
      data.categories.push(result);
    }
  } else if (parts[1] === "categories" && parts[2]) {
    const id = Number(parts[2]); const index = data.categories.findIndex(c => c.id === id);
    if (index < 0) fail("Category not found.", 404);
    if (verb === "GET") result = data.categories[index];
    else if (verb === "PUT") {
      const name = String(body?.name || "").trim();
      if (data.categories.some(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) fail("A category with this name already exists.");
      result = data.categories[index] = { ...data.categories[index], name, isActive: body.isActive !== false };
    } else if (verb === "DELETE") {
      if (data.categories[index].isDefault) fail("Default categories cannot be deleted.", 409);
      if (data.expenses.some(e => e.categoryId === id)) fail("Category is used by existing transactions.", 409);
      data.categories.splice(index, 1);
    }
  } else if (path === "/api/expenses/total") {
    result = { total: sum(data.expenses.filter(e => inRange(e, "paymentDate", params))) };
  } else if (path === "/api/expenses") {
    if (verb === "GET") result = page(filteredTransactions(data.expenses, params, "paymentDate", e => [e.description, e.notes, e.paymentMethod, decorateExpense(data, e).categoryName]).map(e => decorateExpense(data, e)), params);
    else if (verb === "POST") {
      if (!data.categories.some(c => c.id === Number(body.categoryId) && c.isActive)) fail("Invalid or inactive category.");
      result = decorateExpense(data, { ...body, id: nextId(data, "expense"), categoryId: Number(body.categoryId), amount: Number(body.amount), paymentDate: dateOnly(body.paymentDate), entryDate: dateOnly(body.entryDate) || dateOnly(indiaNow()), createdAt: stamp, updatedAt: stamp });
      data.expenses.push(result);
    }
  } else if (parts[1] === "expenses" && parts[2]) {
    const id = Number(parts[2]); const index = data.expenses.findIndex(e => e.id === id);
    if (parts[2] === "total") fail("Not found.", 404);
    if (index < 0) fail("Expense not found.", 404);
    if (verb === "GET") result = decorateExpense(data, data.expenses[index]);
    else if (verb === "PUT") {
      if (!data.categories.some(c => c.id === Number(body.categoryId) && c.isActive)) fail("Invalid or inactive category.");
      result = decorateExpense(data, data.expenses[index] = { ...data.expenses[index], ...body, categoryId: Number(body.categoryId), amount: Number(body.amount), paymentDate: dateOnly(body.paymentDate), entryDate: dateOnly(body.entryDate) || data.expenses[index].entryDate, updatedAt: stamp });
    } else if (verb === "DELETE") data.expenses.splice(index, 1);
  } else if (path === "/api/incomes/types") {
    result = [...new Set([...DEFAULT_INCOME_TYPES, ...data.incomes.map(i => i.incomeType)])].sort();
  } else if (path === "/api/incomes/total") {
    result = { total: sum(data.incomes.filter(i => inRange(i, "receivedDate", params))) };
  } else if (path === "/api/incomes") {
    if (verb === "GET") result = page(filteredTransactions(data.incomes, params, "receivedDate", i => [i.incomeType, i.description, i.notes]), params);
    else if (verb === "POST") {
      result = { ...body, id: nextId(data, "income"), amount: Number(body.amount), receivedDate: dateOnly(body.receivedDate), entryDate: dateOnly(body.entryDate) || dateOnly(indiaNow()), createdAt: stamp, updatedAt: stamp };
      data.incomes.push(result);
    }
  } else if (parts[1] === "incomes" && parts[2]) {
    const id = Number(parts[2]); const index = data.incomes.findIndex(i => i.id === id);
    if (index < 0) fail("Income not found.", 404);
    if (verb === "GET") result = data.incomes[index];
    else if (verb === "PUT") result = data.incomes[index] = { ...data.incomes[index], ...body, amount: Number(body.amount), receivedDate: dateOnly(body.receivedDate), entryDate: dateOnly(body.entryDate) || data.incomes[index].entryDate, updatedAt: stamp };
    else if (verb === "DELETE") data.incomes.splice(index, 1);
  } else if (path === "/api/reminders/due") {
    result = data.reminders.filter(r => r.isEnabled && r.nextOccurrence !== FINISHED && r.nextOccurrence <= indiaNow());
  } else if (path === "/api/reminders") {
    if (verb === "GET") result = data.reminders.filter(r => params.includeDisabled === true || String(params.includeDisabled) === "true" || r.isEnabled).sort((a, b) => a.nextOccurrence.localeCompare(b.nextOccurrence));
    else if (verb === "POST") {
      const reminder = { ...body, id: nextId(data, "reminder"), isEnabled: body.isEnabled !== false, startDate: dateOnly(body.startDate), reminderTime: body.reminderTime || "09:00:00", createdAt: stamp, updatedAt: stamp };
      reminder.nextOccurrence = reminder.isEnabled ? computeNext(reminder) : FINISHED;
      data.reminders.push(reminder); result = reminder;
    }
  } else if (parts[1] === "reminders" && parts[2]) {
    const id = Number(parts[2]); const index = data.reminders.findIndex(r => r.id === id);
    if (index < 0) fail("Reminder not found.", 404);
    const reminder = data.reminders[index];
    if (parts[3] === "snooze" && verb === "POST") {
      let option = body?.option;
      const now = indiaNow();
      if (body?.minutes != null) option = `minutes:${Number(body.minutes)}`;
      if (option === "2m" || option === "10m" || String(option).startsWith("minutes:")) {
        const minutes = option === "2m" ? 2 : option === "10m" ? 10 : Number(String(option).slice(8));
        if (!Number.isFinite(minutes) || minutes < 1 || minutes > 10080) fail("Snooze must be between 1 minute and 7 days.");
        const instant = new Date(`${now}+05:30`); instant.setMinutes(instant.getMinutes() + minutes);
        reminder.nextOccurrence = formatIndiaTime(instant);
      } else {
        const months = { "1month": 1, "3months": 3, "4months": 4, "1year": 12 };
        const baseDate = now.slice(0, 10);
        const targetDate = option === "tomorrow" ? addDays(baseDate, 1) : months[option] ? addMonths(baseDate, months[option]) : null;
        if (!targetDate) fail("Choose a valid snooze option.");
        reminder.nextOccurrence = `${targetDate}T${String(reminder.reminderTime).slice(0, 8).padEnd(8, "0")}`;
      }
      reminder.isEnabled = true; reminder.updatedAt = stamp; result = reminder;
    } else if (parts[3] === "complete" && verb === "POST") {
      if (Number(reminder.recurrence) === 0) { reminder.isEnabled = false; reminder.nextOccurrence = FINISHED; }
      else {
        const after = new Date(`${indiaNow()}+05:30`);
        after.setSeconds(after.getSeconds() + 1);
        reminder.nextOccurrence = computeNext(reminder, formatIndiaTime(after));
      }
      reminder.updatedAt = stamp; result = reminder;
    } else if (verb === "GET") result = reminder;
    else if (verb === "PUT") {
      const updated = { ...reminder, ...body, startDate: dateOnly(body.startDate), updatedAt: stamp };
      updated.nextOccurrence = updated.isEnabled ? computeNext(updated) : FINISHED;
      data.reminders[index] = updated; result = updated;
    } else if (verb === "DELETE") data.reminders.splice(index, 1);
  } else if (path === "/api/reports/summary") {
    const incomes = data.incomes.filter(i => inRange(i, "receivedDate", params));
    const expenses = data.expenses.filter(e => inRange(e, "paymentDate", params));
    const currentMonth = indiaNow().slice(0, 7);
    const currentIncome = sum(data.incomes.filter(i => dateOnly(i.receivedDate).startsWith(currentMonth)));
    const currentExpenses = sum(data.expenses.filter(e => dateOnly(e.paymentDate).startsWith(currentMonth)));
    const totalIncome = sum(incomes), totalExpenses = sum(expenses);
    result = { totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses, currentMonthIncome: currentIncome, currentMonthExpenses: currentExpenses, currentMonthNet: currentIncome - currentExpenses };
  } else if (path === "/api/reports/categories") {
    result = categoryTotals(data, data.expenses, params);
  } else if (path === "/api/reports/monthly-comparison") {
    const year = Number(params.year || indiaNow().slice(0, 4));
    result = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const income = sum(data.incomes.filter(i => dateOnly(i.receivedDate).startsWith(`${year}-${String(month).padStart(2, "0")}`)));
      const expenses = sum(data.expenses.filter(e => dateOnly(e.paymentDate).startsWith(`${year}-${String(month).padStart(2, "0")}`)));
      return { month, income, expenses, net: income - expenses };
    });
  } else if (path === "/api/reports/income-vs-expense") {
    const income = sum(data.incomes.filter(i => inRange(i, "receivedDate", params)));
    const expenses = sum(data.expenses.filter(e => inRange(e, "paymentDate", params)));
    result = { income, expenses, net: income - expenses };
  } else if (path === "/api/reports/expenses") {
    const rows = data.expenses.filter(e => inRange(e, "paymentDate", params) && (!params.categoryId || e.categoryId === Number(params.categoryId)));
    const granularity = params.granularity || "daily";
    const groups = new Map();
    rows.forEach(e => {
      const date = dateOnly(e.paymentDate); const [year, month, day] = date.split("-").map(Number);
      let label = date;
      if (granularity === "monthly") label = `${year}-${String(month).padStart(2, "0")}`;
      else if (granularity === "yearly") label = String(year);
      else if (granularity === "weekly") { const d = new Date(Date.UTC(year, month - 1, day)); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); label = `${d.getUTCFullYear()}-W${String(Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7)).padStart(2, "0")}`; }
      groups.set(label, (groups.get(label) || 0) + Number(e.amount));
    });
    const trend = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([label, total]) => ({ label, total }));
    result = { trend, byCategory: categoryTotals(data, rows, {}), transactions: page(rows.map(e => decorateExpense(data, e)), { page: 1, pageSize: 1000 }) };
  } else if (path === "/api/reports/income") {
    result = page(filteredTransactions(data.incomes, params, "receivedDate", i => [i.incomeType, i.description, i.notes]), { page: 1, pageSize: 1000 });
  } else if (path === "/api/reports/export") {
    const type = params.type || "expenses";
    if (type === "income") {
      const rows = data.incomes.filter(i => inRange(i, "receivedDate", params));
      result = ["Id,IncomeType,Description,Amount,ReceivedDate,EntryDate,Notes", ...rows.map(i => [i.id, i.incomeType, i.description, i.amount, dateOnly(i.receivedDate), dateOnly(i.entryDate), i.notes].map(csvCell).join(","))].join("\r\n");
    } else {
      const rows = data.expenses.filter(e => inRange(e, "paymentDate", params));
      result = ["Id,Category,Description,Amount,PaymentDate,EntryDate,PaymentMethod,Notes", ...rows.map(e => [e.id, decorateExpense(data, e).categoryName, e.description, e.amount, dateOnly(e.paymentDate), dateOnly(e.entryDate), e.paymentMethod, e.notes].map(csvCell).join(","))].join("\r\n");
    }
  } else {
    fail(`Unsupported local data request: ${verb} ${path}`, 404);
  }

  if (verb !== "GET") saveData(data);
  return result;
}
