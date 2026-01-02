export default function MetricCard({ 
  title, 
  value, 
  change,
  subtitle, 
  trend, 
  trendValue,
  color = 'blue',
  icon,
  onClick,
  loading = false
}) {
  const colorClasses = {
    blue: 'border-blue-500 text-blue-600',
    red: 'border-red-500 text-red-600',
    green: 'border-green-500 text-green-600',
    purple: 'border-purple-500 text-purple-600',
    yellow: 'border-yellow-500 text-yellow-600',
    indigo: 'border-indigo-500 text-indigo-600'
  };

  const getTrendFromChange = (changeValue) => {
    if (!changeValue) return null;
    if (changeValue > 0) return 'up';
    if (changeValue < 0) return 'down';
    return 'neutral';
  };

  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
  };

  const displayTrend = trend || getTrendFromChange(change);
  const displayTrendValue = trendValue || (change ? `${Math.abs(change)}%` : null);

  return (
    <div
      onClick={onClick}
      className={`bg-white overflow-hidden shadow rounded-lg border-l-4 ${colorClasses[color]} ${
        onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
      }`}
    >
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between">
          <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
          {icon && <span className="text-2xl">{icon}</span>}
        </div>
        
        {loading ? (
          <div className="mt-1 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-24"></div>
          </div>
        ) : (
          <>
            <dd className={`mt-1 text-3xl font-semibold ${colorClasses[color]}`}>
              {value}
            </dd>
            
            {subtitle && (
              <p className="text-xs text-gray-400 mt-2">{subtitle}</p>
            )}
            
            {displayTrend && displayTrendValue && (
              <div className="mt-2 flex items-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${trendColors[displayTrend]}`}>
                  {displayTrend === 'up' && '↑'}
                  {displayTrend === 'down' && '↓'}
                  {displayTrend === 'neutral' && '→'}
                  <span className="ml-1">{displayTrendValue}</span>
                </span>
                <span className="ml-2 text-xs text-gray-500">vs last period</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
