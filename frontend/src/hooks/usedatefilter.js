import { useState } from 'react';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

export function useDateFilter() {
  const [dateRange, setDateRange] = useState({
    startDate: startOfDay(subDays(new Date(), 30)),
    endDate: endOfDay(new Date()),
    preset: '30days'
  });

  const presets = {
    '7days': { days: 7, label: 'Last 7 Days' },
    '30days': { days: 30, label: 'Last 30 Days' },
    '90days': { days: 90, label: 'Last 90 Days' },
    '6months': { days: 180, label: 'Last 6 Months' },
    '1year': { days: 365, label: 'Last Year' },
    'custom': { days: null, label: 'Custom Range' }
  };

  const setPreset = (preset) => {
    if (preset === 'custom') {
      setDateRange(prev => ({ ...prev, preset }));
      return;
    }

    const days = presets[preset].days;
    setDateRange({
      startDate: startOfDay(subDays(new Date(), days)),
      endDate: endOfDay(new Date()),
      preset
    });
  };

  const setCustomRange = (startDate, endDate) => {
    setDateRange({
      startDate: startOfDay(new Date(startDate)),
      endDate: endOfDay(new Date(endDate)),
      preset: 'custom'
    });
  };

  const formatDateForAPI = (date) => {
    return format(date, 'yyyy-MM-dd');
  };

  return {
    dateRange,
    setDateRange: setCustomRange,
    presets,
    setPreset,
    setCustomRange,
    formatDateForAPI
  };
}
