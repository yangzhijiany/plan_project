import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from './UserContext'
import axios from 'axios'
import { API_BASE_URL } from './config'

function TodayPage() {
  const { user } = useUser()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState(null)

  useEffect(() => {
    if (user) {
      fetchTodayPlans()
    }
  }, [user])

  const fetchTodayPlans = async () => {
    if (!user) {
      setError('Please create or select a user first')
      return
    }

    try {
      setLoading(true)
      // Get user timezone offset (hours)
      // getTimezoneOffset() returns minutes and is inverted (UTC+8 returns -480)
      // So we need to divide by -60 to convert to hours
      const timezoneOffset = -new Date().getTimezoneOffset() / 60
      const response = await axios.get(
        `${API_BASE_URL}/today?user_id=${user.user_id}&timezone_offset=${timezoneOffset}`
      )
      setPlans(response.data)
      setError('')
    } catch (err) {
      setError('Failed to load today\'s plans. Please check if the backend service is running')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleComplete = async (itemId) => {
    if (!user) return
    setToggling(itemId)
    try {
      const response = await axios.put(`${API_BASE_URL}/daily-items/${itemId}/toggle-complete?user_id=${user.user_id}`)
      
      // Update local state
      setPlans(plans.map(plan => 
        plan.id === itemId 
          ? { ...plan, is_completed: response.data.is_completed }
          : plan
      ))
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update completion status')
      console.error('Error:', err)
    } finally {
      setToggling(null)
    }
  }

  const getImportanceColor = (importance) => {
    const colors = {
      'high': 'border-red-500 bg-red-50',
      'medium': 'border-amber-500 bg-amber-50',
      'low': 'border-green-500 bg-green-50',
    }
    return colors[importance] || 'border-gray-300 bg-gray-50'
  }

  const getImportanceText = (importance) => {
    const texts = {
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low',
    }
    return texts[importance] || 'Unknown'
  }

  const completedCount = plans.filter(p => p.is_completed).length
  const totalCount = plans.length
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (loading) {
    return (
      <div className="px-4 py-8 sm:px-0">
        <div className="max-w-4xl mx-auto">
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-2xl rounded-3xl p-8 lg:p-10 border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Today's Plan</h2>
              <p className="text-sm text-gray-600 mt-2 font-medium">
                {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchTodayPlans}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-2xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-semibold"
              >
                Refresh
              </button>
              <Link
                to="/create"
                className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-2xl hover:from-gray-700 hover:to-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-semibold"
              >
                Create Task
              </Link>
            </div>
          </div>

          {/* Progress Statistics */}
          {totalCount > 0 && (
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-base font-bold text-blue-900">Completion Progress</span>
                <span className="text-base font-bold text-blue-900 bg-white px-4 py-1 rounded-full shadow-sm">{completedCount} / {totalCount}</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-4 shadow-inner">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-500 shadow-md"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
              <p className="text-sm text-blue-700 mt-3 font-semibold">Completion Rate: {completionRate}%</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-5 bg-red-50 border-2 border-red-200 rounded-2xl shadow-sm">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          {plans.length === 0 && !error && (
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl text-center shadow-sm">
              <p className="text-sm text-blue-800 font-medium">
                No plans for today. Go to <Link to="/create" className="underline font-semibold hover:text-blue-900">Create Task</Link> to create your first task!
              </p>
            </div>
          )}

          {/* Task List */}
          {plans.length > 0 && (
            <div className="space-y-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`border-l-4 rounded-2xl p-6 transition-all duration-300 shadow-md hover:shadow-lg ${
                    plan.is_completed 
                      ? 'bg-gray-50 opacity-75 border-gray-300' 
                      : getImportanceColor(plan.importance)
                  } transform hover:-translate-y-1`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className={`text-lg font-bold text-gray-900 ${plan.is_completed ? 'line-through' : ''}`}>
                          {plan.is_completed && <span className="mr-2">✓</span>} {plan.task_name}
                        </h3>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
                          plan.importance === 'high' ? 'bg-red-100 text-red-800' :
                          plan.importance === 'medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {getImportanceText(plan.importance)} Priority
                        </span>
                      </div>
                      {plan.subtask_id !== 0 && (
                        <p className="text-sm text-gray-600 mb-3 font-semibold">{plan.subtask_name}</p>
                      )}
                      <div className="flex items-center space-x-3 text-xs text-gray-500 font-medium">
                        <span className="bg-white px-3 py-1 rounded-full shadow-sm">⏱️ {plan.allocated_hours} hours</span>
                        <span className="bg-white px-3 py-1 rounded-full shadow-sm">📅 {plan.date}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => handleToggleComplete(plan.id)}
                        disabled={toggling === plan.id}
                        className={`
                          relative inline-flex h-10 w-20 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105
                          ${plan.is_completed
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 focus:ring-green-300'
                            : 'bg-gradient-to-r from-gray-300 to-gray-400 focus:ring-gray-300'
                          }
                        `}
                      >
                        <span
                          className={`
                            inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-all duration-300 flex items-center justify-center
                            ${plan.is_completed ? 'translate-x-12' : 'translate-x-1'}
                          `}
                        >
                          {plan.is_completed ? (
                            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                </div>
              ))}
            </div>
          )}

          {/* Completed Tasks Statistics */}
          {completedCount > 0 && (
            <div className="mt-8 p-6 bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-2 border-green-200 rounded-3xl shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-md">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-green-800">
                    🎉 Congratulations! You've completed {completedCount} task{completedCount > 1 ? 's' : ''} today!
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    Keep it up, you're doing great!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TodayPage

