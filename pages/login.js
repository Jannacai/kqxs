import { useState, useEffect } from "react";
import { signIn, useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import styles from "../styles/login.module.css";
import Link from "next/link";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(true);
    const router = useRouter();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (session?.error === "RefreshTokenError" || session?.error === "RefreshTokenExpired") {
            signOut({ redirect: false });
            setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }
        if (router.query.error === "SessionExpired") {
            setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }
    }, [session, router.query]);

    if (status === "loading") {
        return <p>Đang tải...</p>;
    }

    if (status === "authenticated") {
        router.push("/");
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        const result = await signIn("credentials", {
            redirect: false,
            username,
            password,
        });
        setIsLoading(false);
        if (result.error) {
            setError(result.error);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        router.push("/");
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.container}>
                <div className={styles.loginForm}>
                    <button
                        className={styles.closeButton}
                        onClick={handleCloseModal}
                        aria-label="Đóng modal"
                    >
                        ✕
                    </button>
                    <h1 className={styles.title}>Đăng nhập</h1>
                    <p className={styles.dangky}>
                        Chưa có tài khoản? <Link href="/register">Đăng ký ngay</Link>
                    </p>
                    <form className={styles.formContainer} onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.labelName}>
                                Tên người dùng:
                                <input
                                    className={styles.inputName}
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    autoComplete="off"
                                    aria-describedby="username-error"
                                />
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.labelPassword}>
                                Mật khẩu:
                                <input
                                    className={styles.inputPassword}
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="off"
                                    aria-describedby="password-error"
                                />
                            </label>
                        </div>
                        {error && <p className={styles.error}>{error}</p>}
                        <div className={styles.buttonGroup}>
                            <button
                                className={styles.actionSubmit}
                                type="submit"
                                disabled={isLoading}
                            >
                                {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                            </button>
                        </div>
                        <p className={styles.dangky}>
                            <Link href="/resetauth/forgot-password">Quên mật khẩu?</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}