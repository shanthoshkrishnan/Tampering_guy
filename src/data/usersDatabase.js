export const usersDatabase = {
  weighingMachine: [
    {
      id: 'WM001',
      name: 'Raj Kumar',
      email: 'raj.kumar@logistics.com',
      phone: '+91 9123456789',
      deviceId: 'WM-001',
      deviceType: 'weighingMachine',
      location: 'Delhi Warehouse A, Sector 63',
      latitude: 28.6139,
      longitude: 77.2090,
      status: 'active',
      tampered: false,
      installDate: '2024-01-15',
      lastMaintenance: '2024-11-01',
      avgDailyLoad: '2.5 tons',
      company: 'Delhi Logistics Pvt Ltd'
    },
    {
      id: 'WM002',
      name: 'Amit Patel',
      email: 'amit.patel@shipping.com',
      phone: '+91 9876543211',
      deviceId: 'WM-002',
      deviceType: 'weighingMachine',
      location: 'Mumbai Warehouse B, Andheri East',
      latitude: 19.0760,
      longitude: 72.8777,
      status: 'active',
      tampered: false,
      installDate: '2024-02-10',
      lastMaintenance: '2024-11-15',
      avgDailyLoad: '3.2 tons',
      company: 'Mumbai Shipping Co.'
    },
    {
      id: 'WM003',
      name: 'Suresh Reddy',
      email: 'suresh.r@transport.com',
      phone: '+91 9876543220',
      deviceId: 'WM-003',
      deviceType: 'weighingMachine',
      location: 'Hyderabad Hub, Gachibowli',
      latitude: 17.4400,
      longitude: 78.3489,
      status: 'active',
      tampered: true,
      installDate: '2024-03-22',
      lastMaintenance: '2024-10-20',
      avgDailyLoad: '1.8 tons',
      company: 'Hyderabad Transport Services'
    }
  ],
  fuelDispenser: [
    {
      id: 'FD001',
      name: 'Priya Singh',
      email: 'priya.singh@petroserve.com',
      phone: '+91 9876543212',
      deviceId: 'FD-001',
      deviceType: 'fuelDispenser',
      location: 'Bangalore Petrol Pump A, Whitefield',
      latitude: 12.9716,
      longitude: 77.5946,
      status: 'active',
      tampered: false,
      installDate: '2024-03-05',
      lastMaintenance: '2024-11-20',
      avgDailyDispense: '5000 liters',
      company: 'PetroServe India'
    },
    {
      id: 'FD002',
      name: 'Rahul Verma',
      email: 'rahul.v@fuelsmart.com',
      phone: '+91 9876543213',
      deviceId: 'FD-002',
      deviceType: 'fuelDispenser',
      location: 'Chennai Petrol Pump B, OMR Road',
      latitude: 13.0827,
      longitude: 80.2707,
      status: 'active',
      tampered: true,
      installDate: '2024-03-20',
      lastMaintenance: '2024-11-10',
      avgDailyDispense: '4200 liters',
      company: 'FuelSmart Solutions'
    },
    {
      id: 'FD003',
      name: 'Anjali Mehta',
      email: 'anjali.m@petromax.com',
      phone: '+91 9876543221',
      deviceId: 'FD-003',
      deviceType: 'fuelDispenser',
      location: 'Pune Highway Pump, Hinjewadi',
      latitude: 18.5204,
      longitude: 73.8567,
      status: 'active',
      tampered: false,
      installDate: '2024-04-15',
      lastMaintenance: '2024-11-25',
      avgDailyDispense: '6500 liters',
      company: 'PetroMax Highway Services'
    },
    {
      id: 'FD004',
      name: 'Vikram Shah',
      email: 'vikram.shah@oilandgas.com',
      phone: '+91 9876543222',
      deviceId: 'FD-004',
      deviceType: 'fuelDispenser',
      location: 'Ahmedabad Station, SG Highway',
      latitude: 23.0225,
      longitude: 72.5714,
      status: 'active',
      tampered: false,
      installDate: '2024-05-01',
      lastMaintenance: '2024-11-05',
      avgDailyDispense: '3800 liters',
      company: 'Gujarat Oil & Gas'
    }
  ],
  energyMeter: [
    {
      id: 'EM001',
      name: 'Sneha Desai',
      email: 'sneha.desai@powertech.com',
      phone: '+91 9876543214',
      deviceId: 'EM-001',
      deviceType: 'energyMeter',
      location: 'Pune Factory Unit 1, Chakan',
      latitude: 18.7606,
      longitude: 73.8636,
      status: 'active',
      tampered: false,
      installDate: '2024-04-01',
      lastMaintenance: '2024-10-15',
      avgDailyConsumption: '2500 kWh',
      company: 'PowerTech Industries'
    },
    {
      id: 'EM002',
      name: 'Karthik Iyer',
      email: 'karthik.i@energysol.com',
      phone: '+91 9876543223',
      deviceId: 'EM-002',
      deviceType: 'energyMeter',
      location: 'Coimbatore Plant, Singanallur',
      latitude: 11.0168,
      longitude: 76.9558,
      status: 'active',
      tampered: false,
      installDate: '2024-05-10',
      lastMaintenance: '2024-11-12',
      avgDailyConsumption: '3200 kWh',
      company: 'EnergySol Manufacturing'
    },
    {
      id: 'EM003',
      name: 'Meera Nair',
      email: 'meera.n@industrialpower.com',
      phone: '+91 9876543224',
      deviceId: 'EM-003',
      deviceType: 'energyMeter',
      location: 'Kochi Industrial Park, Kalamassery',
      latitude: 10.0261,
      longitude: 76.2999,
      status: 'active',
      tampered: true,
      installDate: '2024-06-05',
      lastMaintenance: '2024-11-18',
      avgDailyConsumption: '1800 kWh',
      company: 'Industrial Power Solutions'
    }
  ]
};

// Helper function to get all users
export const getAllUsers = () => {
  return [
    ...usersDatabase.weighingMachine,
    ...usersDatabase.fuelDispenser,
    ...usersDatabase.energyMeter
  ];
};

// Helper function to get user by ID
export const getUserById = (userId) => {
  const allUsers = getAllUsers();
  return allUsers.find(user => user.id === userId);
};

// Helper function to get users by device type
export const getUsersByDeviceType = (deviceType) => {
  return usersDatabase[deviceType] || [];
};
