// pages/register.js
import { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/login.module.css";
import { signIn, useSession } from "next-auth/react";

export default function Register() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [fullname, setfullname] = useState("");

    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <p>Đang tải...</p>;
    }

    if (status === "authenticated") {
        router.push("/posts");
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            // Gọi API đăng ký
            const res = await fetch('http://localhost:5000/api/auth/register', {
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
            const loginRes = await fetch('http://localhost:5000/api/auth/login', {
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
                router.push("/posts");
            }
        } catch (error) {
            setError(error.message || "Đã có lỗi xảy ra khi đăng ký");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.RegisterForm}>
            <h1 className={styles.title}>Đăng ký</h1>
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
                        />
                    </label>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.labelName}>
                        Họ và tên:
                        <input
                            className={styles.inputName}
                            type="text"
                            value={fullname}
                            onChange={(e) => setfullname(e.target.value)}
                            required
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
                        />
                    </label>
                </div>
                {error && <p className={styles.error}>{error}</p>}
                <button className={styles.actionSubmit} type="submit" disabled={isLoading}>
                    {isLoading ? "Đang đăng ký..." : "Đăng ký"}
                </button>
            </form>
        </div>
    );
}