// self.addEventListener('message', (e) => {
//     const { type, data } = e.data;
//     if (type === 'PROCESS_LOTTO') {
//         const allHeads = Array(10).fill().map(() => []);
//         const allTails = Array(10).fill().map(() => []);
//         const stationsData = data.map(stationData => {
//             const lastTwoNumbers = [];
//             const addNumber = (num, isSpecial = false, isEighth = false) => {
//                 if (num && num !== '...' && num !== '***' && /^\d+$/.test(num)) {
//                     const last2 = num.slice(-2).padStart(2, '0');
//                     lastTwoNumbers.push({ num: last2, isSpecial, isEighth });
//                 }
//             };

//             addNumber(stationData.specialPrize_0, true);
//             addNumber(stationData.firstPrize_0);
//             addNumber(stationData.secondPrize_0);
//             for (let i = 0; i < 2; i++) addNumber(stationData[`threePrizes_${i}`]);
//             for (let i = 0; i < 7; i++) addNumber(stationData[`fourPrizes_${i}`]);
//             addNumber(stationData.fivePrizes_0);
//             for (let i = 0; i < 3; i++) addNumber(stationData[`sixPrizes_${i}`]);
//             addNumber(stationData.sevenPrizes_0);
//             addNumber(stationData.eightPrizes_0, false, true);

//             const heads = Array(10).fill().map(() => []);
//             const tails = Array(10).fill().map(() => []);

//             lastTwoNumbers.forEach(item => {
//                 const last2 = item.num;
//                 if (last2.length === 2) {
//                     const head = parseInt(last2[0], 10);
//                     const tail = parseInt(last2[1], 10);
//                     if (!isNaN(head) && !isNaN(tail)) {
//                         heads[head].push(item);
//                         tails[tail].push(item);
//                     }
//                 }
//             });

//             for (let i = 0; i < 10; i++) {
//                 allHeads[i].push(heads[i]);
//                 allTails[i].push(tails[i]);
//             }
//             return { tentinh: stationData.tentinh, station: stationData.station, tinh: stationData.tinh };
//         });

//         self.postMessage({ allHeads, allTails, stationsData });
//     }
// });