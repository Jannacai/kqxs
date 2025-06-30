import React from 'react';
import styles from '../styles/postDetail.module.css'; // Giả sử styles tương thích với PostDetail

const RenderContent = ({ contentOrder, mainContents, title }) => {
    if (!contentOrder || !mainContents) {
        return <p className={styles.error}>Nội dung không khả dụng.</p>;
    }

    return (
        <div className={styles.content}>
            {contentOrder.map((item, index) => {
                if (item.type !== 'mainContent' || typeof item.index !== 'number') {
                    return null;
                }

                const content = mainContents[item.index];
                if (!content) {
                    return null;
                }

                const { h2, description, img, caption, isImageFirst } = content;

                return (
                    <div key={`content-${index}`} className={styles.contentBlock}>
                        {isImageFirst && img && (
                            <div className={styles.imageWrapper}>
                                <img
                                    src={img}
                                    alt={caption || title}
                                    className={styles.contentImage}
                                    loading="lazy"
                                />
                                {caption && <p className={styles.caption}>{caption}</p>}
                            </div>
                        )}
                        {h2 && <h2 className={styles.subHeading}>{h2}</h2>}
                        {description && (
                            <p
                                className={styles.description}
                                dangerouslySetInnerHTML={{ __html: description.replace(/\n/g, '<br />') }}
                            />
                        )}
                        {!isImageFirst && img && (
                            <div className={styles.imageWrapper}>
                                <img
                                    src={img}
                                    alt={caption || title}
                                    className={styles.contentImage}
                                    loading="lazy"
                                />
                                {caption && <p className={styles.caption}>{caption}</p>}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default RenderContent;