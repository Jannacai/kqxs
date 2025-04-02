// pages/logout.js
import { signOut } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Logout() {
    const router = useRouter();

    useEffect(() => {
        signOut({ callbackUrl: '/' });
    }, [router]);

    return <p>Đang đăng xuất...</p>;
}