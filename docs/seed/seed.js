/*
 * seed.js
 * Populates a SolarGridX database with the data needed to develop and demo
 * the full journey: users in every state, two microgrid nodes, and a week of
 * booking slots.
 *
 * Run with mongosh against YOUR OWN database (see README.md in this folder):
 *   mongosh "<connection-string>/<yourDatabase>" docs/seed/seed.js
 *
 * Safe to re-run: it clears the four domain collections first. It never
 * touches RevokedTokens.
 */

// ---------------------------------------------------------------- helpers

const now = new Date();

// Dates are stored as UTC midnight, matching the API.
function utcMidnight(daysFromToday) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d;
}

function hhmm(hour) {
  return String(hour).padStart(2, '0') + ':00';
}

// ---------------------------------------------------------------- passwords
//
// BCrypt hashes, pre-computed because mongosh cannot hash.
// Every seeded account below uses one of these three passwords.

const PW = {
  admin: '$2a$11$v6D2D4dsXFMNSFA5OwVv6OQ3uYAuXG7FfP5myMj9O5Y/utYvXGE2S', // Admin@12345
  operator: '$2a$11$hnwUS8ZfYTYgz0jMSkob8.AhDQRnUJxHtMd36/DjM7DD3Cuotc30i', // Oper@12345
  prosumer: '$2a$11$jfWy5kIMjoF5iaE4PP3GZ.Qnzx4yYYRRSTixDMkTrb4Z2tsNAGqHa', // Pros@12345
};

// ---------------------------------------------------------------- reset

print('Clearing existing data...');
db.EnergyReservation.deleteMany({});
db.EnergyBookingSlots.deleteMany({});
db.SolarStationInfo.deleteMany({});
db.Users.deleteMany({});

// ---------------------------------------------------------------- users

print('Creating users...');

const users = [
  {
    Nic: null,
    Username: null,
    PasswordHash: PW.admin,
    MustChangePassword: false,
    FullName: 'System Administrator',
    Email: 'admin@solargridx.com',
    Phone: null,
    Address: null,
    Role: 'Backoffice',
    Status: 'Active',
    CreatedAt: now,
    UpdatedAt: now,
  },
  {
    Nic: null,
    Username: null,
    PasswordHash: PW.operator,
    MustChangePassword: false,
    FullName: 'Kamal Gunaratne',
    Email: 'operator@solargridx.com',
    Phone: '0771234567',
    Address: 'Malabe',
    Role: 'GridOperator',
    Status: 'Active',
    CreatedAt: now,
    UpdatedAt: now,
  },
  {
    Nic: '199812345678',
    Username: null,
    PasswordHash: PW.prosumer,
    MustChangePassword: false,
    FullName: 'Amal Perera',
    Email: 'amal@example.com',
    Phone: '0772223333',
    Address: 'Negombo',
    Role: 'Prosumer',
    Status: 'Active', // can book straight away
    CreatedAt: now,
    UpdatedAt: now,
  },
  {
    Nic: '200012345678',
    Username: null,
    PasswordHash: PW.prosumer,
    MustChangePassword: false,
    FullName: 'Nimali Silva',
    Email: 'nimali@example.com',
    Phone: '0774445555',
    Address: 'Matara',
    Role: 'Prosumer',
    Status: 'Pending', // shows in the pending activation queue
    CreatedAt: now,
    UpdatedAt: now,
  },
  {
    Nic: '199756789012',
    Username: null,
    PasswordHash: PW.prosumer,
    MustChangePassword: false,
    FullName: 'Sunil Fernando',
    Email: 'sunil@example.com',
    Phone: '0776667777',
    Address: 'Kandy',
    Role: 'Prosumer',
    Status: 'Deactivated', // login is refused for this one
    CreatedAt: now,
    UpdatedAt: now,
  },
];

db.Users.insertMany(users);

// ---------------------------------------------------------------- stations

print('Creating microgrid nodes...');

const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const stations = [
  {
    StationName: 'Negombo Solar Hub 01',
    Location: 'Negombo',
    Latitude: 7.2083,
    Longitude: 79.8358,
    CapacityKwh: 120,
    BatterySlotCount: 4,
    Type: 'AC',
    OperationalSchedule: { OpenTime: '08:00', CloseTime: '18:00', ActiveDays: allDays },
    Status: 'Active',
    CreatedAt: now,
    UpdatedAt: now,
  },
  {
    StationName: 'Matara Central Node',
    Location: 'Matara',
    Latitude: 5.9549,
    Longitude: 80.555,
    CapacityKwh: 90,
    BatterySlotCount: 3,
    Type: 'DC',
    OperationalSchedule: { OpenTime: '09:00', CloseTime: '17:00', ActiveDays: allDays },
    Status: 'Active',
    CreatedAt: now,
    UpdatedAt: now,
  },
];

const stationResult = db.SolarStationInfo.insertMany(stations);
const stationIds = Object.values(stationResult.insertedIds);

// ---------------------------------------------------------------- slots

print('Generating booking slots...');

const slots = [];

stationIds.forEach((stationId, index) => {
  const station = stations[index];
  const openHour = parseInt(station.OperationalSchedule.OpenTime.split(':')[0], 10);
  const closeHour = parseInt(station.OperationalSchedule.CloseTime.split(':')[0], 10);

  // capacityKwh is the maximum energy ONE booking may take, so the station's
  // throughput is divided across its battery bays. Matches SlotService.
  const perSlotCapacity = station.CapacityKwh / station.BatterySlotCount;

  // Today plus the next 6 days keeps every slot inside the 7-day window (BR-01).
  for (let day = 0; day <= 6; day++) {
    const slotDate = utcMidnight(day);

    for (let hour = openHour; hour < closeHour; hour++) {
      slots.push({
        StationId: stationId,
        SlotDate: slotDate,
        StartTime: hhmm(hour),
        EndTime: hhmm(hour + 1),
        CapacityKwh: perSlotCapacity,
        IsAvailable: true,
        ReservedCount: 0,
        CreatedAt: now,
        UpdatedAt: now,
      });
    }
  }
});

db.EnergyBookingSlots.insertMany(slots);

// ---------------------------------------------------------------- indexes

print('Ensuring indexes...');

db.Users.createIndex({ Email: 1 }, { unique: true, partialFilterExpression: { Email: { $type: 'string' } } });
db.Users.createIndex({ Nic: 1 }, { unique: true, partialFilterExpression: { Nic: { $type: 'string' } } });

// ---------------------------------------------------------------- summary

print('');
print('=========================================================');
print('  Seed complete: ' + db.getName());
print('=========================================================');
print('  Users     : ' + db.Users.countDocuments());
print('  Stations  : ' + db.SolarStationInfo.countDocuments());
print('  Slots     : ' + db.EnergyBookingSlots.countDocuments());
print('  Bookings  : ' + db.EnergyReservation.countDocuments() + ' (create these through the API)');
print('');
print('  Sign in with:');
print('    admin@solargridx.com     / Admin@12345   Backoffice');
print('    operator@solargridx.com  / Oper@12345    Grid Operator');
print('    amal@example.com         / Pros@12345    Prosumer  (Active)');
print('    nimali@example.com       / Pros@12345    Prosumer  (Pending)');
print('    sunil@example.com        / Pros@12345    Prosumer  (Deactivated)');
print('=========================================================');
