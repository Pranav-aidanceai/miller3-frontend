// store/slices/authSlice.ts
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

export type UserDetails = {
  id: string
  name: string
  email: string
  role: string
  has_seen_onboarding: boolean
}

interface AuthState {
  role: string | null
  user: UserDetails | null
  roleDetails: RoleDetails | null
  credits_left: { export: number; ai_search: number; enrichment: number }
  isAuthenticated: boolean
  sidebarCollapsed?: boolean
  has_seen_onboarding: boolean
}

const initialState: AuthState = {
  role: null,
  user: null,
  roleDetails: null,
  credits_left: { export: 0, ai_search: 0, enrichment: 0 },
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
      credits_left: { export: number; ai_search: number; enrichment: number }
    }>) => {
      state.role = action.payload.role
      state.user = action.payload.user_details
      state.roleDetails = action.payload.role_details
      state.credits_left = action.payload.credits_left
      state.has_seen_onboarding = action.payload.user_details.has_seen_onboarding
      state.isAuthenticated = true
      state.sidebarCollapsed = false
    },
    logout: (state) => {
      state.role = null
      state.user = null
      state.credits_left = { export: 0, ai_search: 0, enrichment: 0 }
      state.isAuthenticated = false
      state.sidebarCollapsed = false
      // state.has_seen_onboarding = false
      storage.removeItem('persist:auth')
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    setOnboardingSeen: (state) => {
      state.has_seen_onboarding = true
    },
    updateExportCredits: (state, action: PayloadAction<number>) => {
      state.credits_left.export = action.payload
    },
    updateAiSearchCredits: (state, action: PayloadAction<number>) => {
      state.credits_left.ai_search = action.payload
    },
    updateEnrichmentCredits: (state, action: PayloadAction<number>) => {
      state.credits_left.enrichment = action.payload
    }
  }
})

export const { setCredentials, logout, toggleSidebar, setOnboardingSeen, updateExportCredits, updateAiSearchCredits, updateEnrichmentCredits } = authSlice.actions
export default authSlice.reducer