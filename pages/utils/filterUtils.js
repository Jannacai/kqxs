// utils/filterUtils.js
export const getFilteredNumber = (number, filterType) => {
    switch (filterType) {
        case 'last2':
            return number.slice(-2);
        case 'last3':
            return number.slice(-3);
        default:
            return number;
    }
};