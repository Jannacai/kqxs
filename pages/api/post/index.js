import { getSession } from "next-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export const getPosts = async (context = null, page = 1, limit = 10) => {
    const url = `${API_BASE_URL}/api/posts?page=${page}&limit=${limit}`;
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Cache-Control": "no-cache",
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Có lỗi khi lấy danh sách bài viết: ${response.status} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("getPosts error:", error);
        throw error;
    }
};

export const createPost = async (postData) => {
    const session = await getSession();
    const url = `${API_BASE_URL}/api/posts`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(session?.accessToken && { Authorization: `Bearer ${session.accessToken}` }),
                "Cache-Control": "no-cache",
            },
            body: JSON.stringify({
                title: postData.title,
                description: postData.description,
                img: postData.img || "",
                caption: postData.caption || "",
                img2: postData.img2 || "",
                caption2: postData.caption2 || "",
                category: postData.category || "Thể thao",
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API error:", errorText);
            throw new Error(`Có lỗi khi đăng bài: ${response.status} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("createPost error:", error);
        throw error;
    }
};

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
            console.error("API error:", errorText);
            throw new Error(`Có lỗi khi lấy bài viết: ${response.status} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("getPostById error:", error);
        throw error;
    }
};