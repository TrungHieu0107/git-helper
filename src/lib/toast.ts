import { useAppStore } from "../store";

export const toast = {
    success: (message: string, duration = 5000) => useAppStore.getState().addToast(message, 'success', duration),
    error: (message: string, duration = 6000) => useAppStore.getState().addToast(message, 'error', duration),
    warning: (message: string, duration = 6000) => useAppStore.getState().addToast(message, 'error', duration),
    info: (message: string, duration = 5000) => useAppStore.getState().addToast(message, 'info', duration),
};
