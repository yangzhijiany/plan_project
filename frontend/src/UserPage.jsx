import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from './UserContext'
import axios from 'axios'
import { API_BASE_URL } from './config'

function UserPage() {
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { getUserByNickname } = useUser()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nickname.trim()) {
      setError('Please enter a nickname')
      return
    }

    setLoading(true)
    setError('')

    try {
      await getUserByNickname(nickname.trim())
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create/get user')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white shadow-2xl rounded-3xl p-10 border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Create/Select User
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="nickname" className="block text-sm font-semibold text-gray-700 mb-3">
              Nickname
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your nickname"
              className="w-full px-5 py-3 border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-gray-900 placeholder-gray-400"
              required
            />
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              If the nickname exists, the existing user will be used; otherwise, a new user will be created
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl shadow-sm">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-2xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
          >
            {loading ? 'Processing...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default UserPage

