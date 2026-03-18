const GENERIC_BACKEND_MESSAGE = 'An unexpected error occurred';

const getFirstDetailMessage = (details) => {
    if (!details || typeof details !== 'object') return null;

    const firstMessage = Object.values(details).find((value) => typeof value === 'string' && value.trim());
    return firstMessage || null;
};

export const getApiErrorMessage = (error, fallbackMessage) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const detailedMessage = getFirstDetailMessage(data?.details);

    if (detailedMessage) return detailedMessage;

    if (typeof data?.message === 'string' && data.message !== GENERIC_BACKEND_MESSAGE) {
        return data.message;
    }

    if (status === 409) return 'That email or username is already in use.';
    if (status === 401) return 'Invalid email/username or password.';
    if (status === 422) return 'Please check the form fields and try again.';
    if (status === 429) return 'Too many attempts. Please wait a moment and try again.';

    return fallbackMessage;
};
