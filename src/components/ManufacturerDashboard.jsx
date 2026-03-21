// components/ManufacturerDashboard.jsx
import { useState, useEffect, useMemo } from 'react';
import { FaIndustry, FaTruck, FaShieldAlt, FaMapMarkerAlt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function ManufacturerDashboard({ currentUser, mqttDevices, mqttConnected, stats }) {
  // Mock manufacturer devices (replace with your API later)
  const [manufacturerDevices, setManufacturerDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simulate manufacturer-specific devices
  useEffect(() => {
    const mockManufacturerDevices = Array.from({ length: 12 }, (_, i) => ({
      id: `MFG-${String(i + 1).padStart(3, '0')}`,
      deviceId: `ESP32-MFG-${String(i + 1).padStart(3, '0')}`,
      serialNumber: `SN${Date.now()}${String(i + 1).padStart(3, '0')}`,
      model: i % 3 === 0 ? 'WT-5000' : i % 3 === 1 ? 'WT-7500' : 'WT-10000',
      batchId: `BATCH-${2025}${String(Math.floor(i / 3) + 1).padStart(2, '0')}`,
      status: ['active', 'active', 'maintenance', 'active', 'inactive', 'active', 'active', 'active', 'active', 'testing', 'active', 'active'][i],
      deploymentStatus: ['deployed', 'warehouse', 'field', 'deployed', 'service', 'deployed', 'deployed', 'warehouse', 'field', 'testing', 'deployed', 'maintenance'][i],
      location: ['Mumbai Factory', 'Delhi Warehouse', 'Field - Site A', 'Pune Depot', 'Service Center', 'Field - Site B', 'Ahmedabad', 'Chennai Factory', 'Field - Site C', 'Testing Lab', 'Field - Site D', 'Maintenance'][i],
      lastPing: Date.now() - Math.random() * 86400000 * 3, // 3 days ago max
      tamperCount: Math.floor(Math.random() * 5),
      productionDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
      assignedTo: ['LM Officer Delhi', 'District Admin Pune', 'User Mumbai', 'LM Officer Chennai', null, 'District Admin Ahmedabad', 'User Bangalore', null, 'LM Officer Kolkata', 'Testing', 'User Hyderabad', 'Maintenance'][i]
    }));

    setManufacturerDevices(mockManufacturerDevices);
    setLoading(false);
  }, []);

  const activeDevices = useMemo(() => manufacturerDevices.filter(d => d.status === 'active'), [manufacturerDevices]);
  const deployedDevices = useMemo(() => manufacturerDevices.filter(d => d.deploymentStatus === 'deployed'), [manufacturerDevices]);
  const tamperedDevices = useMemo(() => manufacturerDevices.filter(d => d.tamperCount > 0), [manufacturerDevices]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-orange-50/90 to-amber-50/90 dark:from-orange-900/40 dark:to-amber-900/40 rounded-3xl p-12 border-4 border-orange-200/60 shadow-2xl text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Loading Manufacturing Dashboard...</h3>
        <p className="text-gray-600 dark:text-gray-400">Fetching your manufactured devices</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-5 h-5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full animate-ping shadow-lg" />
          <div>
            <h3 className="text-3xl font-black bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 bg-clip-text text-transparent">
              🏭 Manufacturer Dashboard
            </h3>
            <p className="text-lg text-gray-700 dark:text-gray-300 font-semibold">
              {manufacturerDevices.length} devices manufactured • {currentUser?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-mono px-4 py-2 bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl">
            Batch 2025-01
          </span>
          <span className={`px-4 py-2 rounded-xl font-bold ${
            mqttConnected 
              ? 'bg-emerald-500 text-white' 
              : 'bg-orange-500 text-white'
          }`}>
            MQTT {mqttConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl p-8 border border-orange-200/50 dark:border-orange-700/50 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-2xl opacity-0 group-hover:opacity-100" />
          <FaIndustry className="w-14 h-14 text-orange-500 mx-auto mb-4 opacity-80 group-hover:opacity-100 transition-all" />
          <div className="text-center relative z-10">
            <div className="text-4xl font-black text-gray-900 dark:text-white mb-2">
              {manufacturerDevices.length}
            </div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Total Devices
            </div>
          </div>
        </div>

        <div className="group relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl p-8 border border-emerald-200/50 dark:border-emerald-700/50 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl opacity-0 group-hover:opacity-100" />
          <FaCheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4 opacity-80 group-hover:opacity-100" />
          <div className="text-center relative z-10">
            <div className="text-4xl font-black text-gray-900 dark:text-white mb-2">
              {activeDevices.length}
            </div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Active Devices
            </div>
          </div>
        </div>

        <div className="group relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl p-8 border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl opacity-0 group-hover:opacity-100" />
          <FaTruck className="w-14 h-14 text-blue-500 mx-auto mb-4 opacity-80 group-hover:opacity-100" />
          <div className="text-center relative z-10">
            <div className="text-4xl font-black text-gray-900 dark:text-white mb-2">
              {deployedDevices.length}
            </div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Deployed
            </div>
          </div>
        </div>

        <div className="group relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl p-8 border border-red-200/50 dark:border-red-700/50 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-rose-500/10 rounded-2xl opacity-0 group-hover:opacity-100" />
          <FaExclamationTriangle className="w-14 h-14 text-red-500 mx-auto mb-4 opacity-80 group-hover:opacity-100" />
          <div className="text-center relative z-10">
            <div className="text-4xl font-black text-gray-900 dark:text-white mb-2">
              {tamperedDevices.length}
            </div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Tamper Events
            </div>
          </div>
        </div>
      </div>

      {/* Devices Grid */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 border border-gray-200/50 dark:border-slate-700/50 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h4 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <FaIndustry className="text-orange-500" />
            Manufactured Devices
          </h4>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono bg-orange-100/80 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-xl">
              Filter: All Batches
            </span>
            <button className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105">
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Device ID</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Model</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Batch</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Status</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Location</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Tamper Count</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Assigned To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {manufacturerDevices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-4 px-6 font-mono font-semibold text-gray-900 dark:text-white">
                    {device.deviceId}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      device.model === 'WT-5000' ? 'bg-blue-100 text-blue-800' :
                      device.model === 'WT-7500' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {device.model}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono text-sm text-gray-700 dark:text-gray-300">
                    {device.batchId}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      device.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                      device.status === 'maintenance' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {device.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <FaMapMarkerAlt className="text-gray-400 text-sm" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {device.location}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      device.tamperCount > 2 ? 'bg-red-100 text-red-800' :
                      device.tamperCount > 0 ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {device.tamperCount}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm">
                    <span className="text-gray-900 dark:text-white font-medium">
                      {device.assignedTo || 'Unassigned'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Network Status */}
      <div className="p-8 bg-gradient-to-r from-emerald-50/90 to-green-50/90 dark:from-emerald-900/40 dark:to-green-900/40 rounded-3xl border-2 border-emerald-200/60 shadow-2xl">
        <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
              <FaShieldAlt className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h5 className="text-2xl font-black text-gray-900 dark:text-white">Manufacturing Network Secure</h5>
              <p className="text-gray-700 dark:text-gray-300 mt-2">
                {activeDevices.length} of {manufacturerDevices.length} devices online. All manufacturing data synchronized.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm font-mono">
            <span>Factory ID: MFG-TRUSTSCALE-001</span>
            <span className="px-4 py-2 bg-white/60 dark:bg-slate-800/60 rounded-xl font-bold">
              99.8% Uptime
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
