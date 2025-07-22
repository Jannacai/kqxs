import styles from '../styles/loading.module.css';

const OverlayLoading = () => {
    return (
        <div className={styles.overlay}>
            <div className={styles.overlayContent}>
                <div className={styles.ellipsis}></div>
                <span>Đang tải kết quả...</span>
            </div>
        </div>
    );
};

export default OverlayLoading;