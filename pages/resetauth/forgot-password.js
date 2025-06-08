import { useState } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/login.module.css";
import Link from "next/link";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(true);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setMessage("");

        if (!email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
            setError("Email không hợp lệ");
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "ForgotPassword-Client",
                },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Gửi yêu cầu thất bại");
            }

            const data = await res.json();
            setMessage(data.message);
        } catch (error) {
            setError(error.message || "Đã có lỗi xảy ra");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        router.push("/login");
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
                    <h1 className={styles.title}>Quên mật khẩu</h1>
                    <p className={styles.dangky}>
                        Nhập email của bạn để nhận link đặt lại mật khẩu.
                    </p>
                    <form className={styles.formContainer} onSubmit={handleSubmit}>
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
                        {error && <p className={styles.error}>{error}</p>}
                        {message && <p className={styles.success}>{message}</p>}
                        <div className={styles.buttonGroup}>
                            <button
                                className={styles.actionSubmit}
                                type="submit"
                                disabled={isLoading}
                            >
                                {isLoading ? "Đang gửi..." : "Gửi yêu cầu"}
                            </button>
                        </div>
                        <p className={styles.dangky}>
                            Quay lại <Link href="/login">Đăng nhập</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}