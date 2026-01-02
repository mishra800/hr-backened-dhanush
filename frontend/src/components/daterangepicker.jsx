import { useState } from 'react';
import { format } from 'date-fns';

export default function DateRangePicker({ startDate, endDate, onChange }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const presets = [
    { key: '7days', label: 'Last 7 Days' },
    { key: '30days', label: 'Last 30 Days' },
    { key: '90days', label: 'Last 90 Days' },
    { key: '6months', label: 'Last 6 Months' },
    { key: '1year', label: 'Last Year' }
  ];

  const handlePresetClick = (preset) => {
    const now = new Date();
    let start, end;

    switch (preset) {
      case '7days':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case '30days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case '90days':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case '6months':
        start = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case '1year':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      default:
        return;
    }

    onChange({ startDate: start, endDate: end });
    setShowCustom(false);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({
        startDate: new Date(customStart),
        endDate: new Date(customEnd)
      });
      setShowCustom(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-w-[280px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Date Range</h3>
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          {showCustom ? 'Quick Select' : 'Custom Range'}
        </button>
      </div>

      <div className="mb-3 text-xs text-gray-600">
        {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
      </div>

      {!showCustom ? (
        <div className="grid grid-cols-1 gap-2">
          {presets.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePresetClick(key)}
              className="px-3 py-2 text-sm rounded-md transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 text-left"
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <button
            onClick={handleCustomApply}
            disabled={!customStart || !customEnd}
            className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Range
          </button>
        </div>
      )}
    </div>
  );
}
