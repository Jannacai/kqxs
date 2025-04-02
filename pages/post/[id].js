// pages/posts/[id].js
import Head from 'next/head';
import NavBar from '../../components/NavBar';
import styles from '../../styles/LotteryPage.module.css';

export async function getStaticPaths() {
    const res = await fetch(`${process.env.BACKEND_URL}/api/posts`);
    const posts = await res.json();
    const paths = posts.map(post => ({
        params: { id: post._id },
    }));
    return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
    const res = await fetch(`${process.env.BACKEND_URL}/api/posts/${params.id}`);
    const post = await res.json();
    return {
        props: {
            post,
        },
        revalidate: 60,
    };
}

export default function Post({ post }) {
    return (
        <div className={styles.container}>
            <Head>
                <title>{post.title} - Xoso.com.vn</title>
                <meta name="description" content={post.content.slice(0, 150)} />
            </Head>
            <NavBar />
            <h1>{post.title}</h1>
            <p>Tác giả: {post.author.username}</p>
            <p>Ngày đăng: {new Date(post.createdAt).toLocaleDateString('vi-VN')}</p>
            <div>{post.content}</div>
        </div>
    );
}