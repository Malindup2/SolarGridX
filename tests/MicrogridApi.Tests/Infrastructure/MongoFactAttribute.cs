using Xunit;

namespace MicrogridApi.Tests.Infrastructure;

// Integration tests need a real MongoDB. They run when MICROGRID_TEST_MONGO holds a
// connection string and are reported as skipped (not failed) when it does not.
public sealed class MongoFactAttribute : FactAttribute
{
    public const string EnvironmentVariable = "MICROGRID_TEST_MONGO";

    public MongoFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(EnvironmentVariable)))
        {
            Skip = $"Set {EnvironmentVariable} to a MongoDB connection string to run API integration tests.";
        }
    }
}
