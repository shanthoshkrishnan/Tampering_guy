export default function SensorCard({ sensor, detailed = false }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'alert': return 'bg-red-100 border-red-300';
      case 'warning': return 'bg-yellow-100 border-yellow-300';
      default: return 'bg-green-100 border-green-300';
    }
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${getStatusColor(sensor.status)}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{sensor.icon}</span>
        <span className={`text-xs px-2 py-1 rounded ${
          sensor.status === 'alert' ? 'bg-red-200' : 
          sensor.status === 'warning' ? 'bg-yellow-200' : 'bg-green-200'
        }`}>
          {sensor.status}
        </span>
      </div>
      <h3 className="font-semibold text-gray-800 text-sm mb-2">{sensor.name}</h3>
      
      {sensor.value !== undefined && (
        <p className="text-2xl font-bold text-gray-900">
          {typeof sensor.value === 'number' ? sensor.value.toFixed(2) : sensor.value} 
          <span className="text-sm text-gray-600 ml-1">{sensor.unit}</span>
        </p>
      )}

      {detailed && sensor.acceleration && (
        <div className="mt-2 text-xs text-gray-700">
          <p>Accel: X:{sensor.acceleration.x.toFixed(2)} Y:{sensor.acceleration.y.toFixed(2)} Z:{sensor.acceleration.z.toFixed(2)}</p>
          <p>Gyro: X:{sensor.gyroscope.x.toFixed(1)} Y:{sensor.gyroscope.y.toFixed(1)} Z:{sensor.gyroscope.z.toFixed(1)}</p>
        </div>
      )}

      {detailed && sensor.channels && (
        <div className="mt-2 text-xs text-gray-700">
          {sensor.channels.map((ch, idx) => (
            <span key={idx} className="mr-2">CH{idx}: {ch.toFixed(2)}V</span>
          ))}
        </div>
      )}

      {sensor.signal && (
        <p className="text-sm text-gray-700 mt-1">Signal: {sensor.signal}/31</p>
      )}

      {sensor.satellites && (
        <p className="text-sm text-gray-700 mt-1">Satellites: {sensor.satellites}</p>
      )}

      {sensor.state && (
        <p className="text-sm text-gray-700 mt-1 capitalize">State: {sensor.state}</p>
      )}
    </div>
  );
}
