import { useEffect, useState } from "react";
import Head from 'next/head';
import styles from "../../styles/postList.module.css";
import { getPosts } from "../../pages/api/post/index";
import Listpost from "../../component/listPost";

export async function getServerSideProps() {
    try {
        const data = await getPosts(1, 10); // Lấy 10 bài đầu tiên
        return { props: { initialPosts: data.posts || [], total: data.total || 0 } };
    } catch (error) {
        console.error("Error fetching posts:", error);
        return { props: { initialPosts: [], total: 0 } };
    }
}

const PostList = ({ initialPosts, total }) => {
    const [posts, setPosts] = useState(initialPosts);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (page === 1) return; // Không gọi lại API cho trang 1
        const fetchPosts = async () => {
            setLoading(true);
            try {
                const data = await getPosts(page, 10);
                setPosts(data.posts);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };
        fetchPosts();
    }, [page]);

    const metaTitle = `Tin tức xổ số miền Bắc - Dự đoán XSMB hôm nay`;
    const metaDescription = `Cập nhật tin tức, dự đoán XSMB, soi cầu lô đề chính xác nhất tại xsmb.win.`;

    if (error) return <p className={styles.error}>{error}</p>;

    return (
        <div>
            <Head>
                <title>{metaTitle}</title>
                <meta name="description" content={metaDescription} />
                <meta name="keywords" content="tin tức xổ số, dự đoán xsmb, soi cầu xsmb, lô đề, xsmb hôm nay" />
                <meta property="og:title" content={metaTitle} />
                <meta property="og:description" content={metaDescription} />
                <meta property="og:image" content="https://xsmb.win/facebook.png" />
                <meta property="og:url" content="https://xsmb.win/bai-viet" />
            </Head>
            {loading && <p>Đang tải...</p>}
            <Listpost appa={posts} />
            <div className={styles.pagination}>
                <button disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</button>
                <span>Trang {page}</span>
                <button disabled={page * 10 >= total} onClick={() => setPage(page + 1)}>Sau</button>
            </div>
        </div>
    );
};

export default PostList;