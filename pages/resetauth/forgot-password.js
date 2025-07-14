import { useState, useEffect, useRef } from "react";
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
    const emailInputRef = useRef(null);

    useEffect(() => {
        emailInputRef.current?.focus();
    }, []);

    const validateEmail = () => {
        if (!email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
            setError("Email không hợp lệ");
            return false;
        }
        if (email.length > 254) {
            setError("Email quá dài");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateEmail()) return;

        setIsLoading(true);
        setError("");
        setMessage("");

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout 10s

            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL3}/api/auth/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "ForgotPassword-Client",
                },
                body: JSON.stringify({ email: email.trim() }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error === "Email not found" ? "Email không tồn tại" :
                    errorData.error === "Invalid email format" ? "Định dạng email không hợp lệ" :
                        "Gửi yêu cầu thất bại");
            }

            setMessage("Link đặt lại mật khẩu đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư hoặc thư rác. Đang chuyển hướng...");
            setTimeout(() => {
                setIsModalOpen(false);
                router.push("/login");
            }, 3000); // Chuyển hướng sau 3 giây
        } catch (error) {
            if (error.name === "AbortError") {
                setError("Yêu cầu hết thời gian, vui lòng thử lại");
            } else {
                setError(error.message || "Đã có lỗi xảy ra khi gửi yêu cầu");
            }
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
                                    ref={emailInputRef}
                                    className={styles.inputName}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value.trim())}
                                    required
                                    autoComplete="off"
                                    aria-describedby="email-error"
                                    disabled={isLoading}
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
                                {isLoading ? (
                                    <span className={styles.loader}>Đang gửi...</span>
                                ) : (
                                    "Gửi yêu cầu"
                                )}
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