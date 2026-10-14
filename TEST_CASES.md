# Sample Test Cases

1. Add expense amount 100, restart app, verify it remains.
2. Create custom category "TestCat", restart, verify exists and no duplicate case-insensitive.
3. Edit expense amount and delete with confirmation.
4. Add income 5000, verify dashboard total and net balance (income - expenses).
5. Filter expenses by category and date range; totals update.
6. Monthly and yearly report totals match filtered DB data.
7. Export expenses CSV and verify columns/totals.
8. Create daily/monthly/yearly/custom-interval reminders and check next occurrence including month-end/leap year.
9. Trigger reminder notification and verify no duplicate for same scheduled time.
10. Close browser while backend runs, verify OS toast for due reminder.
11. Upgrade schema (restart) preserves existing data.