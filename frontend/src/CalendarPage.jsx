import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from './UserContext'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import axios from 'axios'
import { API_BASE_URL } from './config'

function CalendarPage() {
  const { user } = useUser()
  const [events, setEvents] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editHours, setEditHours] = useState(0)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [deleteFuture, setDeleteFuture] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskHours, setNewTaskHours] = useState(2)
  const [newTaskImportance, setNewTaskImportance] = useState('medium')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (user) {
      fetchCalendarData()
    }
  }, [user])

  const fetchCalendarData = async () => {
    if (!user) {
      setError('Please create or select a user first')
      return
    }

    try {
      setLoading(true)
      // Get user timezone offset (hours)
      const timezoneOffset = -new Date().getTimezoneOffset() / 60
      const response = await axios.get(
        `${API_BASE_URL}/calendar?user_id=${user.user_id}&timezone_offset=${timezoneOffset}`
      )
      
      setItems(response.data)
      
      // Convert data to FullCalendar event format
      const calendarEvents = response.data.map(item => {
        // Long-term tasks may not have subtasks (subtask_id === 0), only show task name
        const displayName = item.subtask_id === 0 || !item.subtask_id
          ? `${item.task_name} (${item.allocated_hours}h)`
          : `${item.task_name}: ${item.subtask_name} (${item.allocated_hours}h)`
        
        return {
          id: item.id.toString(),
          title: displayName,
          date: item.date,
          backgroundColor: getColorForImportance(item.importance),
          borderColor: getColorForImportance(item.importance),
          extendedProps: {
            item: item
          }
        }
      })
      
      setEvents(calendarEvents)
      setError('')
    } catch (err) {
      setError('Failed to load plans. Please check if the backend service is running')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Generate color based on importance
  const getColorForImportance = (importance) => {
    const colors = {
      'high': '#ef4444',    // red
      'medium': '#f59e0b',  // amber
      'low': '#10b981',     // green
    }
    return colors[importance] || '#3b82f6' // blue as default
  }

  const handleEventClick = (clickInfo) => {
    const item = clickInfo.event.extendedProps.item
    setSelectedItem(item)
    setEditHours(item.allocated_hours)
    setDeleteFuture(false) // Reset checkbox
    setShowEditModal(true)
  }

  const handleDeleteItem = async () => {
    if (!selectedItem || !user) return
    
    try {
      const url = `${API_BASE_URL}/daily-items/${selectedItem.id}?user_id=${user.user_id}&delete_future=${deleteFuture}`
      await axios.delete(url)
      setShowEditModal(false)
      setSelectedItem(null)
      setDeleteFuture(false) // Reset checkbox
      fetchCalendarData() // Refresh data
      setError('') // Clear error message
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete task')
      console.error('Error:', err)
    }
  }

  const handleUpdateHours = async () => {
    if (!selectedItem || !user) return
    
    try {
      await axios.put(`${API_BASE_URL}/daily-items/${selectedItem.id}?user_id=${user.user_id}`, {
        allocated_hours: parseFloat(editHours)
      })
      setShowEditModal(false)
      setSelectedItem(null)
      fetchCalendarData() // Refresh data
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update time')
      console.error('Error:', err)
    }
  }

  const handleClearCalendar = async () => {
    if (!user) return
    setClearing(true)
    try {
      await axios.delete(`${API_BASE_URL}/calendar/clear?user_id=${user.user_id}`)
      setShowClearConfirm(false)
      setError('')
      fetchCalendarData() // Refresh data
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to clear calendar')
      console.error('Error:', err)
    } finally {
      setClearing(false)
    }
  }

  const handleDateClick = (arg) => {
    // When clicking a date, open the modal to create a task item
    setSelectedDate(arg.dateStr)
    setNewTaskName('')
    setNewTaskDescription('')
    setNewTaskHours(2)
    setNewTaskImportance('medium')
    setShowCreateModal(true)
  }

  const handleCreateCustomTask = async () => {
    if (!user) {
      setError('Please create or select a user first')
      return
    }

    if (!newTaskName.trim()) {
      setError('Please enter task name')
      return
    }

    if (!selectedDate) {
      setError('Please select a date')
      return
    }

    const hours = parseFloat(newTaskHours)
    if (isNaN(hours) || hours <= 0) {
      setError('Please enter a valid time (a number greater than 0)')
      return
    }

    setCreating(true)
    setError('')

    try {
      await axios.post(`${API_BASE_URL}/custom-task-item`, {
        task_name: newTaskName.trim(),
        description: newTaskDescription.trim() || null,
        date: selectedDate,
        allocated_hours: hours,
        importance: newTaskImportance,
        user_id: user.user_id
      })

      setShowCreateModal(false)
      setNewTaskName('')
      setNewTaskDescription('')
      setSelectedDate('')
      setNewTaskHours(2)
      fetchCalendarData() // Refresh data
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create task')
      console.error('Error:', err)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-8 sm:px-0">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-2xl rounded-3xl p-12 text-center border border-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-8 sm:px-0">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-2xl rounded-3xl p-8 lg:p-10 border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Calendar View</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchCalendarData}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-2xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-semibold"
              >
                Refresh
              </button>
              <button
                onClick={() => {
                  // Set date to today
                  const today = new Date().toISOString().split('T')[0]
                  setSelectedDate(today)
                  setNewTaskName('')
                  setNewTaskDescription('')
                  setNewTaskHours(2)
                  setNewTaskImportance('medium')
                  setShowCreateModal(true)
                }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-2xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-semibold"
              >
                Create Task
              </button>
              <Link
                to="/create"
                className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-2xl hover:from-gray-700 hover:to-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-semibold"
              >
                AI Create Task
              </Link>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-2xl hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-4 focus:ring-red-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-semibold"
              >
                Clear Calendar
              </button>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm border-2 border-gray-200">
              <div className="w-4 h-4 bg-red-500 rounded-full mr-2 shadow-sm"></div>
              <span className="font-semibold text-gray-700">High Priority</span>
            </div>
            <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm border-2 border-gray-200">
              <div className="w-4 h-4 bg-amber-500 rounded-full mr-2 shadow-sm"></div>
              <span className="font-semibold text-gray-700">Medium Priority</span>
            </div>
            <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm border-2 border-gray-200">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2 shadow-sm"></div>
              <span className="font-semibold text-gray-700">Low Priority</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-5 bg-red-50 border-2 border-red-200 rounded-2xl shadow-sm">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          {events.length === 0 && !error && (
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl shadow-sm">
              <p className="text-sm text-blue-800 font-semibold">
                No plans yet. You can:
              </p>
              <ul className="text-sm text-blue-700 mt-2 list-disc list-inside space-y-1">
                <li>Click the "Create Task" button in the top right to quickly create a custom task</li>
                <li>Click on a date in the calendar to directly create a task for that date</li>
                <li>Click "AI Create Task" to use AI to generate a task plan</li>
              </ul>
            </div>
          )}

          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            events={events}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,dayGridWeek'
            }}
            locales={[]}
            locale="en"
            height="auto"
            eventDisplay="block"
            eventTextColor="#ffffff"
          />

          {/* Edit/Delete Modal */}
          {showEditModal && selectedItem && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 transform transition-all">
                <h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Task Details</h3>
                
                <div className="space-y-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Task</p>
                    <p className="text-base font-bold text-gray-900">{selectedItem.task_name}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Subtask</p>
                    <p className="text-base font-bold text-gray-900">{selectedItem.subtask_name}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Date</p>
                    <p className="text-base font-bold text-gray-900">{selectedItem.date}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Priority</p>
                    <p className="text-base font-bold text-gray-900 capitalize">{selectedItem.importance === 'high' ? 'High' : selectedItem.importance === 'medium' ? 'Medium' : 'Low'}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Allocated Time (hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editHours}
                    onChange={(e) => setEditHours(e.target.value)}
                    className="w-full px-5 py-3 border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-gray-900"
                  />
                </div>

                {/* Delete Option */}
                <div className="mb-6 p-5 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className="block text-sm font-bold text-red-800 mb-1">
                        Delete All Future Tasks with Same Name
                      </span>
                      <p className="text-xs text-red-600">
                        When checked, will delete all future task items with the same name starting from the current date
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteFuture(!deleteFuture)}
                      className={`
                        relative inline-flex h-11 w-20 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-50 shadow-md hover:shadow-lg transform hover:scale-105 ml-4
                        ${deleteFuture
                          ? 'bg-gradient-to-r from-red-600 to-red-700 focus:ring-red-300'
                          : 'bg-gradient-to-r from-gray-300 to-gray-400 focus:ring-gray-300'
                        }
                      `}
                    >
                      <span
                        className={`
                          inline-block h-9 w-9 transform rounded-full bg-white shadow-lg transition-all duration-300 flex items-center justify-center
                          ${deleteFuture ? 'translate-x-10' : 'translate-x-1'}
                        `}
                      >
                        {deleteFuture ? (
                          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      setSelectedItem(null)
                      setDeleteFuture(false)
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-2xl hover:bg-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-semibold"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDeleteItem}
                    className={`px-6 py-3 rounded-2xl focus:outline-none focus:ring-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-semibold ${
                      deleteFuture
                        ? 'bg-gradient-to-r from-red-700 to-red-800 text-white hover:from-red-800 hover:to-red-900 focus:ring-red-300'
                        : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 focus:ring-red-300'
                    }`}
                  >
                    {deleteFuture ? '删除未来所有' : '删除此项'}
                  </button>
                  <button
                    onClick={handleUpdateHours}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-semibold"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 清空日历确认模态框 */}
          {showClearConfirm && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 transform transition-all">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold mb-2 bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">确认清空日历</h3>
                  <p className="text-gray-700 font-semibold">
                    此操作将删除所有日历中的计划项，此操作不可恢复。确定要继续吗？
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    disabled={clearing}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-2xl hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-semibold"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleClearCalendar}
                    disabled={clearing}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl hover:from-red-700 hover:to-red-800 disabled:from-red-400 disabled:to-red-500 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-red-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-semibold"
                  >
                    {clearing ? '清空中...' : '确认清空'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 创建自定义任务项模态框 */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 transform transition-all">
                <h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">创建自定义任务</h3>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      任务名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      placeholder="例如：完成作业"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      日期 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      时间（小时） <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={newTaskHours}
                      onChange={(e) => setNewTaskHours(e.target.value)}
                      placeholder="例如：2"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">重要性（可选）</label>
                    <select
                      value={newTaskImportance}
                      onChange={(e) => setNewTaskImportance(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">描述（可选）</label>
                    <textarea
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="任务描述..."
                      rows={2}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-xl">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setNewTaskName('')
                      setNewTaskDescription('')
                      setSelectedDate('')
                      setNewTaskHours(2)
                      setNewTaskImportance('medium')
                      setError('')
                    }}
                    disabled={creating}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-2xl hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-semibold"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateCustomTask}
                    disabled={creating || !newTaskName.trim() || !selectedDate}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-indigo-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-semibold"
                  >
                    {creating ? '创建中...' : '创建'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CalendarPage
