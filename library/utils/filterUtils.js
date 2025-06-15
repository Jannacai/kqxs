// utils/filterUtils.js
export const getFilteredNumber = (number, filterType) => {
    // Convert number to string if it's not already a string, default to empty string if undefined/null
    const numStr = typeof number === 'number' ? number.toString() : (number || '').toString();

    switch (filterType) {
        case 'last2':
            return numStr.slice(-2);
        case 'last3':
            return numStr.slice(-3);
        default:
            return numStr;
    }
};