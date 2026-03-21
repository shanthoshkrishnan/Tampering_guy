import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function DeviceRegistrationPage() {
  const { currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    // Shop Details
    shopName: '',
    businessType: '',
    shopAddress: '',
    shopNumber: '',
    cityDistrict: '',
    state: '',
    pincode: '',
    shopLatitude: '',
    shopLongitude: '',

    // Owner Details
    ownerName: '',
    ownerAge: '',
    ownerPhone: '',
    ownerEmail: '',
    ownerHouseAddress: '',
    ownerHouseLatitude: '',
    ownerHouseLongitude: '',
    licenseNumber: '',

    // Device Details
    deviceId: '',
    deviceType: 'weighingMachine',
    serialNumber: '',
    manufacturer: '',
    yearOfManufacture: '',
    purchaseLocation: '',
    invoiceNumber: '',
    installationDate: '',
    digitalSealId: '',
    verificationStatus: 'pending',

    // Weighing Machine Specific
    capacity: '',
    accuracyClass: '',
    leastCount: '',
    lastCalibratedDate: '',
    nextCalibrationDue: '',
  });

  const [location, setLocation] = useState({ shop: null, ownerHouse: null });
  const [locationLoading, setLocationLoading] = useState({
    shop: false,
    ownerHouse: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const requestLocation = (type) => {
    setLocationLoading((prev) => ({ ...prev, [type]: true }));
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLocationLoading((prev) => ({ ...prev, [type]: false }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        if (type === 'shop') {
          setFormData((prev) => ({
            ...prev,
            shopLatitude: coords.latitude.toFixed(6),
            shopLongitude: coords.longitude.toFixed(6),
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            ownerHouseLatitude: coords.latitude.toFixed(6),
            ownerHouseLongitude: coords.longitude.toFixed(6),
          }));
        }

        setLocation((prev) => ({ ...prev, [type]: coords }));
        setLocationLoading((prev) => ({ ...prev, [type]: false }));
      },
      (err) => {
        setLocationLoading((prev) => ({ ...prev, [type]: false }));
        setError(
          `Location error: ${err.message}. Please enable location access.`
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!currentUser) {
      setError('Please login first');
      setLoading(false);
      return;
    }

    try {
      const requiredFields = [
        'shopName',
        'businessType',
        'shopAddress',
        'cityDistrict',
        'state',
        'pincode',
        'ownerName',
        'ownerAge',
        'ownerPhone',
        'ownerEmail',
        'ownerHouseAddress',
        'deviceId',
        'deviceType',
        'serialNumber',
        'manufacturer',
        'yearOfManufacture',
      ];

      if (formData.deviceType === 'weighingMachine') {
        requiredFields.push('capacity', 'accuracyClass', 'leastCount');
      }

      for (let field of requiredFields) {
        if (!formData[field]?.toString().trim()) {
          throw new Error(
            `${field
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, (str) => str.toUpperCase())} is required`
          );
        }
      }

      const phoneRegex = /^[+]?[1-9][\d]{9,14}$/;
      if (!phoneRegex.test(formData.ownerPhone.replace(/\s/g, ''))) {
        throw new Error(
          'Please enter a valid phone number (10-15 digits)'
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.ownerEmail)) {
        throw new Error('Please enter a valid email address');
      }

      if (!/^\d{6}$/.test(formData.pincode)) {
        throw new Error('Pincode must be 6 digits');
      }

      const age = parseInt(formData.ownerAge);
      if (age < 18 || age > 100) {
        throw new Error('Owner age must be between 18 and 100');
      }

      const currentYear = new Date().getFullYear();
      const manufactureYear = parseInt(formData.yearOfManufacture);
      if (manufactureYear < 1980 || manufactureYear > currentYear) {
        throw new Error(
          `Year of manufacture must be between 1980 and ${currentYear}`
        );
      }

      const registrationData = {
        shopDetails: {
          shopName: formData.shopName,
          businessType: formData.businessType,
          shopAddress: formData.shopAddress,
          shopNumber: formData.shopNumber || null,
          cityDistrict: formData.cityDistrict,
          state: formData.state,
          pincode: formData.pincode,
          location: {
            latitude: parseFloat(formData.shopLatitude) || null,
            longitude: parseFloat(formData.shopLongitude) || null,
            capturedAt: location.shop
              ? new Date().toISOString()
              : null,
          },
        },
        ownerDetails: {
          ownerName: formData.ownerName,
          ownerAge: parseInt(formData.ownerAge),
          ownerPhone: formData.ownerPhone,
          ownerEmail: formData.ownerEmail,
          ownerHouseAddress: formData.ownerHouseAddress,
          houseLocation: {
            latitude: parseFloat(formData.ownerHouseLatitude) || null,
            longitude: parseFloat(formData.ownerHouseLongitude) || null,
            capturedAt: location.ownerHouse
              ? new Date().toISOString()
              : null,
          },
          licenseNumber: formData.licenseNumber || null,
        },
        deviceDetails: {
          deviceId: formData.deviceId.toUpperCase().trim(),
          deviceType: formData.deviceType,
          serialNumber: formData.serialNumber,
          manufacturer: formData.manufacturer,
          yearOfManufacture: parseInt(formData.yearOfManufacture),
          purchaseLocation: formData.purchaseLocation || null,
          invoiceNumber: formData.invoiceNumber || null,
          installationDate: formData.installationDate || null,
          digitalSealId: formData.digitalSealId || null,
          verificationStatus: formData.verificationStatus,
          ...(formData.deviceType === 'weighingMachine' && {
            weighingSpecs: {
              capacity: formData.capacity,
              accuracyClass: formData.accuracyClass,
              leastCount: formData.leastCount,
              lastCalibratedDate:
                formData.lastCalibratedDate || null,
              nextCalibrationDue:
                formData.nextCalibrationDue || null,
            },
          }),
        },
        status: 'pending',
        createdBy: {
          userId: currentUser.uid,
          userEmail: currentUser.email,
          userName: currentUser.name || 'Unknown',
        },
        lmOfficerId: null,
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        createdAt: serverTimestamp(),
      };

      await addDoc(
        collection(db, 'device_registrations'),
        registrationData
      );

      setSuccess(
        `✅ Device ${formData.deviceId.toUpperCase()} registered successfully! LM Officer will review and approve it soon.`
      );
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deviceTypes = [
    { value: 'weighingMachine', label: '⚖️ Weighing Machine' },
    { value: 'fuelDispenser', label: '⛽ Fuel Dispenser' },
    { value: 'energyMeter', label: '⚡ Energy Meter' },
  ];

  const accuracyClasses = [
    { value: 'Class I', label: 'Class I (Special Accuracy)' },
    { value: 'Class II', label: 'Class II (High Accuracy)' },
    { value: 'Class III', label: 'Class III (Medium Accuracy)' },
    { value: 'Class IIII', label: 'Class IIII (Ordinary Accuracy)' },
  ];

  const verificationStatuses = [
    { value: 'pending', label: '⏳ Pending Verification' },
    { value: 'verified', label: '✅ Verified' },
    { value: 'expired', label: '❌ Expired' },
  ];

  const states = [
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
    'Delhi',
    'Jammu and Kashmir',
    'Ladakh',
    'Puducherry',
  ];

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-40 -right-40 w-72 sm:w-80 h-72 sm:h-80 ${
            isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-300/30'
          } rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob`}
        />
        <div
          className={`absolute -bottom-40 -left-40 w-72 sm:w-80 h-72 sm:h-80 ${
            isDarkMode ? 'bg-purple-900/30' : 'bg-purple-300/30'
          } rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000`}
        />
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-80 h-72 sm:h-80 ${
            isDarkMode ? 'bg-pink-900/30' : 'bg-pink-300/30'
          } rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000`}
        />
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-3 sm:px-4 py-10 sm:py-12">
        <div className="w-full max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 px-2 sm:px-0">
            <button
              onClick={() => navigate('/dashboard')}
              className={`mb-5 sm:mb-6 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm ${
                isDarkMode
                  ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                  : 'bg-white/50 text-gray-700 hover:bg-white/70'
              } transition`}
            >
              ← Back to Dashboard
            </button>
            <div
              className={`inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-5 sm:mb-6 shadow-lg ${
                isDarkMode
                  ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600'
                  : 'bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500'
              }`}
            >
              <span className="text-3xl sm:text-4xl">📱</span>
            </div>
            <h1
              className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4 break-words ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}
            >
              Register Your Device
            </h1>
            <p
              className={`text-sm sm:text-base ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              Submit complete device details for LM Officer approval
            </p>
          </div>

          {/* Messages */}
          {success && (
            <div
              className={`mb-6 sm:mb-8 p-4 sm:p-6 rounded-2xl border ${
                isDarkMode
                  ? 'bg-green-900/30 border-green-700/50'
                  : 'bg-green-100/80 border-green-300/50'
              } backdrop-blur-sm animate-pulse`}
            >
              <p
                className={`text-sm sm:text-lg font-semibold text-center ${
                  isDarkMode ? 'text-green-300' : 'text-green-700'
                } break-words`}
              >
                {success}
              </p>
            </div>
          )}

          {error && (
            <div
              className={`mb-6 sm:mb-8 p-4 sm:p-6 rounded-2xl border ${
                isDarkMode
                  ? 'bg-red-900/30 border-red-700/50'
                  : 'bg-red-100/80 border-red-300/50'
              } backdrop-blur-sm animate-shake`}
            >
              <p
                className={`text-sm sm:text-lg font-semibold text-center ${
                  isDarkMode ? 'text-red-300' : 'text-red-700'
                } break-words`}
              >
                ⚠️ {error}
              </p>
            </div>
          )}

          {/* Form */}
          <div
            className={`backdrop-blur-2xl px-4 sm:px-6 md:px-8 py-6 sm:py-8 rounded-3xl shadow-2xl border ${
              isDarkMode
                ? 'bg-gray-800/40 border-gray-700/50'
                : 'bg-white/40 border-white/50'
            }`}
          >
            <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10">
              {/* SHOP DETAILS */}
              <div>
                <h3
                  className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pb-3 sm:pb-4 border-b flex flex-wrap items-center gap-2 sm:gap-3 ${
                    isDarkMode
                      ? 'text-white border-gray-700'
                      : 'text-gray-800 border-gray-300'
                  }`}
                >
                  <span>🏪</span>
                  <span className="truncate">
                    Shop / Business Details
                  </span>
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Shop Name *
                    </label>
                    <input
                      name="shopName"
                      value={formData.shopName}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="ABC Grocery Store"
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Business Type *
                    </label>
                    <input
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="grocery, medical shop, textile, supermarket"
                      required
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Shop Address *
                    </label>
                    <textarea
                      name="shopAddress"
                      value={formData.shopAddress}
                      onChange={handleChange}
                      rows={2}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition resize-vertical ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="123 Main Street, Near Market, Sector 5"
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Shop Number (Optional)
                    </label>
                    <input
                      name="shopNumber"
                      value={formData.shopNumber}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="Shop No. 45"
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      City/District *
                    </label>
                    <input
                      name="cityDistrict"
                      value={formData.cityDistrict}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="Delhi / Mumbai / Bangalore"
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      State *
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white'
                          : 'bg-white/50 border-gray-300/50 text-gray-800'
                      }`}
                      required
                    >
                      <option value="">Select State</option>
                      {states.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Pincode *
                    </label>
                    <input
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="110001"
                      maxLength={6}
                      pattern="\d{6}"
                      required
                    />
                  </div>

                  {/* Shop Location */}
                  <div className="lg:col-span-2">
                    <div
                      className={`p-4 sm:p-5 rounded-xl border ${
                        isDarkMode
                          ? 'bg-blue-900/20 border-blue-700/50'
                          : 'bg-blue-100/50 border-blue-300/50'
                      } backdrop-blur-sm`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                              isDarkMode
                                ? 'text-blue-300'
                                : 'text-blue-700'
                            }`}
                          >
                            📍 Shop Location
                          </p>
                          {location.shop ? (
                            <p
                              className={`text-[11px] sm:text-xs ${
                                isDarkMode
                                  ? 'text-blue-400'
                                  : 'text-blue-600'
                              } break-words`}
                            >
                              ✅ Captured: {formData.shopLatitude},{' '}
                              {formData.shopLongitude}
                            </p>
                          ) : (
                            <p
                              className={`text-[11px] sm:text-xs ${
                                isDarkMode
                                  ? 'text-blue-400'
                                  : 'text-blue-600'
                              }`}
                            >
                              Click button to capture shop GPS coordinates
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => requestLocation('shop')}
                          disabled={
                            locationLoading.shop || !!location.shop
                          }
                          className={`w-full sm:w-auto px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm text-center transition ${
                            location.shop
                              ? 'bg-green-600 text-white cursor-not-allowed'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          } disabled:opacity-50`}
                        >
                          {locationLoading.shop
                            ? '⏳ Getting...'
                            : location.shop
                            ? '✓ Captured'
                            : '📍 Capture'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* OWNER DETAILS */}
              <div>
                <h3
                  className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pb-3 sm:pb-4 border-b flex flex-wrap items-center gap-2 sm:gap-3 ${
                    isDarkMode
                      ? 'text-white border-gray-700'
                      : 'text-gray-800 border-gray-300'
                  }`}
                >
                  <span>👤</span>
                  <span className="truncate">Owner Details</span>
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Owner Name *
                    </label>
                    <input
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="Raj Kumar"
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Owner Age *
                    </label>
                    <input
                      type="number"
                      name="ownerAge"
                      value={formData.ownerAge}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="35"
                      min={18}
                      max={100}
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Owner Phone *
                    </label>
                    <input
                      type="tel"
                      name="ownerPhone"
                      value={formData.ownerPhone}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="+919876543210"
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Owner Email *
                    </label>
                    <input
                      type="email"
                      name="ownerEmail"
                      value={formData.ownerEmail}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="owner@example.com"
                      required
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Owner House Address *
                    </label>
                    <textarea
                      name="ownerHouseAddress"
                      value={formData.ownerHouseAddress}
                      onChange={handleChange}
                      rows={2}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition resize-vertical ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="H-123, Sector 10, Residential Area"
                      required
                    />
                  </div>

                  {/* Owner House Location */}
                  <div className="lg:col-span-2">
                    <div
                      className={`p-4 sm:p-5 rounded-xl border ${
                        isDarkMode
                          ? 'bg-purple-900/20 border-purple-700/50'
                          : 'bg-purple-100/50 border-purple-300/50'
                      } backdrop-blur-sm`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                              isDarkMode
                                ? 'text-purple-300'
                                : 'text-purple-700'
                            }`}
                          >
                            🏠 Owner House Location
                          </p>
                          {location.ownerHouse ? (
                            <p
                              className={`text-[11px] sm:text-xs ${
                                isDarkMode
                                  ? 'text-purple-400'
                                  : 'text-purple-600'
                              } break-words`}
                            >
                              ✅ Captured:{' '}
                              {formData.ownerHouseLatitude},{' '}
                              {formData.ownerHouseLongitude}
                            </p>
                          ) : (
                            <p
                              className={`text-[11px] sm:text-xs ${
                                isDarkMode
                                  ? 'text-purple-400'
                                  : 'text-purple-600'
                              }`}
                            >
                              Click button to capture house GPS coordinates
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => requestLocation('ownerHouse')}
                          disabled={
                            locationLoading.ownerHouse ||
                            !!location.ownerHouse
                          }
                          className={`w-full sm:w-auto px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm text-center transition ${
                            location.ownerHouse
                              ? 'bg-green-600 text-white cursor-not-allowed'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          } disabled:opacity-50`}
                        >
                          {locationLoading.ownerHouse
                            ? '⏳ Getting...'
                            : location.ownerHouse
                            ? '✓ Captured'
                            : '📍 Capture'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      License/Identification Number (Optional)
                    </label>
                    <input
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="LM-DEL-2025-001 (if applicable)"
                    />
                  </div>
                </div>
              </div>

              {/* DEVICE DETAILS */}
              <div>
                <h3
                  className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pb-3 sm:pb-4 border-b flex flex-wrap items-center gap-2 sm:gap-3 ${
                    isDarkMode
                      ? 'text-white border-gray-700'
                      : 'text-gray-800 border-gray-300'
                  }`}
                >
                  <span>⚙️</span>
                  <span className="truncate">Device Details</span>
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Device Type *
                    </label>
                    <select
                      name="deviceType"
                      value={formData.deviceType}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white'
                          : 'bg-white/50 border-gray-300/50 text-gray-800'
                      }`}
                      required
                    >
                      {deviceTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Device ID *
                    </label>
                    <input
                      name="deviceId"
                      value={formData.deviceId}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition break-words ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="WM-001 / FD-001 / EM-001"
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Serial Number *
                    </label>
                    <input
                      name="serialNumber"
                      value={formData.serialNumber}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition break-words ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="WM123456789"
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Manufacturer / Make *
                    </label>
                    <input
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition break-words ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="XYZ Instruments Pvt Ltd"
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Year of Manufacture *
                    </label>
                    <input
                      type="number"
                      name="yearOfManufacture"
                      value={formData.yearOfManufacture}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="2024"
                      min={1980}
                      max={new Date().getFullYear()}
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Purchase Location (Optional)
                    </label>
                    <input
                      name="purchaseLocation"
                      value={formData.purchaseLocation}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition break-words ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="ABC Equipment Store, Delhi"
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Invoice Number (Optional)
                    </label>
                    <input
                      name="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition break-words ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="INV-2025-001"
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Installation Date (Optional)
                    </label>
                    <input
                      type="date"
                      name="installationDate"
                      value={formData.installationDate}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white'
                          : 'bg-white/50 border-gray-300/50 text-gray-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Digital Seal ID (Optional)
                    </label>
                    <input
                      name="digitalSealId"
                      value={formData.digitalSealId}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition break-words ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      }`}
                      placeholder="DS-2025-12345 (if exists)"
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Verification Status *
                    </label>
                    <select
                      name="verificationStatus"
                      value={formData.verificationStatus}
                      onChange={handleChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white'
                          : 'bg-white/50 border-gray-300/50 text-gray-800'
                      }`}
                      required
                    >
                      {verificationStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* WEIGHING MACHINE SPECIFIC */}
              {formData.deviceType === 'weighingMachine' && (
                <div>
                  <h3
                    className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pb-3 sm:pb-4 border-b flex flex-wrap items-center gap-2 sm:gap-3 ${
                      isDarkMode
                        ? 'text-white border-gray-700'
                        : 'text-gray-800 border-gray-300'
                    }`}
                  >
                    <span>⚖️</span>
                    <span className="truncate">
                      Weighing Machine Specifications
                    </span>
                  </h3>
                  <div
                    className={`p-4 sm:p-6 rounded-2xl border ${
                      isDarkMode
                        ? 'bg-indigo-900/20 border-indigo-700/50'
                        : 'bg-indigo-100/50 border-indigo-300/50'
                    } backdrop-blur-sm`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label
                          className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                            isDarkMode
                              ? 'text-gray-300'
                              : 'text-gray-700'
                          }`}
                        >
                          Capacity * (e.g., 50 kg, 100 kg, 300 kg)
                        </label>
                        <input
                          name="capacity"
                          value={formData.capacity}
                          onChange={handleChange}
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition break-words ${
                            isDarkMode
                              ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                              : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                          }`}
                          placeholder="50 kg / 100 kg / 300 kg"
                          required={
                            formData.deviceType === 'weighingMachine'
                          }
                        />
                      </div>

                      <div>
                        <label
                          className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                            isDarkMode
                              ? 'text-gray-300'
                              : 'text-gray-700'
                          }`}
                        >
                          Accuracy Class *
                        </label>
                        <select
                          name="accuracyClass"
                          value={formData.accuracyClass}
                          onChange={handleChange}
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                            isDarkMode
                              ? 'bg-gray-700/50 border-gray-600/50 text-white'
                              : 'bg-white/50 border-gray-300/50 text-gray-800'
                          }`}
                          required={
                            formData.deviceType === 'weighingMachine'
                          }
                        >
                          <option value="">Select Accuracy Class</option>
                          {accuracyClasses.map((acc) => (
                            <option key={acc.value} value={acc.value}>
                              {acc.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                            isDarkMode
                              ? 'text-gray-300'
                              : 'text-gray-700'
                          }`}
                        >
                          Least Count * (e.g., 5g, 10g, 20g)
                        </label>
                        <input
                          name="leastCount"
                          value={formData.leastCount}
                          onChange={handleChange}
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition break-words ${
                            isDarkMode
                              ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                              : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                          }`}
                          placeholder="5g / 10g / 20g / 50g"
                          required={
                            formData.deviceType === 'weighingMachine'
                          }
                        />
                      </div>

                      <div>
                        <label
                          className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                            isDarkMode
                              ? 'text-gray-300'
                              : 'text-gray-700'
                          }`}
                        >
                          Last Calibrated Date (Optional)
                        </label>
                        <input
                          type="date"
                          name="lastCalibratedDate"
                          value={formData.lastCalibratedDate}
                          onChange={handleChange}
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                            isDarkMode
                              ? 'bg-gray-700/50 border-gray-600/50 text-white'
                              : 'bg-white/50 border-gray-300/50 text-gray-800'
                          }`}
                        />
                      </div>

                      <div>
                        <label
                          className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                            isDarkMode
                              ? 'text-gray-300'
                              : 'text-gray-700'
                          }`}
                        >
                          Next Calibration Due (Optional)
                        </label>
                        <input
                          type="date"
                          name="nextCalibrationDue"
                          value={formData.nextCalibrationDue}
                          onChange={handleChange}
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                            isDarkMode
                              ? 'bg-gray-700/50 border-gray-600/50 text-white'
                              : 'bg-white/50 border-gray-300/50 text-gray-800'
                          }`}
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <div
                          className={`p-3 sm:p-4 rounded-xl border ${
                            isDarkMode
                              ? 'bg-gray-700/30 border-gray-600/30'
                              : 'bg-gray-100/50 border-gray-300/30'
                          } backdrop-blur-sm`}
                        >
                          <p
                            className={`text-[11px] sm:text-xs font-semibold mb-1.5 sm:mb-2 ${
                              isDarkMode
                                ? 'text-gray-400'
                                : 'text-gray-600'
                            }`}
                          >
                            ℹ️ Weighing Machine Guidelines (Legal Metrology
                            Act):
                          </p>
                          <ul
                            className={`text-[11px] sm:text-xs space-y-1 ${
                              isDarkMode
                                ? 'text-gray-500'
                                : 'text-gray-600'
                            }`}
                          >
                            <li>
                              • Reverification required every{' '}
                              <strong>24 months</strong>
                            </li>
                            <li>
                              • Accuracy Class III: Most common for
                              commercial use (max error ±0.5-3g per 1kg)
                            </li>
                            <li>
                              • Least Count = Smallest measurable weight
                              increment
                            </li>
                            <li>
                              • Digital Seal ID: Mandatory for
                              tamper-proof certification
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className={`w-full sm:flex-1 py-3.5 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold text-sm sm:text-base border transition ${
                    isDarkMode
                      ? 'bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-600/50'
                      : 'bg-white/50 border-gray-300/50 text-gray-700 hover:bg-white/70'
                  }`}
                >
                  ← Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:flex-1 py-3.5 sm:py-4 px-4 sm:px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold text-sm sm:text-base shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4 sm:h-5 sm:w-5"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Registering...
                    </span>
                  ) : (
                    '✓ Submit for Approval'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer Note */}
          <div
            className={`text-center mt-6 sm:mt-8 p-3 sm:p-4 rounded-xl ${
              isDarkMode ? 'bg-gray-800/30' : 'bg-white/30'
            } backdrop-blur-sm`}
          >
            <p
              className={`text-xs sm:text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              📋 All registered devices will be reviewed by LM Officer
              within 2–3 business days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
