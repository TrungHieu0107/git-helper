import { addToast } from "../store";

export const toast = {
    success: (message: string, duration = 5000) => addToast(message, 'success', duration),
    error: (message: string, duration = 6000) => addToast(message, 'error', duration),
    info: (message: string, duration = 5000) => addToast(message, 'info', duration),
};
