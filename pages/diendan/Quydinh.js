"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Link from 'next/link';
import styles from '../../styles/quydinh.module.css';



const Quydinh = () => {

    return (
        <div className={styles.Quydinh}>
            <h2 className={styles.title}>Quy Định</h2>
            <p className={styles.quydinhContent}></p>
            <h2 className={styles.title}>Hướng Dẫn</h2>

        </div>
    );
};

export default Quydinh;