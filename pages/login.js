// pages/login.js
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import styles from '../assets/css/navbar.module.csss';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await signIn('credentials', {
            redirect: false,
            username,
            password,
        });
        if (result.error) {
            setError(result.error);
        } else {
            router.push('/');
        }
    };

    return (
        <div className={styles.navbar}>
            <h1>Đăng nhập</h1>
            {error && <p className={styles.navbar}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Tên người dùng:</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Mật khẩu:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Đăng nhập</button>
            </form>
        </div>
    );
}