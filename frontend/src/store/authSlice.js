import { createSlice } from '@reduxjs/toolkit';
import {
  clearStoredAuth,
  getActiveRole,
  getStoredAuth,
  saveStoredAuth,
} from './authStorage';

const stored = getStoredAuth(getActiveRole());

const initialState = {
  user: stored?.user || null,
  token: stored?.access || stored?.token || null,
  role: stored?.role || null,
  isAuthenticated: Boolean(stored?.access || stored?.token),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action) {
      state.token = action.payload.access || action.payload.token;
      state.user  = action.payload.user;
      state.role  = action.payload.role;
      state.isAuthenticated = true;
      state.error = null;
      saveStoredAuth({
        access: action.payload.access || action.payload.token,
        user:  action.payload.user,
        role:  action.payload.role,
      });
    },
    logout(state) {
      clearStoredAuth(state.role || getActiveRole());
      state.token = null;
      state.user  = null;
      state.role  = null;
      state.isAuthenticated = false;
    },
    setLoading(state, action) { state.loading = action.payload; },
    setError(state, action)   { state.error   = action.payload; },
  },
});

export const { loginSuccess, logout, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
