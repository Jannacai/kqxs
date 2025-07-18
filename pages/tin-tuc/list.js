"use client"; // Đảm bảo chạy phía client

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getPosts } from "../api/post/index";
import ListPost from "../../component/listPost";
import styles from "../../styles/postList.module.css";

const PostList = () => {
    const router = useRouter();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            try {
                const data = await getPosts(null, page, 10);
                setPosts(data.posts || []);
                setTotalPages(data.totalPages || 1);
                setLoading(false);
            } catch (err) {
                console.error("Lỗi xảy ra trong fetchPosts:", err);
                setError(err.message || "Đã có lỗi xảy ra khi lấy danh sách bài viết");
                setLoading(false);
            }
        };
        fetchPosts();
    }, [page]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    if (loading) {
        return (
            <div className={styles.postContainer}>
                {Array(4)
                    .fill()
                    .map((_, i) => (
                        <div key={i} className={styles.itemPlaceholder}>
                            <div className={styles.imgSkeleton}></div>
                            <div className={styles.textSkeleton}></div>
                        </div>
                    ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>
                <p>{error}</p>
                <button onClick={() => setPage(1)}>Thử lại</button>
            </div>
        );
    }

    return (
        <div>
            <ListPost posts={posts} />
            {/* <div className={styles.pagination}>
                <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    aria-label="Trang trước"
                >
                    Trước
                </button>
                <span>
                    Trang {page} / {totalPages}
                </span>
                <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    aria-label="Trang sau"
                >
                    Sau
                </button>
            </div> */}
        </div>
    );
};

export default PostList;