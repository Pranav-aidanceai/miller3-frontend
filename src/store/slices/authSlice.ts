// store/slices/authSlice.ts
import { UserDetails } from '@/types/auth'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import storage from 'redux-persist/lib/storage'

interface AuthState {
  role: string | null
  user: UserDetails | null
  isAuthenticated: boolean
  sidebarCollapsed?: boolean
}

const initialState: AuthState = {
  role: null,
  user: null,
  isAuthenticated: false,
  sidebarCollapsed: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{
      role: string
      user_details: UserDetails
    }>) => {
      state.role = action.payload.role
      state.user = action.payload.user_details
      state.isAuthenticated = true
      state.sidebarCollapsed = false
    },
    logout: (state) => {
      state.role = null
      state.user = null
      state.isAuthenticated = false
      state.sidebarCollapsed = false
      storage.removeItem('persist:auth')
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    }
  }
})

export const { setCredentials, logout, toggleSidebar } = authSlice.actions
export default authSlice.reducer