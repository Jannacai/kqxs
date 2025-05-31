// pages/posts/list.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getPosts } from "../../pages/api/post/index";
import Listpost from "../../component/listPost"
import styles from "../../styles/postList.module.css"; // Tạo file CSS nếu cần

const PostList = () => {
    const router = useRouter();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
        
                const data = await getPosts();
          
                setPosts(data);
                setLoading(false);
                if (data === undefined) {
                    console.error("LỖI: Hàm getPosts() đã trả về undefined!");
                    // Có thể set lỗi hoặc giữ posts là mảng rỗng
                    setError("Không thể lấy dữ liệu bài viết (API trả về undefined).");
                    // setPosts([]); // Đảm bảo posts vẫn là mảng
                } else {
                    setPosts(data); // Chỉ set state nếu data không phải undefined
                }
            } catch (err) {
                console.error("Lỗi xảy ra trong fetchPosts:", err);
                setError(err.message || "Đã có lỗi xảy ra khi lấy danh sách bài viết");
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    if (loading) {
        return <p>Đang tải...</p>;
    }

    if (error) {
        return <p className={styles.error}>{error}</p>;
    }
    return (
        <div >
            <Listpost appa={posts} />
        </div>
    );
};

export default PostList;