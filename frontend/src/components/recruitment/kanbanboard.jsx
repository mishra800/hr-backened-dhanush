import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../api/axios';
import CandidateCard from './candidatecard';
import { useToast } from '../../hooks/usetoast';
import { ToastContainer } from '../toast';

const STAGES = [
  { id: 'applied', name: 'Applied', color: 'bg-gray-100', icon: '📝' },
  { id: 'screening', name: 'Screening', color: 'bg-blue-100', icon: '🔍' },
  { id: 'assessment', name: 'Assessment', color: 'bg-purple-100', icon: '📊' },
  { id: 'interview', name: 'Interview', color: 'bg-yellow-100', icon: '💬' },
  { id: 'offer', name: 'Offer', color: 'bg-green-100', icon: '📄' },
  { id: 'hired', name: 'Hired', color: 'bg-emerald-100', icon: '✅' },
  { id: 'rejected', name: 'Rejected', color: 'bg-red-100', icon: '❌' }
];

// Sortable Card Wrapper
function SortableCard({ application, isSelected, onSelect, onRefresh }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CandidateCard
        application={application}
        isSelected={isSelected}
        onSelect={onSelect}
        isDragging={isDragging}
        onRefresh={onRefresh}
      />
    </div>
  );
}

export default function KanbanBoard({ jobId }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  const [applications, setApplications] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    minScore: 0,
    source: 'all'
  });
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  const { toasts, removeToast, success, error: showError } = useToast();

  useEffect(() => {
    if (jobId) {
      fetchApplications();
    }
  }, [jobId]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/recruitment/jobs/${jobId}/applications`);
      
      // Group applications by stage
      const grouped = STAGES.reduce((acc, stage) => {
        acc[stage.id] = response.data.filter(app => 
          (app.status || 'applied') === stage.id
        );
        return acc;
      }, {});
      
      setApplications(grouped);
    } catch (err) {
      console.error('Error fetching applications:', err);
      showError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find which stage the card is being dropped into
    let destStage = null;
    let sourceStage = null;
    let movedApp = null;

    // Find the application and its current stage
    for (const stage of STAGES) {
      const app = applications[stage.id]?.find(a => a.id === activeId);
      if (app) {
        sourceStage = stage.id;
        movedApp = app;
        break;
      }
    }

    // Determine destination stage (overId could be a stage or another card)
    if (STAGES.find(s => s.id === overId)) {
      destStage = overId;
    } else {
      // Find which stage contains the card we're hovering over
      for (const stage of STAGES) {
        if (applications[stage.id]?.find(a => a.id === overId)) {
          destStage = stage.id;
          break;
        }
      }
    }

    if (!destStage || !sourceStage || !movedApp || sourceStage === destStage) return;

    // Update local state optimistically
    const newApplications = { ...applications };
    newApplications[sourceStage] = newApplications[sourceStage].filter(a => a.id !== activeId);
    movedApp.status = destStage;
    newApplications[destStage] = [...(newApplications[destStage] || []), movedApp];
    setApplications(newApplications);

    // Update backend
    try {
      await api.patch(`/recruitment/applications/${activeId}/status?status=${destStage}`);
      success(`Moved to ${STAGES.find(s => s.id === destStage)?.name}`);
      
      // Log stage change
      await api.post(`/recruitment/applications/${activeId}/stage-history`, {
        from_stage: sourceStage,
        to_stage: destStage
      });
    } catch (err) {
      console.error('Error updating status:', err);
      showError('Failed to update status');
      // Revert on error
      fetchApplications();
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedCandidates.length === 0) {
      showError('No candidates selected');
      return;
    }

    try {
      if (action === 'shortlist') {
        await Promise.all(
          selectedCandidates.map(id =>
            api.patch(`/recruitment/applications/${id}/status?status=interview`)
          )
        );
        success(`${selectedCandidates.length} candidates shortlisted`);
      } else if (action === 'reject') {
        await Promise.all(
          selectedCandidates.map(id =>
            api.patch(`/recruitment/applications/${id}/status?status=rejected`)
          )
        );
        success(`${selectedCandidates.length} candidates rejected`);
      } else if (action === 'email') {
        // Open email modal
        showError('Email feature coming soon');
      }

      setSelectedCandidates([]);
      setShowBulkActions(false);
      fetchApplications();
    } catch (err) {
      console.error('Bulk action error:', err);
      showError('Bulk action failed');
    }
  };

  const toggleCandidateSelection = (id) => {
    setSelectedCandidates(prev =>
      prev.includes(id)
        ? prev.filter(cid => cid !== id)
        : [...prev, id]
    );
  };

  const filteredApplications = (stageApps) => {
    return stageApps.filter(app => {
      const matchesSearch = !filters.search || 
        app.candidate_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        app.candidate_email.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesScore = app.ai_fit_score >= filters.minScore;
      
      const matchesSource = filters.source === 'all' || app.source === filters.source;
      
      return matchesSearch && matchesScore && matchesSource;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="space-y-4">
        {/* Filters & Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search candidates..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Score Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Min Score:</label>
              <input
                type="range"
                min="0"
                max="100"
                value={filters.minScore}
                onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
                className="w-32"
              />
              <span className="text-sm font-medium text-gray-700 w-8">{filters.minScore}</span>
            </div>

            {/* Source Filter */}
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sources</option>
              <option value="direct">Direct</option>
              <option value="linkedin">LinkedIn</option>
              <option value="indeed">Indeed</option>
              <option value="referral">Referral</option>
            </select>

            {/* Bulk Actions */}
            {selectedCandidates.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedCandidates.length} selected
                </span>
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Bulk Actions
                </button>
              </div>
            )}
          </div>

          {/* Bulk Actions Menu */}
          {showBulkActions && (
            <div className="mt-4 flex gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <button
                onClick={() => handleBulkAction('shortlist')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                ✓ Shortlist All
              </button>
              <button
                onClick={() => handleBulkAction('reject')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                ✗ Reject All
              </button>
              <button
                onClick={() => handleBulkAction('email')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                ✉ Send Email
              </button>
              <button
                onClick={() => {
                  setSelectedCandidates([]);
                  setShowBulkActions(false);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map((stage) => {
              const stageApps = filteredApplications(applications[stage.id] || []);
              
              return (
                <div key={stage.id} className="flex-shrink-0 w-80">
                  <div className={`${stage.color} rounded-lg p-3 mb-3`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{stage.icon}</span>
                        <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                      </div>
                      <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-700">
                        {stageApps.length}
                      </span>
                    </div>
                  </div>

                  <SortableContext
                    items={stageApps.map(app => app.id)}
                    strategy={verticalListSortingStrategy}
                    id={stage.id}
                  >
                    <div className="space-y-3 min-h-[200px] p-2 rounded-lg bg-gray-50">
                      {stageApps.map((app) => (
                        <SortableCard
                          key={app.id}
                          application={app}
                          isSelected={selectedCandidates.includes(app.id)}
                          onSelect={() => toggleCandidateSelection(app.id)}
                          onRefresh={fetchApplications}
                        />
                      ))}
                      
                      {stageApps.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          No candidates
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
        </DndContext>

        {/* Summary Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {STAGES.map((stage) => {
              const count = (applications[stage.id] || []).length;
              const percentage = Object.values(applications).flat().length > 0
                ? ((count / Object.values(applications).flat().length) * 100).toFixed(1)
                : 0;
              
              return (
                <div key={stage.id} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-500">{stage.name}</div>
                  <div className="text-xs text-gray-400">{percentage}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
