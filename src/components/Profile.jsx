import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const normalizeRole = (role) =>
  role ? String(role).toUpperCase() : null;

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
  currentUser?.fullName
  // For ADMIN and higher roles, expect aggregated usersDatabase on currentUser
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
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Profile
          </h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Profile Header */}
          <div className="flex items-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {displayName?.charAt(0)}
            </div>
            <div className="ml-6">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                {displayName}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {currentRole || 'USER'}
              </p>
            </div>
          </div>

          {/* Personal Information (common) */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Full Name
                </p>
                <p className="text-lg font-medium text-gray-800 dark:text-white">
                  {displayName?.name}
                </p>
              </div>
              {currentUser?.age && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Age
                  </p>
                  <p className="text-lg font-medium text-gray-800 dark:text-white">
                    {currentUser?.age} years
                  </p>
                </div>
              )}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Email
                </p>
                <p className="text-lg font-medium text-gray-800 dark:text-white">
                  {currentUser?.email}
                </p>
              </div>
              {currentUser?.phone && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Phone
                  </p>
                  <p className="text-lg font-medium text-gray-800 dark:text-white">
                    {currentUser?.phone}
                  </p>
                </div>
              )}
              {currentUser?.address && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg md:col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Address
                  </p>
                  <p className="text-lg font-medium text-gray-800 dark:text-white">
                    {currentUser?.address}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ADMIN / LM_OFFICER / DISTRICT_SUPER_ADMIN / MANUFACTURER */}
          {(isAdmin || isLmOfficer || isDistrictSuperAdmin || isManufacturer) && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Role Overview
              </h3>

              {/* Summary chips differ slightly by role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Linked Users / Devices
                  </p>
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {totalUsers}
                  </p>
                </div>

                {isAdmin && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Admin Role
                    </p>
                    <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                      LM Officer – manages consumer devices
                    </p>
                  </div>
                )}

                {isDistrictSuperAdmin && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      District
                    </p>
                    <p className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                      {currentUser?.district || 'N/A'}
                    </p>
                  </div>
                )}

                {isLmOfficer && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Designation
                    </p>
                    <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                      {currentUser?.designation || 'LM Officer'}
                    </p>
                  </div>
                )}

                {isManufacturer && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Manufacturer
                    </p>
                    <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                      {currentUser?.companyName || 'Device Manufacturer'}
                    </p>
                  </div>
                )}
              </div>

              {/* Device / user counts by type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                  <div className="text-2xl mb-2">⚖️</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Weighing Machines
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {weighingMachineUsers.length}
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                  <div className="text-2xl mb-2">⛽</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Fuel Dispensers
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {fuelDispenserUsers.length}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
                  <div className="text-2xl mb-2">⚡</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Energy Meters
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {energyMeterUsers.length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* USER – consumer devices view */}
          {isUser && (
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                My Devices
              </h3>

              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Devices
                </p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {currentUser?.totalDevices || currentUser?.devices?.length || 0}
                </p>
              </div>

              <div className="space-y-4">
                {currentUser?.devices?.map((device, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-green-500"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-white">
                          {device.type}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Device ID: {device.deviceId}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Location: {device.location} | Installed:{' '}
                          {device.installDate}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
