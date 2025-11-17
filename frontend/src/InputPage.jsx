import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from './UserContext'
import axios from 'axios'
import { API_BASE_URL } from './config'

function InputPage() {
  const { user } = useUser()
  const [taskName, setTaskName] = useState('')
  const [description, setDescription] = useState('')
  const [importance, setImportance] = useState('medium')
  const [isLongTerm, setIsLongTerm] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [maxSubtasks, setMaxSubtasks] = useState('')
  const [loading, setLoading] = useState(false)
  const [task, setTask] = useState(null)
  const [subtasks, setSubtasks] = useState([])
  const [generatingSubtasks, setGeneratingSubtasks] = useState(false)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [error, setError] = useState('')

  const handleCreateTask = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTask(null)
    setSubtasks([])

    if (!user) {
      setError('Please create or select a user first')
      return
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/tasks`, {
        task_name: taskName,
        description: description,
        importance: importance,
        is_long_term: isLongTerm,
        start_date: startDate || null,
        deadline: isLongTerm ? null : deadline,
        user_id: user.user_id
      })

      const newTask = response.data
      setTask(newTask)
      
      // If not a long-term task, automatically generate subtasks
      if (!isLongTerm) {
        setLoading(true)
        try {
          const requestBody = {
            description: description,
            deadline: deadline,
            is_long_term: false
          }
          // If max subtasks is specified, add it to the request
          if (maxSubtasks && maxSubtasks.trim() !== '') {
            const maxSubtasksNum = parseInt(maxSubtasks, 10)
            if (!isNaN(maxSubtasksNum) && maxSubtasksNum > 0) {
              requestBody.max_subtasks = maxSubtasksNum
            }
          }
          
          const subtasksResponse = await axios.post(`${API_BASE_URL}/tasks/${newTask.id}/generate-subtasks?user_id=${user.user_id}`, requestBody)
          
          // Update task info to include newly created subtasks
          const taskResponse = await axios.get(`${API_BASE_URL}/tasks/${newTask.id}?user_id=${user.user_id}`)
          setTask(taskResponse.data)
          setSubtasks(taskResponse.data.subtasks)
        } catch (err) {
          setError(err.response?.data?.detail || 'Failed to generate subtasks')
          console.error('Error:', err)
        } finally {
          setLoading(false)
        }
      } else {
        // Long-term tasks directly generate plan
        setLoading(true)
        try {
          await axios.post(`${API_BASE_URL}/tasks/${newTask.id}/generate-plan?user_id=${user.user_id}`)
          setError('')
        } catch (err) {
          setError(err.response?.data?.detail || 'Failed to generate plan')
          console.error('Error:', err)
        } finally {
          setLoading(false)
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create task. Please check network connection and API configuration')
      console.error('Error:', err)
      setLoading(false)
    }
  }

  const handleGenerateSubtasks = async () => {
    if (!task || !user) return
    
    setGeneratingSubtasks(true)
    setError('')

    try {
      const requestBody = {
        description: description,
        deadline: isLongTerm ? null : deadline,
        is_long_term: isLongTerm
      }
      // If max subtasks is specified, add it to the request
      if (maxSubtasks && maxSubtasks.trim() !== '') {
        const maxSubtasksNum = parseInt(maxSubtasks, 10)
        if (!isNaN(maxSubtasksNum) && maxSubtasksNum > 0) {
          requestBody.max_subtasks = maxSubtasksNum
        }
      }
      
      const response = await axios.post(`${API_BASE_URL}/tasks/${task.id}/generate-subtasks?user_id=${user.user_id}`, requestBody)

      // Update task info to include newly created subtasks
      const taskResponse = await axios.get(`${API_BASE_URL}/tasks/${task.id}?user_id=${user.user_id}`)
      setTask(taskResponse.data)
      setSubtasks(taskResponse.data.subtasks)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate subtasks')
      console.error('Error:', err)
    } finally {
      setGeneratingSubtasks(false)
    }
  }

  const handleUpdateSubtask = async (subtaskId, updates) => {
    try {
      // Build update object, only include provided fields
      const updateData = {}
      if (updates.subtask_name !== undefined) {
        updateData.subtask_name = updates.subtask_name
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description
      }
      if (updates.estimated_hours !== undefined) {
        const hours = typeof updates.estimated_hours === 'number' 
          ? updates.estimated_hours 
          : parseFloat(updates.estimated_hours)
        
        if (isNaN(hours) || hours < 0) {
          setError('Please enter a valid time (a number greater than or equal to 0)')
          // Restore original value
          const taskResponse = await axios.get(`${API_BASE_URL}/tasks/${task.id}`)
          setTask(taskResponse.data)
          return
        }
        updateData.estimated_hours = hours
      }
      
      const response = await axios.put(`${API_BASE_URL}/subtasks/${subtaskId}`, updateData, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      // Update task info (get latest data from server)
      const taskResponse = await axios.get(`${API_BASE_URL}/tasks/${task.id}`)
      setTask(taskResponse.data)
      setSubtasks(taskResponse.data.subtasks)
      setError('') // Clear error
    } catch (err) {
      console.error('Error updating subtask:', err.response?.data || err)
      
      // Try to parse error message
      let errorMsg = 'Failed to update subtask'
      if (err.response?.data) {
        if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail
        } else if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map(d => d.msg || JSON.stringify(d)).join(', ')
        } else if (err.response.data.detail) {
          errorMsg = JSON.stringify(err.response.data.detail)
        }
      }
      
      setError(errorMsg)
      
      // Restore original value
      try {
        const taskResponse = await axios.get(`${API_BASE_URL}/tasks/${task.id}`)
        setTask(taskResponse.data)
        setSubtasks(taskResponse.data.subtasks)
      } catch (fetchErr) {
        console.error('Failed to fetch task:', fetchErr)
      }
    }
  }
  
  // Backward compatibility: keep the original function for updating time
  const handleUpdateSubtaskTime = async (subtaskId, newHours) => {
    await handleUpdateSubtask(subtaskId, { estimated_hours: newHours })
  }

  const handleGeneratePlan = async () => {
    if (!task || !user) return
    
    setGeneratingPlan(true)
    setError('')

    try {
      await axios.post(`${API_BASE_URL}/tasks/${task.id}/generate-plan?user_id=${user.user_id}`)
      setError('')
      alert('Plan generated successfully! Go to calendar view to see it.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate plan')
      console.error('Error:', err)
    } finally {
      setGeneratingPlan(false)
    }
  }

  return (
    <div className="px-4 py-8 sm:px-0">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-2xl rounded-3xl p-8 lg:p-10 border border-gray-100">
          <div className="mb-8">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">Create New Task</h2>
            <p className="text-gray-600 font-medium">Describe your task in natural language, and AI will automatically generate a plan</p>
          </div>
          
          <form onSubmit={handleCreateTask} className="space-y-6">
            <div>
              <label htmlFor="taskName" className="block text-sm font-semibold text-gray-700 mb-3">
                Task Name
              </label>
              <input
                type="text"
                id="taskName"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                required
                className="w-full px-5 py-3 border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-gray-900 placeholder-gray-400"
                placeholder="e.g., CS421 Midterm3"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-3">
                Task Description (Natural Language)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="w-full px-5 py-3 border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-gray-900 placeholder-gray-400 resize-none"
                placeholder="e.g., To complete CS421 midterm3 review, I need to review PPT, review WA, review MP, and do practice quiz"
              />
            </div>

            <div>
              <label htmlFor="importance" className="block text-sm font-semibold text-gray-700 mb-3">
                Task Importance
              </label>
              <select
                id="importance"
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
                className="w-full px-5 py-3 border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-gray-900 bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
              <label htmlFor="isLongTerm" className="flex-1 cursor-pointer">
                <span className="block text-sm font-bold text-gray-900 mb-1">
                  Long-term Task
                </span>
                <span className="block text-xs text-gray-600">
                  No deadline, e.g., daily LeetCode practice
                </span>
              </label>
              <button
                type="button"
                onClick={() => setIsLongTerm(!isLongTerm)}
                className={`
                  relative inline-flex h-11 w-20 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-50 shadow-md hover:shadow-lg transform hover:scale-105 ml-4
                  ${isLongTerm
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 focus:ring-indigo-300'
                    : 'bg-gradient-to-r from-gray-300 to-gray-400 focus:ring-gray-300'
                  }
                `}
              >
                <span
                  className={`
                    inline-block h-9 w-9 transform rounded-full bg-white shadow-lg transition-all duration-300 flex items-center justify-center
                    ${isLongTerm ? 'translate-x-10' : 'translate-x-1'}
                  `}
                >
                  {isLongTerm ? (
                    <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </span>
              </button>
              <input
                type="checkbox"
                id="isLongTerm"
                checked={isLongTerm}
                onChange={(e) => setIsLongTerm(e.target.checked)}
                className="hidden"
              />
            </div>

            {/* Start Date (Optional, applies to all tasks) */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-semibold text-gray-700 mb-3">
                Start Date (Optional)
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-5 py-3 border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-gray-900"
              />
              <p className="mt-2 text-xs text-gray-500">
                If not filled, it will start from today. If filled, the plan will start from the specified date.
              </p>
            </div>

            {!isLongTerm && (
              <>
                <div>
                  <label htmlFor="deadline" className="block text-sm font-semibold text-gray-700 mb-3">
                    Deadline
                  </label>
                  <input
                    type="date"
                    id="deadline"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required={!isLongTerm}
                    min={startDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-5 py-3 border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-gray-900"
                  />
                </div>
                
                <div>
                  <label htmlFor="maxSubtasks" className="block text-sm font-semibold text-gray-700 mb-3">
                    Max Subtasks (Optional)
                  </label>
                  <input
                    type="number"
                    id="maxSubtasks"
                    value={maxSubtasks}
                    onChange={(e) => setMaxSubtasks(e.target.value)}
                    min="1"
                    placeholder="e.g., 1 (only generate 1 subtask)"
                    className="w-full px-5 py-3 border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-gray-900 placeholder-gray-400"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    If not filled, AI will automatically decide the number of subtasks based on task complexity. If filled, AI will generate at most the specified number of subtasks.
                  </p>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-2xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-5 bg-red-50 border-2 border-red-200 rounded-2xl shadow-sm">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          {task && (
            <div className="mt-8 space-y-4">
              <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl shadow-sm">
                <p className="text-sm text-green-800 font-semibold">
                  ✅ Task created successfully! Task ID: {task.id}
                  {task.is_long_term ? ' (Long-term task, plan automatically generated)' : ' (Subtasks automatically generated)'}
                </p>
              </div>

              {task.is_long_term ? (
                <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-sm">
                  <p className="text-sm text-blue-800 font-semibold">
                    📅 Plan for long-term task has been automatically generated! Go to <Link to="/" className="underline font-bold hover:text-blue-900">Today's Plan</Link> or <Link to="/calendar" className="underline font-bold hover:text-blue-900">Calendar View</Link> to view.
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Subtask List</h3>
                  {task.subtasks.length === 0 ? (
                    <div className="p-5 bg-yellow-50 border-2 border-yellow-200 rounded-2xl shadow-sm">
                      <p className="text-sm text-yellow-800 font-semibold">Generating subtasks...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        {task.subtasks.map((subtask) => {
                          // Get latest value from task.subtasks, not from subtasks state
                          const currentSubtask = task.subtasks.find(st => st.id === subtask.id) || subtask
                          return (
                            <div key={subtask.id} className="p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                              <div className="space-y-3">
                                {/* Subtask Name */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Subtask Name</label>
                                  <input
                                    type="text"
                                    value={currentSubtask.subtask_name || ''}
                                    onChange={(e) => {
                                      setTask({
                                        ...task,
                                        subtasks: task.subtasks.map(st => 
                                          st.id === subtask.id 
                                            ? { ...st, subtask_name: e.target.value }
                                            : st
                                        )
                                      })
                                    }}
                                    onBlur={async (e) => {
                                      const newName = e.target.value.trim()
                                      if (newName && newName !== currentSubtask.subtask_name) {
                                        await handleUpdateSubtask(subtask.id, { subtask_name: newName })
                                      } else if (!newName) {
                                        // If name is empty, restore original value
                                        setTask({
                                          ...task,
                                          subtasks: task.subtasks.map(st => 
                                            st.id === subtask.id 
                                              ? { ...st, subtask_name: currentSubtask.subtask_name }
                                              : st
                                          )
                                        })
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.target.blur()
                                      }
                                    }}
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                                  />
                                </div>
                                
                                {/* Subtask Description */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Description (Optional)</label>
                                  <textarea
                                    value={currentSubtask.description || ''}
                                    onChange={(e) => {
                                      setTask({
                                        ...task,
                                        subtasks: task.subtasks.map(st => 
                                          st.id === subtask.id 
                                            ? { ...st, description: e.target.value }
                                            : st
                                        )
                                      })
                                    }}
                                    onBlur={async (e) => {
                                      const newDescription = e.target.value.trim()
                                      if (newDescription !== (currentSubtask.description || '')) {
                                        await handleUpdateSubtask(subtask.id, { description: newDescription || null })
                                      }
                                    }}
                                    rows={2}
                                    placeholder="Add subtask description..."
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 resize-none"
                                  />
                                </div>
                                
                                {/* Estimated Time */}
                                <div className="flex items-center justify-between">
                                  <label className="text-sm font-semibold text-gray-700">Estimated Time (hours)</label>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={currentSubtask.estimated_hours}
                                    onChange={(e) => {
                                      const inputValue = e.target.value
                                      if (inputValue === '') {
                                        return
                                      }
                                      const newValue = parseFloat(inputValue)
                                      if (!isNaN(newValue) && newValue >= 0) {
                                        setTask({
                                          ...task,
                                          subtasks: task.subtasks.map(st => 
                                            st.id === subtask.id 
                                              ? { ...st, estimated_hours: newValue }
                                              : st
                                          )
                                        })
                                      }
                                    }}
                                    onBlur={async (e) => {
                                      const inputValue = e.target.value
                                      let newValue
                                      
                                      if (inputValue === '' || inputValue === null || inputValue === undefined) {
                                        newValue = currentSubtask.estimated_hours
                                        setTask({
                                          ...task,
                                          subtasks: task.subtasks.map(st => 
                                            st.id === subtask.id 
                                              ? { ...st, estimated_hours: currentSubtask.estimated_hours }
                                              : st
                                          )
                                        })
                                      } else {
                                        newValue = parseFloat(inputValue)
                                        if (isNaN(newValue) || newValue < 0) {
                                          setTask({
                                            ...task,
                                            subtasks: task.subtasks.map(st => 
                                              st.id === subtask.id 
                                                ? { ...st, estimated_hours: currentSubtask.estimated_hours }
                                                : st
                                            )
                                          })
                                          return
                                        }
                                      }
                                      
                                      if (newValue !== currentSubtask.estimated_hours) {
                                        await handleUpdateSubtask(subtask.id, { estimated_hours: newValue })
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.target.blur()
                                      }
                                    }}
                                    className="w-24 px-3 py-2 border-2 border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      <button
                        onClick={handleGeneratePlan}
                        disabled={generatingPlan}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-2xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                      >
                        {generatingPlan ? 'Generating Plan...' : 'Generate Daily Plan'}
                      </button>
                      
                      <div className="text-sm text-gray-600 p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
                        <p className="font-semibold">✅ Subtasks have been generated! You can modify the time, then click "Generate Daily Plan". Go to <Link to="/" className="text-indigo-600 hover:underline font-bold">Today's Plan</Link> to view.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InputPage
