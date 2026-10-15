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
    public DbSet<PushDevice> PushDevices => Set<PushDevice>();
    public DbSet<PushReminder> PushReminders => Set<PushReminder>();

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

        modelBuilder.Entity<PushDevice>(e =>
        {
            e.HasKey(x => x.DeviceId);
            e.Property(x => x.DeviceId).HasMaxLength(64);
            e.Property(x => x.Endpoint).IsRequired().HasMaxLength(2048);
            e.Property(x => x.P256dh).IsRequired().HasMaxLength(256);
            e.Property(x => x.Auth).IsRequired().HasMaxLength(256);
        });

        modelBuilder.Entity<PushReminder>(e =>
        {
            e.HasKey(x => new { x.DeviceId, x.LocalReminderId });
            e.Property(x => x.Name).IsRequired().HasMaxLength(200);
            e.HasOne(x => x.Device).WithMany(d => d.Reminders).HasForeignKey(x => x.DeviceId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.IsEnabled, x.NextOccurrence });
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
