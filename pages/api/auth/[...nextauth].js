// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';

export default NextAuth({
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: 'Username', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                try {
                    const res = await axios.post(`${process.env.BACKEND_URL}/api/auth/login`, {
                        username: credentials.username,
                        password: credentials.password,
                    });
                    if (res.data.token) {
                        return { token: res.data.token };
                    }
                    return null;
                } catch (error) {
                    throw new Error('Invalid credentials');
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.accessToken = user.token;
            }
            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken;
            return session;
        },
    },
    pages: {
        signIn: '/login',
        signOut: '/logout',
    },
});