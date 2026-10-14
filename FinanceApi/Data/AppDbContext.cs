using FinanceApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FinanceApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<ExpenseCategory> ExpenseCategories => Set<ExpenseCategory>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Income> Incomes => Set<Income>();
    public DbSet<Reminder> Reminders => Set<Reminder>();
    public DbSet<ReminderNotification> ReminderNotifications => Set<ReminderNotification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ExpenseCategory>(e =>
        {
            e.Property(x => x.Name).IsRequired().HasMaxLength(100);
            e.HasIndex(x => x.Name).IsUnique();
        });

        modelBuilder.Entity<Expense>(e =>
        {
            e.Property(x => x.Amount).HasColumnType("decimal(18,2)");
            e.HasOne(x => x.Category).WithMany(c => c.Expenses).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.PaymentDate);
            e.HasIndex(x => x.CategoryId);
        });

        modelBuilder.Entity<Income>(e =>
        {
            e.Property(x => x.Amount).HasColumnType("decimal(18,2)");
            e.HasIndex(x => x.ReceivedDate);
        });

        modelBuilder.Entity<Reminder>(e =>
        {
            e.Property(x => x.Name).IsRequired().HasMaxLength(200);
            e.HasIndex(x => x.NextOccurrence);
            e.HasIndex(x => x.IsEnabled);
        });

        modelBuilder.Entity<ReminderNotification>(e =>
        {
            e.HasOne(x => x.Reminder).WithMany(r => r.Notifications).HasForeignKey(x => x.ReminderId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.ReminderId, x.ScheduledAt }).IsUnique();
        });
    }
}

public static class DbInitializer
{
    public static void Seed(AppDbContext db)
    {
        if (!db.ExpenseCategories.Any())
        {
            var defaults = new[] { "Food", "Recharge", "Petrol", "Traveling", "Other" };
            foreach (var d in defaults)
            {
                db.ExpenseCategories.Add(new ExpenseCategory { Name = d, IsDefault = true, IsActive = true });
            }
            db.SaveChanges();
        }
    }
}