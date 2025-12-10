import { createContext, useContext, useState } from 'react';

const SearchFilterContext = createContext(null);

export const SearchFilterProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const applyFilters = (users) => {
    if (!users || users.length === 0) return [];

    let filtered = [...users];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(query) ||
        user.deviceId?.toLowerCase().includes(query) ||
        user.location?.toLowerCase().includes(query) ||
        user.company?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      switch (filterType) {
        case 'weighing':
          filtered = filtered.filter(u => u.deviceType === 'weighingMachine');
          break;
        case 'fuel':
          filtered = filtered.filter(u => u.deviceType === 'fuelDispenser');
          break;
        case 'energy':
          filtered = filtered.filter(u => u.deviceType === 'energyMeter');
          break;
        case 'tampered':
          filtered = filtered.filter(u => u.tampered === true);
          break;
        case 'normal':
          filtered = filtered.filter(u => u.tampered === false);
          break;
        default:
          break;
      }
    }

    return filtered;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
  };

  return (
    <SearchFilterContext.Provider value={{ 
      searchQuery, 
      setSearchQuery, 
      filterType, 
      setFilterType,
      applyFilters,
      clearFilters
    }}>
      {children}
    </SearchFilterContext.Provider>
  );
};

export const useSearchFilter = () => {
  const context = useContext(SearchFilterContext);
  if (!context) {
    throw new Error('useSearchFilter must be used within SearchFilterProvider');
  }
  return context;
};
