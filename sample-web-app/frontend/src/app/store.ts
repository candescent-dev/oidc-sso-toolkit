import { configureStore } from '@reduxjs/toolkit';
import homeReducer from '../features/home/homeSlice';
import oidcValidatorReducer from '../features/oidcValidator/oidcValidatorSlice';
import OidcSsoInitiatorReducer from '../features/OidcSsoInitiator/OidcSsoInitiatorSlice';

export const store = configureStore({
  reducer: {
    home: homeReducer,
    oidcValidator: oidcValidatorReducer,
    OidcSsoInitiator: OidcSsoInitiatorReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
