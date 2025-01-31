import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
    import { Plus, Bell, Trash2, Check, ChevronDown, ChevronUp, X, Edit2, Target, Eye, EyeOff, Search } from 'lucide-react';
    import { Activity } from '../types/activity';
    import { LIFE_DOMAINS } from '../types/domains';
    import { ActivityProgress } from './ActivityProgress';
    import { WeekSelector } from './WeekSelector';
    import { useWeekSelection } from '../hooks/useWeekSelection';
    import { DAYS } from '../constants/days';
    import { WeekDisplay } from './WeekDisplay';
    import { getDateOfWeek, getCurrentWeekDates, formatDate } from '../utils/dateUtils';
    import { ActivityForm } from './ActivityForm';
    import { ActivityContext } from '../context/ActivityContext';
    import { makeLinksClickable } from '../utils/linkUtils';
    import { DayBoxModal } from './DayBoxModal';

    interface WeeklyScheduleProps {
      activities: Activity[];
      onToggleReminder: (activityId: string, dayIndex: number) => void;
      onEditActivity: (id: string, updates: Partial<Activity>) => void;
      onDeleteActivity: (id: string) => void;
    }

    export function WeeklySchedule({
      activities,
      onToggleReminder,
      onEditActivity,
      onDeleteActivity,
    }: WeeklyScheduleProps) {
      const { selectedDate, weekNumber, year, changeWeek } = useWeekSelection();
      const [selectedDay, setSelectedDay] = useState<number | null>(null);
      const [showConfirmation, setShowConfirmation] = useState(false);
      const [activityToDelete, setActivityToDelete] = useState<{id: string, dayIndex: number | null} | null>(null);
      const [hoveredDay, setHoveredDay] = useState<number | null>(null);
      const { addActivity, updateActivity } = useContext(ActivityContext);
      const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
      const [dayBoxOpen, setDayBoxOpen] = useState<number | null>(null);
      const [showGoals, setShowGoals] = useState(false);
      const [searchTerm, setSearchTerm] = useState('');
      const [searchResults, setSearchResults] = useState<any[]>([]);
      const [searchActive, setSearchActive] = useState(false);
      const searchInputRef = useRef<HTMLInputElement>(null);

      const weekStartDate = useMemo(() => getDateOfWeek(weekNumber, year), [weekNumber, year]);
      const weekDates = useMemo(() => getCurrentWeekDates(weekStartDate), [weekStartDate]);

      const currentWeekActivities = useMemo(() => activities.filter(activity =>
        activity.weekNumber === weekNumber &&
        activity.year === year
      ), [activities, weekNumber, year]);

      const handleAddActivity = useCallback((activity: Omit<Activity, 'id' | 'createdAt' | 'domainId'>) => {
        if (selectedDay !== null) {
          addActivity({
            ...activity,
            selectedDays: [selectedDay],
            weekNumber,
            year
          });
          setSelectedDay(null);
        }
      }, [selectedDay, addActivity, weekNumber, year]);

      const handleEditActivity = useCallback((activity: Activity) => {
        setEditingActivity(activity);
      }, []);

      const renderActivity = useCallback((activity: Activity, dayIndex: number) => {
        const isCompleted = activity.completedDays && activity.completedDays[dayIndex];
        const domain = LIFE_DOMAINS.find(d => d.id === activity.domainId);
        const Icon = domain?.icon || Edit2;
        const savedGoals = localStorage.getItem('goals');
        const goals = savedGoals ? JSON.parse(savedGoals) : [];
        const goal = goals.find((goal: any) => goal.id === activity.goalId);
        return (
          <div
            id={`activity-${activity.id}-${dayIndex}`}
            className={`p-4 rounded-lg flex items-start justify-between group ${
              isCompleted
                ? 'bg-green-500/20 border-green-500/40'
                : `bg-${domain?.color}-100/10 border border-${domain?.color}-400/20`
            }`}
          >
            <div>
              <h3 className="text-base font-medium" dir="rtl">{activity.title}</h3>
              {activity.description && (
                <p className="text-sm opacity-70" dir="rtl" dangerouslySetInnerHTML={{ __html: makeLinksClickable(activity.description) }} />
              )}
              {activity.reminder && (
                <div className="flex items-center gap-1 mt-2 text-xs text-white/70">
                  <Bell size={14} />
                  <span>{activity.reminder.time}</span>
                </div>
              )}
              {activity.targetCount !== undefined && (
                <ActivityProgress activity={activity} onUpdate={(updates) => onEditActivity(activity.id, updates)} />
              )}
              {showGoals && goal && (
                <div className={`flex items-center gap-1 mt-2 text-xs text-white/70`}>
                  <Target size={12} />
                  <span>{goal.title}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEditActivity(activity.id, {
                  completedDays: {
                    ...activity.completedDays,
                    [dayIndex]: !isCompleted,
                  }
                })}
                className={`p-2 rounded-full ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Check size={18} />
              </button>
              <button
                onClick={() => handleEditActivity(activity)}
                className={`p-2 rounded-full bg-${domain?.color}-400/20 text-${domain?.color}-400 hover:bg-${domain?.color}-400/30 opacity-0 group-hover:opacity-100 transition-opacity`}
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => {
                  setActivityToDelete({id: activity.id, dayIndex});
                  setShowConfirmation(true);
                }}
                className="p-2 rounded-full bg-red-400/20 text-red-400 hover:bg-red-400/30 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        );
      }, [onEditActivity, showGoals, handleEditActivity]);

      const renderDayContent = useCallback((dayIndex: number) => {
        const currentDate = weekDates[dayIndex];
        const dateKey = currentDate.toISOString().split('T')[0];
        const fullDateKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              {currentWeekActivities
                .filter(activity => activity.selectedDays?.includes(dayIndex))
                .map((activity, index) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    {renderActivity(activity, dayIndex)}
                  </div>
                ))}
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => setDayBoxOpen(dayIndex)}
                className="text-white/70 hover:text-white transition-colors p-2 rounded-md bg-teal-400/10 hover:bg-teal-400/20 flex items-center justify-center"
              >
                <span className="animate-pulse">صندوق اليوم</span>
              </button>
            </div>
            {dayBoxOpen === dayIndex && (
              <DayBoxModal
                dateKey={fullDateKey}
                onClose={() => setDayBoxOpen(null)}
                weekNumber={weekNumber}
                year={year}
                date={currentDate}
              />
            )}
          </div>
        );
      }, [currentWeekActivities, renderActivity, weekNumber, year, weekDates, setDayBoxOpen]);

      const confirmDelete = useCallback(() => {
        if (activityToDelete) {
          const { id, dayIndex } = activityToDelete;
          if (dayIndex !== null) {
            onEditActivity(id, {
              completedDays: {
                ...activities.find(a => a.id === id)?.completedDays,
                [dayIndex]: false
              }
            });
          } else {
            onDeleteActivity(id);
          }
          setActivityToDelete(null);
          setShowConfirmation(false);
        }
      }, [activityToDelete, onEditActivity, onDeleteActivity, activities]);

      const cancelDelete = useCallback(() => {
        setActivityToDelete(null);
        setShowConfirmation(false);
      }, []);

      const handleSaveActivity = useCallback((updatedActivity: Activity) => {
        onEditActivity(editingActivity!.id, updatedActivity);
        setEditingActivity(null);
      }, [onEditActivity, editingActivity]);

      const toggleShowGoals = useCallback(() => {
        setShowGoals(!showGoals);
      }, [showGoals]);

      const calculateDayProgress = useCallback((dayIndex: number) => {
        const dayActivities = currentWeekActivities.filter(activity => activity.selectedDays?.includes(dayIndex));
        if (dayActivities.length === 0) return 0;

        let totalCount = 0;
        let completedCount = 0;

        dayActivities.forEach(activity => {
          totalCount += 1;
          if (activity.completedDays && activity.completedDays[dayIndex]) {
            completedCount += 1;
          }
        });

        return Math.round((completedCount / totalCount) * 100);
      }, [currentWeekActivities]);

      const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (term) {
          const results = activities.reduce((acc, activity) => {
            if (
              activity.title.toLowerCase().includes(term.toLowerCase()) ||
              (activity.description && activity.description.toLowerCase().includes(term.toLowerCase()))
            ) {
              activity.selectedDays.forEach(dayIndex => {
                acc.push({
                  activity,
                  dayIndex,
                  date: weekDates[dayIndex],
                  weekNumber: activity.weekNumber,
                  year: activity.year
                });
              });
            }
            return acc;
          }, [] as { activity: Activity, dayIndex: number, date: Date, weekNumber: number, year: number }[]);
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      };

      const handleSearchResultClick = (activity: Activity, dayIndex: number, weekNumber: number, year: number) => {
        if (weekNumber !== selectedDate.getFullYear() && year !== selectedDate.getFullYear()) {
          changeWeek(weekNumber, year);
        }
        const activityElement = document.getElementById(`activity-${activity.id}-${dayIndex}`);
        if (activityElement) {
          activityElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setSearchTerm('');
          setSearchResults([]);
        }
      };

      const handleSearchClick = () => {
        setSearchActive(true);
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      };

      const handleSearchBlur = () => {
        setTimeout(() => {
          setSearchActive(false);
        }, 100);
      };

      return (
        <div className="space-y-6" dir="rtl">
          <div className="flex items-center justify-center mb-2">
            <div className="relative w-full max-w-md">
              <div className="absolute top-1/2 left-2 transform -translate-y-1/2 text-white/50 z-10">
                <Search size={16} onClick={handleSearchClick} className="cursor-pointer" />
              </div>
              <input
                type="text"
                placeholder="بحث..."
                value={searchTerm}
                onChange={handleSearchChange}
                onBlur={handleSearchBlur}
                ref={searchInputRef}
                onClick={handleSearchClick}
                className={`bg-black/20 text-white rounded-lg px-3 py-1 border border-white/10 focus:border-white focus:ring-1 focus:ring-white text-sm md:text-base pl-8 w-full transition-all duration-300`}
                dir="rtl"
              />
              {searchTerm && (
                <div className="absolute top-full left-0 mt-1 bg-black/80 rounded-md shadow-lg max-h-48 overflow-y-auto z-50 w-full">
                  {searchResults.length > 0 ? (
                    searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearchResultClick(result.activity, result.dayIndex, result.weekNumber, result.year)}
                        className="block w-full text-white text-right p-2 hover:bg-white/10 transition-colors flex items-center justify-between"
                      >
                        <span>{result.activity.title} - {DAYS[result.dayIndex]} - {formatDate(result.date)} - الأسبوع {result.weekNumber} - {result.year}</span>
                        {result.completed ? <Check size={16} className="text-green-400" /> : <X size={16} className="text-red-400" />}
                      </button>
                    ))
                  ) : (
                    <div className="text-white p-2">لا توجد نتائج</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center mb-2">
            <WeekSelector
              currentDate={selectedDate}
              onWeekChange={changeWeek}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {DAYS.map((day, index) => (
                    <th key={day} className="p-1 text-white border border-white/20 text-center">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm">{day}</span>
                          <button
                            onClick={() => setSelectedDay(index)}
                            className="p-1 rounded-full hover:bg-white/10 text-white transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <span className="text-xs text-white/70">
                          {formatDate(weekDates[index])}
                        </span>
                        <div className="relative w-full h-2 mt-1">
                          <div className="bg-black/30 rounded-full overflow-hidden w-full h-full">
                            <div
                              className="absolute top-0 left-0 h-full transition-all duration-500 ease-in-out"
                              style={{
                                width: `${calculateDayProgress(index)}%`,
                                background: calculateDayProgress(index) === 100
                                  ? 'rgba(0, 128, 0, 0.7)'
                                  : 'rgba(0, 128, 0, 0.4)',
                                transform: `scaleX(${calculateDayProgress(index) / 100})`,
                                transformOrigin: 'left',
                                borderRadius: calculateDayProgress(index) === 100 ? '10px' : '10px 0 0 10px',
                              }}
                            />
                          </div>
                          <span 
                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xs font-bold z-10 flex items-center justify-center w-full h-full"
                            style={{
                              filter: `blur(0.5px)`,
                              WebkitFilter: `blur(0.5px)`,
                              textShadow: `0 0 3px black`,
                            }}
                          >
                            {calculateDayProgress(index)}%
                          </span>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {DAYS.map((_, dayIndex) => (
                    <td
                      key={dayIndex}
                      className={`p-3 border border-white/20 align-top ${hoveredDay !== null && hoveredDay !== dayIndex ? 'opacity-50 blur-sm' : ''}`}
                      onMouseEnter={() => setHoveredDay(dayIndex)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      {selectedDay === dayIndex && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                          <div className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 p-6 rounded-lg w-full max-w-2xl relative">
                            <button
                              onClick={() => setSelectedDay(null)}
                              className="absolute top-4 right-4 text-white/70 hover:text-white"
                            >
                              <X size={24} />
                            </button>
                            <h2 className="text-2xl font-bold text-white mb-4 text-right">
                              إضافة نشاط ليوم {DAYS[dayIndex]}
                            </h2>
                            <ActivityForm
                              onSubmit={handleAddActivity}
                              weekNumber={weekNumber}
                              year={year}
                              initialDomainId={null}
                              hideDomainsSelect={false}
                              selectedDay={selectedDay}
                            />
                          </div>
                        </div>
                      )}
                      {renderDayContent(dayIndex)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex justify-center mt-2">
            <button
              onClick={toggleShowGoals}
              className="p-1 rounded-full hover:bg-white/10 text-white transition-colors opacity-50"
            >
              {showGoals ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {editingActivity && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 p-6 rounded-lg w-full max-w-2xl relative">
                <button
                  onClick={() => setEditingActivity(null)}
                  className="absolute top-4 right-4 text-white/70 hover:text-white"
                >
                  <X size={24} />
                </button>
                <h2 className="text-2xl font-bold text-white mb-4 text-right">
                  تعديل النشاط
                </h2>
                <ActivityForm
                  onSubmit={(updatedActivity) => {
                    handleSaveActivity({ ...editingActivity, ...updatedActivity });
                  }}
                  initialDomainId={editingActivity.domainId}
                  weekNumber={editingActivity.weekNumber}
                  year={editingActivity.year}
                  activity={editingActivity}
                />
              </div>
            </div>
          )}
          {showConfirmation && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg text-black">
                <p className="mb-4">هل أنت متأكد من أنك تريد إلغاء هذا النشاط؟</p>
                <div className="flex justify-end gap-4">
                  <button onClick={confirmDelete} className="bg-green-500 text-white p-2 rounded">
                    نعم
                  </button>
                  <button onClick={cancelDelete} className="bg-red-500 text-white p-2 rounded">
                    لا
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
