import { getSession } from "next-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const getCachedPosts = (key) => {
    const cached = localStorage.getItem(key);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        if (age < 5 * 60 * 1000) {
            return data;
        }
    }
    return null;
};

const setCachedPosts = (key, data) => {
    // Loại bỏ bài viết trùng _id trước khi lưu cache
    const seenIds = new Set();
    const uniquePosts = data.posts
        ? { ...data, posts: data.posts.filter(post => !seenIds.has(post._id) && seenIds.add(post._id)) }
        : data;
    localStorage.setItem(key, JSON.stringify({ data: uniquePosts, timestamp: Date.now() }));
};

export const getPosts = async (context = null, page = 1, limit = 15, category = null, refresh = false) => {
    const cacheKey = `posts:page:${page}:limit:${limit}:category:${category || 'all'}`;
    if (!refresh) {
        const cached = getCachedPosts(cacheKey);
        if (cached) {
            return cached;
        }
    }

    let url = `${API_BASE_URL}/api/posts?page=${page}&limit=${Math.min(limit, 15)}`;
    if (category) {
        url += `&category=${encodeURIComponent(category)}`;
    }
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
        const data = await response.json();
        setCachedPosts(cacheKey, data);
        return data;
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
        const data = await response.json();
        // Xóa tất cả cache trong localStorage liên quan đến posts
        Object.keys(localStorage)
            .filter((key) => key.startsWith("posts:") || key.startsWith("post:"))
            .forEach((key) => localStorage.removeItem(key));
        return data;
    } catch (error) {
        console.error("createPost error:", error);
        throw error;
    }
};

export const getPostById = async (id, refresh = false) => {
    const cacheKey = `post:${id}`;
    if (!refresh) {
        const cached = getCachedPosts(cacheKey);
        if (cached) {
            return cached;
        }
    }

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
        const data = await response.json();
        setCachedPosts(cacheKey, data);
        return data;
    } catch (error) {
        console.error("getPostById error:", error);
        throw error;
    }
};