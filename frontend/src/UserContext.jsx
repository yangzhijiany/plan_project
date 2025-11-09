import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './config'

const UserContext = createContext()

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 从 localStorage 加载用户信息
  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
      } catch (e) {
        console.error('Failed to parse saved user:', e)
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const createUser = async (nickname) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/users`, { nickname })
      const userData = response.data
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      return userData
    } catch (error) {
      console.error('Failed to create user:', error)
      throw error
    }
  }

  const getUserByNickname = async (nickname) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/by-nickname/${encodeURIComponent(nickname)}`)
      const userData = response.data
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      return userData
    } catch (error) {
      if (error.response?.status === 404) {
        // 用户不存在，创建新用户
        return await createUser(nickname)
      }
      console.error('Failed to get user:', error)
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <UserContext.Provider value={{ user, loading, createUser, getUserByNickname, logout }}>
      {children}
    </UserContext.Provider>
  )
}

