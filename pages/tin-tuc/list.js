"use client"; // Đảm bảo chạy phía client vì dùng Socket.IO

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getPosts } from "../api/post/index";
import ListPost from "../../component/listPost";
import styles from "../../styles/postList.module.css";
import io from "socket.io-client";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

    useEffect(() => {
        const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000", {
            query: { token: localStorage?.getItem("token") || "" },
        });

        socket.on("connect", () => {
            console.log("Connected to Socket.IO server");
        });

        socket.on("newPostCreated", (newPost) => {
            if (!newPost || !newPost._id) return;

            setPosts((prevPosts) => {
                // Tránh trùng lặp
                if (prevPosts.some((post) => post._id === newPost._id)) {
                    return prevPosts;
                }
                // Thêm bài viết mới vào đầu danh sách
                const newPosts = [newPost, ...prevPosts].slice(0, 10); // Giới hạn 10 bài/trang
                return newPosts;
            });

            // Cập nhật totalPages nếu cần
            setTotalPages((prevTotal) => Math.ceil((prevTotal * 10 + 1) / 10));

            // Thông báo bài viết mới
            toast.info(`Bài viết mới: ${newPost.title}`, {
                position: "top-right",
                autoClose: 3000,
            });
        });

        socket.on("connect_error", (err) => {
            console.error("Socket.IO connection error:", err.message);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

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
            <ToastContainer />
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