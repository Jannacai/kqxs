import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/login.module.css";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";

export default function ResetPassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(true);
    const [isVerifying, setIsVerifying] = useState(true);
    const [tokenExpiry, setTokenExpiry] = useState(null);
    const router = useRouter();
    const passwordInputRef = useRef(null);

    useEffect(() => {
        if (!router.isReady) return;

        const queryToken = router.query.token;
        if (queryToken) {
            setToken(queryToken);
        }

        const verifyToken = async () => {
            if (!queryToken) {
                setError("Vui lòng nhập mã token từ email");
                setIsVerifying(false);
                return;
            }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL3}/api/auth/reset-password`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "ResetPassword-Client",
                    },
                    body: JSON.stringify({ token: queryToken }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "Token không hợp lệ");
                }

                const decoded = jwtDecode(queryToken);
                setTokenExpiry(new Date(decoded.exp * 1000));
                passwordInputRef.current?.focus();
            } catch (err) {
                setError(err.name === "AbortError" ? "Yêu cầu hết thời gian, vui lòng thử lại" :
                    err.message === "Token has expired" ? "Token đã hết hạn" :
                        err.message === "Invalid token" ? "Token không hợp lệ" :
                            "Đã có lỗi xảy ra khi kiểm tra token");
                setIsModalOpen(false);
                setTimeout(() => router.push("/login"), 3000);
            } finally {
                setIsVerifying(false);
            }
        };

        verifyToken();
    }, [router.isReady, router.query.token]);

    const validateInputs = () => {
        if (!token) {
            setError("Mã token là bắt buộc");
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
        if (!validateInputs()) return;

        setIsLoading(true);
        setError("");
        setMessage("");

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL3}/api/auth/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "ResetPassword-Client",
                },
                body: JSON.stringify({ token, newPassword: password }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Đặt lại mật khẩu thất bại");
            }

            setMessage("Đặt lại mật khẩu thành công! Đang chuyển hướng...");
            setTimeout(() => router.push("/login"), 10000);
        } catch (error) {
            setError(error.name === "AbortError" ? "Yêu cầu hết thời gian, vui lòng thử lại" :
                error.message === "Token has expired" ? "Token đã hết hạn" :
                    error.message === "Invalid token" ? "Token không hợp lệ" :
                        "Đã có lỗi xảy ra khi đặt lại mật khẩu");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        router.push("/login");
    };

    if (isVerifying) {
        return (
            <div className={styles.modalOverlay}>
                <div className={styles.container}>
                    <div className={styles.loader}>Đang kiểm tra token...</div>
                </div>
            </div>
        );
    }

    if (!isModalOpen) {
        return (
            <div className={styles.modalOverlay}>
                <div className={styles.container}>
                    <p className={styles.error}>{error}</p>
                    <p className={styles.dangky}>
                        Quay lại <Link href="/login">Đăng nhập</Link> hoặc{" "}
                        <Link href="/resetauth/forgot-password">Gửi lại link đặt lại mật khẩu</Link>
                    </p>
                </div>
            </div>
        );
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
                    <h1 className={styles.title}>Đặt lại mật khẩu</h1>
                    <p className={styles.dangky}>
                        Nhập mật khẩu mới của bạn.
                        {tokenExpiry && (
                            <span> Link hết hạn vào: {tokenExpiry.toLocaleString()}</span>
                        )}
                    </p>
                    <form className={styles.formContainer} onSubmit={handleSubmit}>
                        {!router.query.token && (
                            <div className={styles.formGroup}>
                                <label className={styles.labelToken}>
                                    Mã token:
                                    <input
                                        className={styles.inputToken}
                                        type="text"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        required
                                        autoComplete="off"
                                        aria-describedby="token-error"
                                        disabled={isLoading}
                                    />
                                </label>
                            </div>
                        )}
                        <div className={styles.formGroup}>
                            <label className={styles.labelPassword}>
                                Mật khẩu mới:
                                <input
                                    ref={passwordInputRef}
                                    className={styles.inputPassword}
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="off"
                                    aria-describedby="password-error"
                                    disabled={isLoading}
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
                                    <span className={styles.loader}>Đang cập nhật...</span>
                                ) : (
                                    "Cập nhật mật khẩu"
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