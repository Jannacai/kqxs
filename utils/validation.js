// Utility functions cho validation

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ObjectId string
 * @returns {boolean} - True nếu là valid ObjectId
 */
export const isValidObjectId = (id) => {
    if (!id || typeof id !== 'string') return false;
    return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate email format
 * @param {string} email - Email string
 * @returns {boolean} - True nếu là valid email
 */
export const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate phone number format (Vietnamese)
 * @param {string} phone - Phone number string
 * @returns {boolean} - True nếu là valid phone number
 */
export const isValidPhone = (phone) => {
    if (!phone || typeof phone !== 'string') return false;
    const phoneRegex = /^(\+84|84|0)[0-9]{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validate username format
 * @param {string} username - Username string
 * @returns {boolean} - True nếu là valid username
 */
export const isValidUsername = (username) => {
    if (!username || typeof username !== 'string') return false;
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
};

/**
 * Validate password strength
 * @param {string} password - Password string
 * @returns {object} - Object với isValid và message
 */
export const validatePassword = (password) => {
    if (!password || typeof password !== 'string') {
        return { isValid: false, message: 'Mật khẩu không được để trống' };
    }

    if (password.length < 6) {
        return { isValid: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' };
    }

    if (password.length > 50) {
        return { isValid: false, message: 'Mật khẩu không được quá 50 ký tự' };
    }

    return { isValid: true, message: 'Mật khẩu hợp lệ' };
};

/**
 * Sanitize text input
 * @param {string} text - Input text
 * @returns {string} - Sanitized text
 */
export const sanitizeText = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text.trim().replace(/[<>]/g, '');
};

/**
 * Validate lottery number format
 * @param {string} number - Lottery number string
 * @returns {boolean} - True nếu là valid lottery number
 */
export const isValidLotteryNumber = (number) => {
    if (!number || typeof number !== 'string') return false;
    const numberRegex = /^\d{2,6}$/;
    return numberRegex.test(number);
};

/**
 * Validate date format (DD-MM-YYYY)
 * @param {string} date - Date string
 * @returns {boolean} - True nếu là valid date format
 */
export const isValidDateFormat = (date) => {
    if (!date || typeof date !== 'string') return false;
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    return dateRegex.test(date);
}; 