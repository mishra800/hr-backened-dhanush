import { useState, useEffect } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import { useDateFilter } from '../hooks/useDateFilter';
import MetricCard from '../components/MetricCard';
import TrendChart from '../components/charts/TrendChart';
import BarChart from '../components/charts/BarChart';
import PieChart from '../components/charts/PieChart';
import DateRangePicker from '../components/DateRangePicker';
import ExportButton from '../components/ExportButton';
import DetailModal from '../components/DetailModal';

export default function AnalysisEnhanced() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({
    overview: {},
    trends: {},
    departmentMetrics: {},
    performanceMetrics: {},
    attendanceMetrics: {},
    recruitmentMetrics: {}
  });
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [modalData, setModalData] = useState(null);
  
  const { dateRange, setDateRange, formatDateForAPI } = useDateFilter();

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        start_date: formatDateForAPI(dateRange.startDate),
        end_date: formatDateForAPI(dateRange.endDate)
      };

      const [
        overviewRes,
        trendsRes,
        departmentRes,
        performanceRes,
        attendanceRes,
        recruitmentRes
      ] = await Promise.all([
        api.get('/analysis/overview', { params }),
        api.get('/analysis/trends', { params }),
        api.get('/analysis/departments', { params }),
        api.get('/analysis/performance', { params }),
        api.get('/analysis/attendance', { params }),
        api.get('/analysis/recruitment', { params })
      ]);

      setAnalyticsData({
        overview: overviewRes.data,
        trends: trendsRes.data,
        departmentMetrics: departmentRes.data,
        performanceMetrics: performanceRes.data,
        attendanceMetrics: attendanceRes.data,
        recruitmentMetrics: recruitmentRes.data
      });
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleMetricClick = async (metricType, metricId) => {
    try {
      const response = await api.get(`/analysis/details/${metricType}/${metricId}`, {
        params: {
          start_date: formatDateForAPI(dateRange.startDate),
          end_date: formatDateForAPI(dateRange.endDate)
        }
      });
      setModalData(response.data);
      setSelectedMetric(metricType);
    } catch (error) {
      console.error('Error fetching metric details:', error);
    }
  };

  const exportData = async (format) => {
    try {
      const response = await api.get(`/analysis/export/${format}`, {
        params: {
          start_date: formatDateForAPI(dateRange.startDate),
          end_date: formatDateForAPI(dateRange.endDate)
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <button
            onClick={fetchAnalyticsData}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex gap-4">
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={setDateRange}
          />
          <ExportButton onExport={exportData} />
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Employees"
          value={analyticsData.overview.total_employees || 0}
          change={analyticsData.overview.employee_growth || 0}
          icon="👥"
          onClick={() => handleMetricClick('employees', 'total')}
        />
        <MetricCard
          title="Active Projects"
          value={analyticsData.overview.active_projects || 0}
          change={analyticsData.overview.project_growth || 0}
          icon="📊"
          onClick={() => handleMetricClick('projects', 'active')}
        />
        <MetricCard
          title="Avg Performance"
          value={`${analyticsData.overview.avg_performance || 0}%`}
          change={analyticsData.overview.performance_change || 0}
          icon="⭐"
          onClick={() => handleMetricClick('performance', 'average')}
        />
        <MetricCard
          title="Attendance Rate"
          value={`${analyticsData.overview.attendance_rate || 0}%`}
          change={analyticsData.overview.attendance_change || 0}
          icon="📅"
          onClick={() => handleMetricClick('attendance', 'rate')}
        />
      </div>

      {/* Trends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Employee Growth Trend</h3>
          <TrendChart
            data={analyticsData.trends.employee_growth || []}
            xKey="month"
            yKey="count"
            color="#3B82F6"
          />
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Performance Trend</h3>
          <TrendChart
            data={analyticsData.trends.performance_trend || []}
            xKey="month"
            yKey="score"
            color="#10B981"
          />
        </div>
      </div>

      {/* Department Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Department Distribution</h3>
          <PieChart
            data={analyticsData.departmentMetrics.distribution || []}
            dataKey="count"
            nameKey="department"
          />
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Department Performance</h3>
          <BarChart
            data={analyticsData.departmentMetrics.performance || []}
            xKey="department"
            yKey="avg_score"
            color="#8B5CF6"
          />
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Performance Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {analyticsData.performanceMetrics.excellent || 0}
            </div>
            <div className="text-gray-600">Excellent (90-100%)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {analyticsData.performanceMetrics.good || 0}
            </div>
            <div className="text-gray-600">Good (70-89%)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {analyticsData.performanceMetrics.needs_improvement || 0}
            </div>
            <div className="text-gray-600">Needs Improvement (&lt;70%)</div>
          </div>
        </div>
      </div>

      {/* Attendance Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Attendance Patterns</h3>
          <BarChart
            data={analyticsData.attendanceMetrics.daily_pattern || []}
            xKey="day"
            yKey="attendance_rate"
            color="#F59E0B"
          />
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Leave Requests</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Pending Requests</span>
              <span className="font-semibold text-yellow-600">
                {analyticsData.attendanceMetrics.pending_leaves || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Approved This Month</span>
              <span className="font-semibold text-green-600">
                {analyticsData.attendanceMetrics.approved_leaves || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Leave Days</span>
              <span className="font-semibold text-blue-600">
                {analyticsData.attendanceMetrics.total_leave_days || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recruitment Analytics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Recruitment Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {analyticsData.recruitmentMetrics.total_applications || 0}
            </div>
            <div className="text-gray-600">Total Applications</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {analyticsData.recruitmentMetrics.interviews_scheduled || 0}
            </div>
            <div className="text-gray-600">Interviews Scheduled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {analyticsData.recruitmentMetrics.offers_made || 0}
            </div>
            <div className="text-gray-600">Offers Made</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {analyticsData.recruitmentMetrics.hires_completed || 0}
            </div>
            <div className="text-gray-600">Hires Completed</div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {modalData && (
        <DetailModal
          isOpen={!!modalData}
          onClose={() => {
            setModalData(null);
            setSelectedMetric(null);
          }}
          title={`${selectedMetric} Details`}
          data={modalData}
        />
      )}
    </div>
  );
}