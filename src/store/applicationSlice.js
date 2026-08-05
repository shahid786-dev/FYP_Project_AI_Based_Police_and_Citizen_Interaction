import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  applications: [],
  currentApplication: null,
  tracking: null,
  analytics: null,
  loading: false,
  error: null,
};

const applicationSlice = createSlice({
  name: 'application',
  initialState,
  reducers: {
    setApplications(state, action)       { state.applications       = action.payload; },
    setCurrentApplication(state, action) { state.currentApplication = action.payload; },
    setTracking(state, action)           { state.tracking           = action.payload; },
    setAnalytics(state, action)          { state.analytics          = action.payload; },
    setLoading(state, action)            { state.loading            = action.payload; },
    setError(state, action)              { state.error              = action.payload; },
    addApplication(state, action)        { state.applications.unshift(action.payload); },
  },
});

export const {
  setApplications, setCurrentApplication, setTracking,
  setAnalytics, setLoading, setError, addApplication,
} = applicationSlice.actions;
export default applicationSlice.reducer;
