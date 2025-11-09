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
      setError('请先创建或选择用户')
      return
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/tasks`, {
        task_name: taskName,
        description: description,
        importance: importance,
        is_long_term: isLongTerm,
        deadline: isLongTerm ? null : deadline,
        user_id: user.user_id
      })

      const newTask = response.data
      setTask(newTask)
      
      // 如果不是长期任务，自动生成子任务
      if (!isLongTerm) {
        setLoading(true)
        try {
          const requestBody = {
            description: description,
            deadline: deadline,
            is_long_term: false
          }
          // 如果指定了子任务数量上限，添加到请求中
          if (maxSubtasks && maxSubtasks.trim() !== '') {
            const maxSubtasksNum = parseInt(maxSubtasks, 10)
            if (!isNaN(maxSubtasksNum) && maxSubtasksNum > 0) {
              requestBody.max_subtasks = maxSubtasksNum
            }
          }
          
          const subtasksResponse = await axios.post(`${API_BASE_URL}/tasks/${newTask.id}/generate-subtasks?user_id=${user.user_id}`, requestBody)
          
          // 更新任务信息以包含新创建的子任务
          const taskResponse = await axios.get(`${API_BASE_URL}/tasks/${newTask.id}?user_id=${user.user_id}`)
          setTask(taskResponse.data)
          setSubtasks(taskResponse.data.subtasks)
        } catch (err) {
          setError(err.response?.data?.detail || '生成子任务失败')
          console.error('Error:', err)
        } finally {
          setLoading(false)
        }
      } else {
        // 长期任务直接生成计划
        setLoading(true)
        try {
          await axios.post(`${API_BASE_URL}/tasks/${newTask.id}/generate-plan?user_id=${user.user_id}`)
          setError('')
        } catch (err) {
          setError(err.response?.data?.detail || '生成计划失败')
          console.error('Error:', err)
        } finally {
          setLoading(false)
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || '创建任务失败，请检查网络连接和 API 配置')
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
      // 如果指定了子任务数量上限，添加到请求中
      if (maxSubtasks && maxSubtasks.trim() !== '') {
        const maxSubtasksNum = parseInt(maxSubtasks, 10)
        if (!isNaN(maxSubtasksNum) && maxSubtasksNum > 0) {
          requestBody.max_subtasks = maxSubtasksNum
        }
      }
      
      const response = await axios.post(`${API_BASE_URL}/tasks/${task.id}/generate-subtasks?user_id=${user.user_id}`, requestBody)

      // 更新任务信息以包含新创建的子任务
      const taskResponse = await axios.get(`${API_BASE_URL}/tasks/${task.id}?user_id=${user.user_id}`)
      setTask(taskResponse.data)
      setSubtasks(taskResponse.data.subtasks)
    } catch (err) {
      setError(err.response?.data?.detail || '生成子任务失败')
      console.error('Error:', err)
    } finally {
      setGeneratingSubtasks(false)
    }
  }

  const handleUpdateSubtask = async (subtaskId, updates) => {
    try {
      // 构建更新对象，只包含提供的字段
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
          setError('请输入有效的时间（大于等于0的数字）')
          // 恢复原值
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
      
      // 更新任务信息（从服务器获取最新数据）
      const taskResponse = await axios.get(`${API_BASE_URL}/tasks/${task.id}`)
      setTask(taskResponse.data)
      setSubtasks(taskResponse.data.subtasks)
      setError('') // 清除错误
    } catch (err) {
      console.error('更新子任务错误:', err.response?.data || err)
      
      // 尝试解析错误信息
      let errorMsg = '更新子任务失败'
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
      
      // 恢复原值
      try {
        const taskResponse = await axios.get(`${API_BASE_URL}/tasks/${task.id}`)
        setTask(taskResponse.data)
        setSubtasks(taskResponse.data.subtasks)
      } catch (fetchErr) {
        console.error('获取任务失败:', fetchErr)
      }
    }
  }
  
  // 向后兼容：保留原有的更新时间的函数
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
      alert('计划生成成功！前往日历视图查看。')
    } catch (err) {
      setError(err.response?.data?.detail || '生成计划失败')
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
            <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">创建新任务</h2>
            <p className="text-gray-600 font-medium">使用自然语言描述您的任务，AI 将自动生成计划</p>
          </div>
          
          <form onSubmit={handleCreateTask} className="space-y-6">
            <div>
              <label htmlFor="taskName" className="block text-sm font-semibold text-gray-700 mb-3">
                任务名称
              </label>
              <input
                type="text"
                id="taskName"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                required
                className="w-full px-5 py-3 border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-gray-900 placeholder-gray-400"
                placeholder="例如：CS421 Midterm3"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-3">
                任务描述（自然语言）
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="w-full px-5 py-3 border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-gray-900 placeholder-gray-400 resize-none"
                placeholder="例如：要完成复习 CS421 midterm3 的复习，我需要复习 PPT，复习 WA，复习 MP，做 practice quiz"
              />
            </div>

            <div>
              <label htmlFor="importance" className="block text-sm font-semibold text-gray-700 mb-3">
                任务重要性
              </label>
              <select
                id="importance"
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
                className="w-full px-5 py-3 border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-gray-900 bg-white"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
              <label htmlFor="isLongTerm" className="flex-1 cursor-pointer">
                <span className="block text-sm font-bold text-gray-900 mb-1">
                  长期任务
                </span>
                <span className="block text-xs text-gray-600">
                  无截止日期，例如：每天做 LeetCode
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

            {!isLongTerm && (
              <>
                <div>
                  <label htmlFor="deadline" className="block text-sm font-semibold text-gray-700 mb-3">
                    截止日期
                  </label>
                  <input
                    type="date"
                    id="deadline"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required={!isLongTerm}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-5 py-3 border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-gray-900"
                  />
                </div>
                
                <div>
                  <label htmlFor="maxSubtasks" className="block text-sm font-semibold text-gray-700 mb-3">
                    子任务数量上限（可选）
                  </label>
                  <input
                    type="number"
                    id="maxSubtasks"
                    value={maxSubtasks}
                    onChange={(e) => setMaxSubtasks(e.target.value)}
                    min="1"
                    placeholder="例如：1（只生成1个子任务）"
                    className="w-full px-5 py-3 border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-gray-900 placeholder-gray-400"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    如果不填写，AI 将根据任务复杂度自动决定子任务数量。填写后，AI 最多只会生成指定数量的子任务。
                  </p>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-2xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
              {loading ? '创建中...' : '创建任务'}
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
                  ✅ 任务创建成功！任务 ID: {task.id}
                  {task.is_long_term ? '（长期任务，计划已自动生成）' : '（子任务已自动生成）'}
                </p>
              </div>

              {task.is_long_term ? (
                <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-sm">
                  <p className="text-sm text-blue-800 font-semibold">
                    📅 长期任务的计划已自动生成！前往 <Link to="/" className="underline font-bold hover:text-blue-900">今日计划</Link> 或 <Link to="/calendar" className="underline font-bold hover:text-blue-900">日历视图</Link> 查看。
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">子任务列表</h3>
                  {task.subtasks.length === 0 ? (
                    <div className="p-5 bg-yellow-50 border-2 border-yellow-200 rounded-2xl shadow-sm">
                      <p className="text-sm text-yellow-800 font-semibold">正在生成子任务...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        {task.subtasks.map((subtask) => {
                          // 从 task.subtasks 中获取最新的值，而不是从 subtasks state
                          const currentSubtask = task.subtasks.find(st => st.id === subtask.id) || subtask
                          return (
                            <div key={subtask.id} className="p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                              <div className="space-y-3">
                                {/* 子任务名称 */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">子任务名称</label>
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
                                        // 如果名称为空，恢复原值
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
                                
                                {/* 子任务描述 */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">描述（可选）</label>
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
                                    placeholder="添加子任务描述..."
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 resize-none"
                                  />
                                </div>
                                
                                {/* 预计时间 */}
                                <div className="flex items-center justify-between">
                                  <label className="text-sm font-semibold text-gray-700">预计时间（小时）</label>
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
                        {generatingPlan ? '生成计划中...' : '生成每日计划'}
                      </button>
                      
                      <div className="text-sm text-gray-600 p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
                        <p className="font-semibold">✅ 子任务已生成！可以修改时间，然后点击"生成每日计划"。前往 <Link to="/" className="text-indigo-600 hover:underline font-bold">今日计划</Link> 查看。</p>
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
