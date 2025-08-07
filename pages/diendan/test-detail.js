"use client";
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function TestDetail() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to a test event detail page
        router.push('/diendan/events/EventHotNewsDetail?id=test123');
    }, [router]);

    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2>Đang chuyển hướng đến trang chi tiết sự kiện...</h2>
            <p>Nếu không tự động chuyển hướng, vui lòng click vào link bên dưới:</p>
            <a href="/diendan/events/EventHotNewsDetail?id=test123" style={{ color: 'blue', textDecoration: 'underline' }}>
                Xem chi tiết sự kiện test
            </a>
        </div>
    );
}
