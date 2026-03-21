import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const normalizeRole = (role) => (role ? String(role).toUpperCase() : null);

export default function Profile() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const currentRole = normalizeRole(currentUser?.role);

  const isAdmin = currentRole === 'ADMIN';
  const isUser = currentRole === 'USER';
  const isDistrictSuperAdmin = currentRole === 'DISTRICT_SUPER_ADMIN';
  const isLmOfficer = currentRole === 'LM_OFFICER';
  const isManufacturer = currentRole === 'MANUFACTURER';

  const displayName =
    currentUser?.name ||
    currentUser?.full_name ||
    currentUser?.fullName ||
    currentUser?.email ||
    'User';

  const weighingMachineUsers =
    currentUser?.usersDatabase?.weighingMachine || [];
  const fuelDispenserUsers =
    currentUser?.usersDatabase?.fuelDispenser || [];
  const energyMeterUsers =
    currentUser?.usersDatabase?.energyMeter || [];
  const totalUsers =
    weighingMachineUsers.length +
    fuelDispenserUsers.length +
    energyMeterUsers.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
            Profile
          </h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl px-4 sm:px-6 md:px-8 py-6 sm:py-8">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center sm:justify-start mb-6 sm:mb-8 gap-4 sm:gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold flex-shrink-0">
              {displayName?.charAt(0)?.toUpperCase()}
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white break-words">
                {displayName}
              </h2>
              <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {currentRole || 'USER'}
              </p>
            </div>
          </div>

          {/* Personal Information */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Full Name
                </p>
                <p className="text-base sm:text-lg font-medium text-gray-800 dark:text-white break-words">
                  {displayName}
                </p>
              </div>

              {currentUser?.age && (
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Age
                  </p>
                  <p className="text-base sm:text-lg font-medium text-gray-800 dark:text-white">
                    {currentUser.age} years
                  </p>
                </div>
              )}

              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Email
                </p>
                <p className="text-base sm:text-lg font-medium text-gray-800 dark:text-white break-words">
                  {currentUser?.email}
                </p>
              </div>

              {currentUser?.phone && (
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Phone
                  </p>
                  <p className="text-base sm:text-lg font-medium text-gray-800 dark:text-white break-words">
                    {currentUser.phone}
                  </p>
                </div>
              )}

              {currentUser?.address && (
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg md:col-span-2">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Address
                  </p>
                  <p className="text-base sm:text-lg font-medium text-gray-800 dark:text-white break-words">
                    {currentUser.address}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Role Overview for admin-like roles */}
          {(isAdmin ||
            isLmOfficer ||
            isDistrictSuperAdmin ||
            isManufacturer) && (
            <div className="mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">
                Role Overview
              </h3>

              {/* Summary chips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div className="p-3 sm:p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Total Linked Users / Devices
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {totalUsers}
                  </p>
                </div>

                {isAdmin && (
                  <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      Admin Role
                    </p>
                    <p className="text-sm sm:text-lg font-semibold text-green-700 dark:text-green-400">
                      LM Officer – manages consumer devices
                    </p>
                  </div>
                )}

                {isDistrictSuperAdmin && (
                  <div className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      District
                    </p>
                    <p className="text-sm sm:text-lg font-semibold text-purple-700 dark:text-purple-400 break-words">
                      {currentUser?.district || 'N/A'}
                    </p>
                  </div>
                )}

                {isLmOfficer && (
                  <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      Designation
                    </p>
                    <p className="text-sm sm:text-lg font-semibold text-blue-700 dark:text-blue-400 break-words">
                      {currentUser?.designation || 'LM Officer'}
                    </p>
                  </div>
                )}

                {isManufacturer && (
                  <div className="p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      Manufacturer
                    </p>
                    <p className="text-sm sm:text-lg font-semibold text-amber-700 dark:text-amber-400 break-words">
                      {currentUser?.companyName || 'Device Manufacturer'}
                    </p>
                  </div>
                )}
              </div>

              {/* Device / user counts by type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                  <div className="text-xl sm:text-2xl mb-1 sm:mb-2">⚖️</div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Weighing Machines
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {weighingMachineUsers.length}
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                  <div className="text-xl sm:text-2xl mb-1 sm:mb-2">⛽</div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Fuel Dispensers
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                    {fuelDispenserUsers.length}
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
                  <div className="text-xl sm:text-2xl mb-1 sm:mb-2">⚡</div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Energy Meters
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {energyMeterUsers.length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* USER – consumer devices view */}
          {isUser && (
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">
                My Devices
              </h3>

              <div className="p-3 sm:p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg mb-4">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Total Devices
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {currentUser?.totalDevices ||
                    currentUser?.devices?.length ||
                    0}
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {currentUser?.devices?.map((device, index) => (
                  <div
                    key={index}
                    className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-green-500"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-800 dark:text-white text-sm sm:text-base break-words">
                          {device.type}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-all">
                          Device ID: {device.deviceId}
                        </p>
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-500 mt-1 break-words">
                          Location: {device.location} | Installed:{' '}
                          {device.installDate}
                        </p>
                      </div>
                      <span
                        className={`self-start sm:self-center px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold ${
                          device.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {device.status}
                      </span>
                    </div>
                  </div>
                ))}
                {!currentUser?.devices?.length && (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    No devices linked yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
