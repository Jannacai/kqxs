// pages/posts/index.js
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import NavBar from '../../components/NavBar';
import styles from '../../styles/LotteryPage.module.css';

export async function getServerSideProps({ query }) {
    const { page = 1 } = query;
    const res = await fetch(`${process.env.BACKEND_URL}/api/posts?page=${page}`);
    const { posts, total, page: currentPage, limit } = await res.json();
    return {
        props: {
            posts,
            total,
            currentPage,
            limit,
        },
    };
}

export default function Posts({ posts, total, currentPage, limit }) {
    const router = useRouter();
    const totalPages = Math.ceil(total / limit);

    const handlePageChange = (newPage) => {
        router.push(`/posts?page=${newPage}`);
    };

    return (
        <div className={styles.container}>
            <Head>
                <title>Bài viết - Xoso.com.vn</title>
                <meta name="description" content="Danh sách bài viết tại Xoso.com.vn" />
            </Head>
            <NavBar />
            <h1>Danh sách bài viết</h1>
            <ul>
                {posts.map(post => (
                    <li key={post._id}>
                        <Link href={`/posts/${post._id}`}>
                            {post.title}
                        </Link>
                    </li>
                ))}
            </ul>
            <div>
                <button
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                >
                    Trang trước
                </button>
                <span>Trang {currentPage} / {totalPages}</span>
                <button
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                >
                    Trang sau
                </button>
            </div>
        </div>
    );
}