import React, { createContext, useState } from 'react';

const FilterContext = createContext({
    filterTypes: {},
    handleFilterChange: () => { },
});

const FilterProvider = ({ children }) => {
    const [filterTypes, setFilterTypes] = useState({});

    const handleFilterChange = (tableKey, filterType) => {
        console.log(`Filter changed for ${tableKey}: ${filterType}`);
        setFilterTypes(prev => ({
            ...prev,
            [tableKey]: filterType,
        }));
    };

    return (
        <FilterContext.Provider value={{ filterTypes, handleFilterChange }}>
            {children}
        </FilterContext.Provider>
    );
};

export { FilterContext, FilterProvider };