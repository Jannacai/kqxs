// import React from 'react';
// import styles from '../../../styles/LIVEMT.module.css';

// const PrizeCell = React.memo(({ value, isAnimating, digits, isSpecialOrEighth }) => {
//     const className = `${styles.running_number} ${styles[`running_${digits}`]}`;
//     return (
//         <span
//             className={`${className} ${isSpecialOrEighth ? styles.highlight : ''}`}
//             data-status={isAnimating ? 'animating' : 'static'}
//         >
//             {isAnimating ? (
//                 <span className={styles.digit_container}>
//                     {Array.from({ length: digits }).map((_, i) => (
//                         <span key={i} className={styles.digit} data-status="animating" data-index={i}></span>
//                     ))}
//                 </span>
//             ) : value === '...' ? (
//                 <span className={styles.ellipsis}></span>
//             ) : (
//                 <span className={styles.digit_container}>
//                     {value
//                         .padStart(digits, '0')
//                         .split('')
//                         .map((digit, i) => (
//                             <span
//                                 key={i}
//                                 className={`${styles.digit12} ${isSpecialOrEighth ? styles.highlight1 : ''}`}
//                                 data-status="static"
//                                 data-index={i}
//                             >
//                                 {digit}
//                             </span>
//                         ))}
//                 </span>
//             )}
//         </span>
//     );
// });

// export default PrizeCell;