import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import styles from "../styles/login.module.css";
import Link from "next/link";
import ReCAPTCHA from "react-google-recaptcha";

export default function Register() {
    const [email, setEmail] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullname, setFullname] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(true);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [captchaToken, setCaptchaToken] = useState(null);
    const [codeExpiry, setCodeExpiry] = useState(null);
    const router = useRouter();
    const emailInputRef = useRef(null);
    const codeInputRef = useRef(null);
    const usernameInputRef = useRef(null);
    const recaptchaRef = useRef(null);

    useEffect(() => {
        if (isEmailVerified) {
            usernameInputRef.current?.focus();
        } else {
            emailInputRef.current?.focus();
        }
    }, [isEmailVerified]);

    useEffect(() => {
        if (codeExpiry) {
            const timer = setInterval(() => {
                if (Date.now() > codeExpiry) {
                    setMessage("");
                    setCodeExpiry(null);
                    setVerificationCode("");
                    setCaptchaToken(null);
                    recaptchaRef.current?.reset();
                }
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [codeExpiry]);

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

    const validateInputs = () => {
        if (username.length < 3) {
            setError("Tên đăng nhập phải có ít nhất 3 ký tự");
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

    const handleSendCode = async (e) => {
        e.preventDefault();
        if (!validateEmail()) return;
        if (!captchaToken) {
            setError("Vui lòng xác nhận CAPTCHA");
            return;
        }

        setIsLoading(true);
        setError("");
        setMessage("");

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL3}/api/auth/send-verification-code`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Register-Client",
                    "X-Captcha-Token": captchaToken,
                },
                body: JSON.stringify({ email: email.trim() }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error === "Email already exists" ? "Email đã tồn tại" :
                    errorData.error === "Invalid CAPTCHA token" ? "CAPTCHA không hợp lệ" :
                        "Gửi mã xác thực thất bại");
            }

            setMessage(`Mã xác thực đã được gửi tới ${email}. Vui lòng kiểm tra hộp thư hoặc thư rác.`);
            setCodeExpiry(Date.now() + 10 * 60 * 1000); // 10 phút
            codeInputRef.current?.focus();
        } catch (error) {
            setError(error.message || "Đã có lỗi xảy ra khi gửi mã xác thực");
            setCaptchaToken(null);
            recaptchaRef.current?.reset();
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        if (!verificationCode) {
            setError("Vui lòng nhập mã xác thực");
            return;
        }

        setIsLoading(true);
        setError("");
        setMessage("");

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL3}/api/auth/verify-code`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Register-Client",
                },
                body: JSON.stringify({ email: email.trim(), code: verificationCode }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error === "Verification code has expired" ? "Mã xác thực đã hết hạn" :
                    errorData.error === "Invalid verification code" ? "Mã xác thực không đúng" :
                        "Xác thực mã thất bại");
            }

            setIsEmailVerified(true);
            setMessage("Xác thực email thành công! Vui lòng nhập thông tin đăng ký.");
        } catch (error) {
            setError(error.message || "Đã có lỗi xảy ra khi xác thực mã");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isEmailVerified) {
            setError("Vui lòng xác thực email trước");
            return;
        }
        if (!validateInputs()) return;

        setIsLoading(true);
        setError("");

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL3}/api/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Register-Client",
                },
                body: JSON.stringify({ username, email, fullname, password }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error === "Username already exists" ? "Tên người dùng đã tồn tại" :
                    errorData.error === "Email already exists" ? "Email đã tồn tại" :
                        "Đăng ký thất bại");
            }

            const { accessToken, refreshToken, user } = await res.json();
            sessionStorage.setItem('userInfo', JSON.stringify(user));
            sessionStorage.setItem('accessToken', accessToken);
            sessionStorage.setItem('refreshToken', refreshToken);

            alert("Đăng ký thành công!");
            router.push("/diendan");
        } catch (error) {
            setError(error.message || "Đã có lỗi xảy ra khi đăng ký. Vui lòng thử lại.");
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
                    {!isEmailVerified ? (
                        <form className={styles.formContainer} onSubmit={verificationCode ? handleVerifyCode : handleSendCode}>
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
                                        placeholder="Email dùng để lấy lại mật khẩu khi quên."
                                    />
                                </label>
                            </div>
                            {verificationCode || message ? (
                                <div className={styles.formGroup}>
                                    <label className={styles.labelName}>
                                        Mã xác thực:
                                        <input
                                            ref={codeInputRef}
                                            className={styles.inputName}
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.trim())}
                                            required
                                            autoComplete="off"
                                            aria-describedby="code-error"
                                            disabled={isLoading}
                                        />
                                    </label>
                                    {codeExpiry && (
                                        <p className={styles.dangky}>
                                            Mã hết hạn vào: {new Date(codeExpiry).toLocaleTimeString()}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className={styles.formGroup}>
                                    <ReCAPTCHA
                                        ref={recaptchaRef}
                                        sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                                        onChange={(token) => setCaptchaToken(token)}
                                    />
                                </div>
                            )}
                            {error && <p className={styles.error}>{error}</p>}
                            {message && <p className={styles.success}>{message}</p>}
                            <div className={styles.buttonGroup}>
                                <button
                                    className={styles.actionSubmit}
                                    type="submit"
                                    disabled={isLoading || (!verificationCode && !captchaToken)}
                                >
                                    {isLoading ? (
                                        <span className={styles.loader}>
                                            {verificationCode ? "Đang xác thực..." : "Đang gửi..."}
                                        </span>
                                    ) : (
                                        verificationCode ? "Xác thực mã" : "Gửi mã xác thực"
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form className={styles.formContainer} onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label className={styles.labelName}>
                                    Tên đăng nhập:
                                    <input
                                        ref={usernameInputRef}
                                        className={styles.inputName}
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.trim())}
                                        required
                                        autoComplete="off"
                                        aria-describedby="username-error"
                                        disabled={isLoading}
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
                                        onChange={(e) => setFullname(e.target.value.trim())}
                                        required
                                        autoComplete="off"
                                        aria-describedby="fullname-error"
                                        disabled={isLoading}
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
                                        <span className={styles.loader}>Đang đăng ký...</span>
                                    ) : (
                                        "Đăng ký"
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                    <p className={styles.dangky}>
                        Quay lại <Link href="/">Trang chủ</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}