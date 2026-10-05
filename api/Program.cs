using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using FluentValidation;
using MicrogridApi.Common;
using MicrogridApi.Configuration;
using MicrogridApi.Middleware;
using MicrogridApi.Models;
using MicrogridApi.Repositories;
using MicrogridApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MongoDB.Bson;
using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.Development.json", optional: true, reloadOnChange: true);
builder.Configuration.AddEnvironmentVariables();

builder.Services.AddRouting(options => options.LowercaseUrls = true);

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var details = context.ModelState
                .Where(kvp => kvp.Value?.Errors.Count > 0)
                .SelectMany(kvp => kvp.Value!.Errors.Select(e => $"{kvp.Key}: {e.ErrorMessage}"))
                .ToArray();

            var response = new ErrorResponse("VALIDATION_FAILED", "One or more validation errors occurred.", details);
            return new BadRequestObjectResult(response);
        };
    });

builder.Services.Configure<MongoDbSettings>(builder.Configuration.GetSection("MongoDbSettings"));
builder.Services.AddSingleton<MongoDbContext>();

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<RevokedTokenRepository>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<ProsumerService>();

builder.Services.AddScoped<StationRepository>();
builder.Services.AddScoped<StationService>();

builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<EmailService>();

builder.Services.Configure<SeedAdminSettings>(builder.Configuration.GetSection("SeedAdmin"));
builder.Services.AddScoped<AdminSeeder>();

// --- Member 4: Slots and QR issuance registrations ---
builder.Services.Configure<QrSettings>(builder.Configuration.GetSection("QrSettings"));
builder.Services.AddScoped<SlotRepository>();
builder.Services.AddScoped<StationRepository>();
builder.Services.AddScoped<ReservationRepository>();
builder.Services.AddScoped<SlotService>();
builder.Services.AddScoped<QrIssueService>();
builder.Services.AddScoped<QrVerificationService>();
// --- End Member 4 registrations ---

builder.Services.AddScoped<ReservationService>();
builder.Services.AddScoped<DashboardService>();

// Audit trail, notifications, password recovery, profile, search and exports
builder.Services.AddHttpContextAccessor();
builder.Services.Configure<WebSettings>(builder.Configuration.GetSection("Web"));
builder.Services.AddScoped<ActivityRepository>();
builder.Services.AddScoped<ActivityService>();
builder.Services.AddScoped<ActivityQueryService>();
builder.Services.AddScoped<PasswordRecoveryService>();
builder.Services.AddSingleton<PasswordRecoveryQueue>();
builder.Services.AddHostedService<PasswordRecoveryWorker>();
builder.Services.AddScoped<ProfileService>();
builder.Services.AddScoped<ReservationViewService>();
builder.Services.AddScoped<SearchService>();
builder.Services.AddScoped<ExportService>();

// Sign-in and password endpoints: a fixed window per client IP (RateLimiting:AuthPermitLimit, default 10/min).
var authPermitLimit = builder.Configuration.GetValue("RateLimiting:AuthPermitLimit", RateLimitPolicies.AuthPermitLimit);
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy(RateLimitPolicies.Auth, context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = authPermitLimit,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(RateLimitPolicies.TooManyAttempts, JsonDefaults.CamelCase, cancellationToken);
    };
});

builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddHealthChecks().AddCheck<MongoHealthCheck>("mongodb");

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Smart Solar Microgrid API", Version = "v1" });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter a valid JWT token."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var jwtSecret = jwtSettings["Secret"] ?? throw new InvalidOperationException("JwtSettings:Secret is not configured.");

if (string.IsNullOrWhiteSpace(builder.Configuration["QrSettings:HmacSecret"]))
{
    throw new InvalidOperationException("QrSettings:HmacSecret is not configured. QR tokens cannot be signed.");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ClockSkew = TimeSpan.Zero,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };

    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var tokenId = context.Principal?.FindFirstValue(JwtRegisteredClaimNames.Jti);
            var revokedTokens = context.HttpContext.RequestServices.GetRequiredService<RevokedTokenRepository>();

            if (string.IsNullOrEmpty(tokenId) || await revokedTokens.IsRevokedAsync(tokenId))
            {
                context.Fail("The token has no identifier or has been revoked.");
                return;
            }

            // Tokens outlive account changes, so the account is re-checked on every request with the same rules as login.
            var userId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? context.Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub);
            var user = ObjectId.TryParse(userId, out _)
                ? await context.HttpContext.RequestServices.GetRequiredService<UserRepository>().FindByIdAsync(userId!)
                : null;

            if (user is null
                || user.Status == UserStatus.Deactivated
                || (user.Role != Role.Prosumer && user.Status != UserStatus.Active)
                || user.Role.ToString() != context.Principal?.FindFirstValue(ClaimTypes.Role))
            {
                context.Fail("The account no longer exists, is not active, or its role has changed.");
                return;
            }

            // A password change or reset raises SecurityVersion; tokens issued before it stop working.
            var tokenVersion = context.Principal?.FindFirstValue(JwtTokenService.SecurityVersionClaim) ?? "0";
            if (tokenVersion != user.SecurityVersion.ToString(System.Globalization.CultureInfo.InvariantCulture))
            {
                context.Fail("The session ended because the password was changed.");
            }
        },
        OnChallenge = async context =>
        {
            context.HandleResponse();
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            var response = new ErrorResponse("UNAUTHORIZED", "Missing or invalid token.", null);
            await context.Response.WriteAsJsonAsync(response, JsonDefaults.CamelCase);
        },
        OnForbidden = async context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            var response = new ErrorResponse("FORBIDDEN", "You do not have permission to perform this action.", null);
            await context.Response.WriteAsJsonAsync(response, JsonDefaults.CamelCase);
        }
    };
});

builder.Services.AddAuthorization();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultCorsPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .WithExposedHeaders(CorrelationIdMiddleware.HeaderName, "Content-Disposition");
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var mongoContext = scope.ServiceProvider.GetRequiredService<MongoDbContext>();
    var users = mongoContext.GetCollection<User>("Users");

    CreateIndexModel<User> UniqueStringIndex(string field) => new(
        Builders<User>.IndexKeys.Ascending(field),
        new CreateIndexOptions<User>
        {
            Unique = true,
            PartialFilterExpression = Builders<User>.Filter.Type(field, BsonType.String)
        });

    try
    {
        var existing = await (await users.Indexes.ListAsync()).ToListAsync();
        foreach (var name in new[] { "Nic_1", "Username_1" })
        {
            var index = existing.FirstOrDefault(i => i["name"].AsString == name);
            if (index is not null && !index.Contains("partialFilterExpression"))
            {
                await users.Indexes.DropOneAsync(name);
            }
        }

        await users.Indexes.CreateManyAsync(new[]
        {
            UniqueStringIndex("Nic"),
            UniqueStringIndex("Username"),
            UniqueStringIndex("Email"),
            UniqueStringIndex("PasswordResetTokenHash")
        });
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Could not create the Users indexes; uniqueness is not enforced by the database until this succeeds.");
    }

    try
    {
        await scope.ServiceProvider.GetRequiredService<RevokedTokenRepository>().EnsureIndexAsync();
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Could not create the RevokedTokens expiry index; revoked tokens will not be cleaned up automatically.");
    }

    try
    {
        await scope.ServiceProvider.GetRequiredService<ActivityRepository>().EnsureIndexesAsync();
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Could not create the AuditLog / Notifications indexes.");
    }

    try
    {
        await scope.ServiceProvider.GetRequiredService<AdminSeeder>().SeedAsync();
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Could not create the default administrator.");
    }
}

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseExceptionHandler();

app.UseSwagger();
app.UseSwaggerUI();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("DefaultCorsPolicy");
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

// Makes the entry point visible to the integration test project (tests/MicrogridApi.Tests).
public partial class Program { }
