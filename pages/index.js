// pages/index.js
import { useState } from 'react';
import Regiter from './register'
import NavBar from '../component/navbar';
import KQXS from './kqxsAll/index';
import Calendar from "../component/caledar"
import ListPost from '../component/listPost';
import ThongKe from '../component/thongKe';
import ListXSMT from '../component/listXSMT';
import ListXSMB from '../component/listXSMB';
import ListXSMN from '../component/listXSMN';
import PostList from './post/list';
import TableDate from '../component/tableDateKQXS';
import Footer from '../component/footer';

export default function Home(req, res) {
    const [username, setName] = useState('');
    const [password, setEmail] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('https://backendkqxs.onrender.com/api/auth/register', { // Đường dẫn API back-end của bạn
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
        <div>

            <div className='container'>
                <div className='navigation'>
                    <Calendar></Calendar>
                    <ListXSMB></ListXSMB>
                    <ListXSMT></ListXSMT>
                    <ListXSMN></ListXSMN>
                </div>
                <div>
                    <TableDate></TableDate>
                    <KQXS>{"Miền Bắc"}</KQXS>
                </div>

                <ThongKe></ThongKe>
            </div>
            <div className='container'>
                <PostList></PostList>
            </div>

        </div>
    );
}

