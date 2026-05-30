// store/slices/authSlice.ts
import { UserDetails } from '@/types/auth'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import storage from 'redux-persist/lib/storage'

interface RoleDetails {
  id: string
  name: string
  display_name: string
  ai_search_credits_monthly: number
  enrichment_credits_monthly: number
  export_credits_monthly: number
  export_max_rows: number
  search_rate_limit_per_min: number
  ai_search_rate_limit_per_min: number
  enrichment_rate_limit_per_min: number
  visible_columns: string[]
}

interface AuthState {
  role: string | null
  user: UserDetails | null
  roleDetails: RoleDetails | null
  isAuthenticated: boolean
  sidebarCollapsed?: boolean
  has_seen_onboarding: boolean
}

const initialState: AuthState = {
  role: null,
  user: null,
  roleDetails: null,
  isAuthenticated: false,
  sidebarCollapsed: false,
  has_seen_onboarding: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{
      role: string
      user_details: UserDetails
      role_details: RoleDetails
    }>) => {
      state.role = action.payload.role
      state.user = action.payload.user_details
      state.roleDetails = action.payload.role_details
      state.isAuthenticated = true
      state.sidebarCollapsed = false
    },
    logout: (state) => {
      state.role = null
      state.user = null
      state.isAuthenticated = false
      state.sidebarCollapsed = false
      state.has_seen_onboarding = false
      storage.removeItem('persist:auth')
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    setOnboardingSeen: (state) => {  // ← Add this action
      state.has_seen_onboarding = true
    }
  }
})

export const { setCredentials, logout, toggleSidebar, setOnboardingSeen } = authSlice.actions
export default authSlice.reducer