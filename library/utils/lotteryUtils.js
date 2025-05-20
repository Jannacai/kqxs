export const checkCondition = (number, filter, lists) => {
    const str = number.toString().padStart(2, '0');
    const { category, value } = filter;

    if (!category || !value) return false;

    if (category === 'dau') {
        return (lists.dauChanList.includes(str) && value === 'Đầu chẵn') ||
            (lists.dauLeList.includes(str) && value === 'Đầu lẻ') ||
            (lists.dauBeList.includes(str) && value === 'Đầu bé') ||
            (lists.dauLonList.includes(str) && value === 'Đầu lớn');
    }
    if (category === 'duoi') {
        return (lists.duoiChanList.includes(str) && value === 'Đuôi chẵn') ||
            (lists.duoiLeList.includes(str) && value === 'Đuôi lẻ') ||
            (lists.duoiBeList.includes(str) && value === 'Đuôi bé') ||
            (lists.duoiLonList.includes(str) && value === 'Đuôi lớn');
    }
    if (category === 'tong') {
        return (lists.tongChanList.includes(str) && value === 'Tổng chẵn') ||
            (lists.tongLeList.includes(str) && value === 'Tổng lẻ') ||
            (lists.tongBeList.includes(str) && value === 'Tổng bé') ||
            (lists.tongLonList.includes(str) && value === 'Tổng lớn');
    }
    if (category === 'dauDuoi') {
        return (lists.chanChanList.includes(str) && value === 'Chẵn/Chẵn') ||
            (lists.chanLeList.includes(str) && value === 'Chẵn/Lẻ') ||
            (lists.leChanList.includes(str) && value === 'Lẻ/Chẵn') ||
            (lists.leLeList.includes(str) && value === 'Lẻ/Lẻ');
    }
    if (category === 'beLon') {
        return (lists.beBeList.includes(str) && value === 'Bé/Bé') ||
            (lists.beLonList.includes(str) && value === 'Bé/Lớn') ||
            (lists.lonBeList.includes(str) && value === 'Lớn/Bé') ||
            (lists.lonLonList.includes(str) && value === 'Lớn/Lớn');
    }
    if (category === 'kep') {
        return (lists.kepBangList.includes(str) && value === 'Kép bằng') ||
            (lists.kepLechList.includes(str) && value === 'Kép lệch') ||
            (lists.kepAmList.includes(str) && value === 'Kép âm') ||
            (lists.satKepList.includes(str) && value === 'Sát kép');
    }
    return false;
};

export const taoDanDauDuoi = (dauInput, duoiInput, tongInput, themInput, boDauDuoiInput) => {
    const dauValues = dauInput.replace(/\D/g, '').split('').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 9);
    const duoiValues = duoiInput.replace(/\D/g, '').split('').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 9);
    const themValues = themInput.split(',').map(num => parseInt(num)).filter(n => !isNaN(n) && n >= 0 && n <= 99);
    const boValues = boDauDuoiInput.split(',').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 99);

    let tongValues = [];
    const tongStr = tongInput.replace(/\D/g, '');
    if (tongStr.length > 0) {
        const baseValues = [...new Set(tongStr.split('').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 9))];
        tongValues = [...baseValues, ...baseValues.map(n => n + 10).filter(n => n <= 18)];
    }

    let numbers = Array.from({ length: 100 }, (_, i) => i);

    if (dauValues.length > 0) {
        numbers = numbers.filter(num => {
            const dau = Math.floor(num / 10);
            return dauValues.includes(dau);
        });
    }

    if (duoiValues.length > 0) {
        numbers = numbers.filter(num => {
            const duoi = num % 10;
            return duoiValues.includes(duoi);
        });
    }

    if (tongValues.length > 0) {
        numbers = numbers.filter(num => {
            const dau = Math.floor(num / 10);
            const duoi = num % 10;
            const tong = dau + duoi;
            return tongValues.includes(tong);
        });
    }

    if (boValues.length > 0) {
        numbers = numbers.filter(num => !boValues.includes(num));
    }

    if (themValues.length > 0) {
        themValues.forEach(num => {
            if (!numbers.includes(num)) {
                numbers.push(num);
            }
        });
    }

    numbers.sort((a, b) => a - b);
    return numbers.map(num => num.toString().padStart(2, '0'));
};

export const taoDanCham = (chamInput, tongChamInput, themChamInput, boChamInput) => {
    const chamValues = chamInput.replace(/\D/g, '').split('').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 9);
    const themValues = themChamInput.split(',').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 99);
    const boValues = boChamInput.split(',').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 99);

    let tongValues = [];
    const tongStr = tongChamInput.replace(/\D/g, '');
    if (tongStr.length > 0) {
        const baseValues = [...new Set(tongStr.split('').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 9))];
        tongValues = [...baseValues, ...baseValues.map(n => n + 10).filter(n => n <= 18)];
    }

    let numbers = Array.from({ length: 100 }, (_, i) => i);

    if (chamValues.length > 0) {
        numbers = numbers.filter(num => {
            const str = num.toString().padStart(2, '0');
            return chamValues.some(cham => str.includes(cham.toString()));
        });
    } else {
        numbers = [];
    }

    if (tongValues.length > 0) {
        numbers = numbers.filter(num => {
            const dau = Math.floor(num / 10);
            const duoi = num % 10;
            const tong = dau + duoi;
            return tongValues.includes(tong);
        });
    }

    if (boValues.length > 0) {
        numbers = numbers.filter(num => !boValues.includes(num));
    }

    if (themValues.length > 0) {
        themValues.forEach(num => {
            if (!numbers.includes(num) && !boValues.includes(num)) {
                numbers.push(num);
            }
        });
    }

    numbers.sort((a, b) => a - b);
    return numbers.map(num => num.toString().padStart(2, '0'));
};

export const taoDanBo = (boInput, tongBoInput, themBoInput, boBoInput, lists) => {
    const tongValues = tongBoInput.replace(/\D/g, '').split('').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 18);
    const themValues = themBoInput.split(',').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 99);
    const boValues = boBoInput.split(',').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 9);

    let numbers = [];
    if (boInput === 'Kép bằng') numbers = lists.kepBangList.map(Number);
    if (boInput === 'Kép lệch') numbers = lists.kepLechList.map(Number);
    if (boInput === 'Kép âm') numbers = lists.kepAmList.map(Number);
    if (boInput === 'Sát kép') numbers = lists.satKepList.map(Number);

    if (tongValues.length > 0) {
        numbers = numbers.filter(num => {
            const dau = Math.floor(num / 10);
            const duoi = num % 10;
            const tong = dau + duoi;
            return tongValues.includes(tong);
        });
    }

    const filteredNumbers = [...numbers];
    if (themValues.length > 0) {
        themValues.forEach(num => {
            if (!numbers.includes(num)) {
                numbers.push(num);
            }
        });
    }

    if (boValues.length > 0) {
        numbers = numbers.filter(num => {
            const str = num.toString().padStart(2, '0');
            const isFromThem = themValues.includes(num);
            return isFromThem || !boValues.some(bo => str.includes(bo.toString()));
        });
    }

    numbers.sort((a, b) => a - b);
    return numbers.map(num => num.toString().padStart(2, '0'));
};