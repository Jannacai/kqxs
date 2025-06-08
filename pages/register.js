import { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/login.module.css";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";

export default function Register() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
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

    const validateInputs = () => {
        if (username.length < 3) {
            setError("Tên đăng nhập phải có ít nhất 3 ký tự");
            return false;
        }
        if (!email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
            setError("Email không hợp lệ");
            return false;
        }
        if (fullname.length < 3) {
            setError("Biệt danh phải có ít nhất 3 ký tự");
            return false;
        }
        if (password.length < 8) {
            setError("Mật khẩu phải có ít nhất 8 ký tự");
            return false;
        }
        if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*]/.test(password)) {
            setError("Mật khẩu phải chứa chữ thường, chữ hoa, số và ký tự đặc biệt");
            return false;
        }
        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        if (!validateInputs()) {
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Register-Client",
                },
                body: JSON.stringify({ username, email, fullname, password }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Đăng ký thất bại: ${res.status}`);
            }

            const { accessToken, refreshToken, user } = await res.json();

            await new Promise((resolve) => setTimeout(resolve, 500));

            const result = await signIn("credentials", {
                redirect: false,
                username,
                password,
            });

            if (result.error) {
                console.error("SignIn error:", result.error);
                throw new Error(result.error);
            }

            alert("Đăng ký thành công!");
            sessionStorage.setItem('userInfo', JSON.stringify(user));
            router.push("/dang-bai-viet");
        } catch (error) {
            console.error("Register error:", error.message);
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
                                Email:
                                <input
                                    className={styles.inputName}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="off"
                                    aria-describedby="email-error"
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
                        <div className={styles.formGroup}>
                            <label className={styles.labelPassword}>
                                Xác nhận mật khẩu:
                                <input
                                    className={styles.inputPassword}
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    autoComplete="off"
                                    aria-describedby="confirm-password-error"
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