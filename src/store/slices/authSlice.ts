// store/slices/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import storage from 'redux-persist/lib/storage'

interface RoleDetails {
  id: string
  name: string
  display_name: string
  unified_credits_monthly: number
  export_rows_per_credit: number | null
  export_max_rows: number
  search_rate_limit_per_min: number
  ai_search_rate_limit_per_min: number
  enrichment_rate_limit_per_min: number
  visible_columns: string[]
}

interface CreditCosts {
  ai_search: number
  enrichment: number
  export: number
}

// Unified credit balance — a single pool shared across AI search, enrichment
// and export. `limit` is -1 for admins (unlimited).
export interface CreditsLeft {
  total: number
  used: number
  limit: number
  costs?: CreditCosts
  export_rows_per_credit?: number | null
}

export type UserDetails = {
  id: string
  name: string
  email: string
  role: string
  has_seen_onboarding: boolean
  tou_accepted: boolean
}

interface AuthState {
  role: string | null
  user: UserDetails | null
  roleDetails: RoleDetails | null
  credits_left: CreditsLeft
  isAuthenticated: boolean
  sidebarCollapsed?: boolean
  has_seen_onboarding: boolean
}

const emptyCredits: CreditsLeft = { total: 0, used: 0, limit: 0 }

const initialState: AuthState = {
  role: null,
  user: null,
  roleDetails: null,
  credits_left: emptyCredits,
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
      credits_left: CreditsLeft
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
      state.credits_left = emptyCredits
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
    // The three operations (AI search, enrichment, export) now draw from the
    // same balance, so every credit-consuming action reports back through
    // this single reducer with whatever the API returned as "remaining".
    updateCreditsRemaining: (state, action: PayloadAction<number>) => {
      state.credits_left.total = action.payload
      if (state.credits_left.limit >= 0) {
        state.credits_left.used = Math.max(0, state.credits_left.limit - action.payload)
      }
    },
  }
})

export const { setCredentials, logout, toggleSidebar, setOnboardingSeen, updateCreditsRemaining } = authSlice.actions
export default authSlice.reducer
