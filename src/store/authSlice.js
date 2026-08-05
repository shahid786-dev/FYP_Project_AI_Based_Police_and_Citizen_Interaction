import { createSlice } from '@reduxjs/toolkit';

const stored = JSON.parse(localStorage.getItem('pakverify_auth') || 'null');

const initialState = {
  user: stored?.user || null,
  token: stored?.token || null,
  role: stored?.role || null,
  isAuthenticated: !!stored?.token,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action) {
      state.token = action.payload.token;
      state.user  = action.payload.user;
      state.role  = action.payload.role;
      state.isAuthenticated = true;
      state.error = null;
      localStorage.setItem('pakverify_auth', JSON.stringify({
        token: action.payload.token,
        user:  action.payload.user,
        role:  action.payload.role,
      }));
    },
    logout(state) {
      state.token = null;
      state.user  = null;
      state.role  = null;
      state.isAuthenticated = false;
      localStorage.removeItem('pakverify_auth');
    },
    setLoading(state, action) { state.loading = action.payload; },
    setError(state, action)   { state.error   = action.payload; },
  },
});

export const { loginSuccess, logout, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
