import { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/login.module.css";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";

export default function Register() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [fullname, setFullname] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(true);
    const router = useRouter();
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <p>Đang tải...</p>;
    }

    if (status === "authenticated") {
        router.push("/dang-bai-viet");
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            // Gọi API đăng ký
            const res = await fetch('https://backendkqxs.onrender.com/api/auth/register', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, fullname, password }),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Request failed with status ${res.status}: ${text}`);
            }

            // Gọi API đăng nhập để lấy thông tin phù hợp với NextAuth
            const loginRes = await fetch('https://backendkqxs.onrender.com/api/auth/login', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, fullname, password }),
            });

            if (!loginRes.ok) {
                const text = await loginRes.text();
                throw new Error(`Login failed with status ${loginRes.status}: ${text}`);
            }

            // Đăng nhập tự động bằng NextAuth
            const result = await signIn("credentials", {
                redirect: false,
                username,
                fullname,
                password,
            });

            if (result.error) {
                setError(result.error);
            } else {
                router.push("/dang-bai-viet");
            }
        } catch (error) {
            setError(error.message || "Đã có lỗi xảy ra khi đăng ký");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        router.push("/");
    };

    if (!isModalOpen) {
        return null;
    }

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
                    <h1 className={styles.title}>Đăng ký</h1>
                    <p className={styles.dangky}>
                        Đã có tài khoản? <Link href="/login">Đăng nhập ngay</Link>
                    </p>
                    <form className={styles.formContainer} onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.labelName}>
                                Tên đăng nhập:
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
                            <label className={styles.labelName}>
                                Biệt Danh:
                                <input
                                    className={styles.inputName}
                                    type="text"
                                    value={fullname}
                                    onChange={(e) => setFullname(e.target.value)}
                                    required
                                    autoComplete="off"
                                    aria-describedby="fullname-error"
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
                                {isLoading ? "Đang đăng ký..." : "Đăng ký"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}