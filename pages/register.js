// pages/index.js
import { useState } from 'react';

export default function Home() {
    const [username, setName] = useState('');
    const [password, setEmail] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:5000/api/auth/register', { // Đường dẫn API back-end của bạn
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            console.log('Success:', data);
            // Xử lý kết quả trả về từ back-end
        } catch (error) {
            console.error('Error:', error);
            // Xử lý lỗi
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <label>
                Name:
                <input type="text" value={username} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
                Email:
                <input type="number" value={password} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button type="submit">Submit</button>
        </form>
    );
}

