// pages/index.js
import { useState } from 'react';
import Regiter from './register'
import NavBar from '../component/navbar';
import KQXS from './kqxsAll/index';
import Calendar from "../component/caledar"
export default function Home(req, res) {
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
        <div className='trangchu'>
            <div className='navigation'>
                <Calendar></Calendar>
            </div>
            <KQXS>{"Miền Bắc"}</KQXS>
        </div>
    );
}

