// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { jwtDecode } from "jwt-decode"; // Sửa import: dùng named export jwtDecode
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backendkqxs.onrender.com';

export default NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const { username, password } = credentials;

                const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ username, password }),
                });

                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.error || "Đăng nhập thất bại");
                }

                const user = await res.json();
                if (user) {
                    return {
                        id: user.user.id,
                        username: user.user.username,
                        role: user.user.role,
                        accessToken: user.accessToken,
                        refreshToken: user.refreshToken,
                    };
                }

                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.accessToken = user.accessToken;
                token.refreshToken = user.refreshToken;
                token.userId = user.id;
                token.username = user.username;
                token.role = user.role;
            }

            // Kiểm tra access token có hết hạn không
            try {
                const decoded = jwtDecode(token.accessToken); // Sửa: dùng jwtDecode thay vì jwt_decode
                const now = Date.now() / 1000;
                if (decoded.exp > now) {
                    console.log("Access token still valid");
                    return token;
                }

                // Access token hết hạn, gọi API refresh token
                console.log("Access token expired, refreshing...");
                const res = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ refreshToken: token.refreshToken }),
                });

                if (!res.ok) {
                    const error = await res.json();
                    console.error("Failed to refresh token:", error);
                    throw new Error("Failed to refresh token");
                }

                const data = await res.json();
                token.accessToken = data.accessToken;
                console.log("Access token refreshed:", token.accessToken);
                return token;
            } catch (error) {
                console.error("Error in jwt callback:", error.message);
                token.error = "RefreshTokenError";
                return token;
            }
        },
        async session({ session, token }) {
            session.user.id = token.userId;
            session.user.username = token.username;
            session.user.role = token.role;
            session.accessToken = token.accessToken;
            session.refreshToken = token.refreshToken;
            session.error = token.error;
            return session;
        },
    },
    pages: {
        signIn: "/login",
        signOut: "/logout",
        error: "/auth/error",
    },
    secret: process.env.NEXTAUTH_SECRET,
});