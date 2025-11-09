import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { UserProvider, useUser } from './UserContext'
import InputPage from './InputPage'
import CalendarPage from './CalendarPage'
import TodayPage from './TodayPage'
import UserPage from './UserPage'
import { API_BASE_URL } from './config'

function Navigation() {
  const location = useLocation()
  const { user, logout } = useUser()
  
  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <nav className="bg-white shadow-md backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hover:from-indigo-700 hover:to-purple-700 transition-all duration-300">
                LLM Task Planner
              </Link>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
              <Link
                to="/"
                className={`inline-flex items-center px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  isActive('/') 
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                今日计划
              </Link>
              <Link
                to="/create"
                className={`inline-flex items-center px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  isActive('/create') 
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                创建任务
              </Link>
              <Link
                to="/calendar"
                className={`inline-flex items-center px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  isActive('/calendar') 
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                日历视图
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">{user.nickname}</span>
                </div>
                <button
                  onClick={logout}
                  className="text-sm px-4 py-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-300"
                >
                  切换用户
                </button>
              </div>
            ) : (
              <Link
                to="/user"
                className="text-sm px-5 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                创建/选择用户
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

function AppContent() {
  const { user, loading } = useUser()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 text-lg">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <Navigation />
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/user" element={<UserPage />} />
              <Route path="*" element={<UserPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/create" element={<InputPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/user" element={<UserPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  )
}

export default App

