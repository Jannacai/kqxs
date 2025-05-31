// pages/api/postApi.js
import { getSession } from "next-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backendkqxs.onrender.com";

export const getPosts = async (context) => {
    const session = await getSession(context);
    const url = `${API_BASE_URL}/api/posts`;
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Cache-Control": "no-cache",
                Authorization: `Bearer ${session?.accessToken}`,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Có lỗi khi lấy danh sách bài viết: ${response.status} - ${errorText}`);
        }
        const result = await response.json();
        return result;
    } catch (error) {
        throw error;
    }
};

export const createPost = async (postData) => {
    const session = await getSession();
    const url = `${API_BASE_URL}/api/posts`;
    try {
        const formData = new FormData();
        formData.append("title", postData.title);
        formData.append("description", postData.description);
        if (postData.img) {
            formData.append("img", postData.img);
        }
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${session?.accessToken}`,
                "Cache-Control": "no-cache",
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Có lỗi khi đăng bài: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        throw error;
    }
};

// Thêm hàm getPostById
// Sửa hàm getPostById để không yêu cầu access token
export const getPostById = async (id) => {
    const url = `${API_BASE_URL}/api/posts/${id}`;
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Cache-Control": "no-cache",
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Có lỗi khi lấy bài viết: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        throw error;
    }
};