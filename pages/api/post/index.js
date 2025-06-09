const { getSession } = require("next-auth/react");

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const getCachedPosts = (key) => {
    const cached = localStorage.getItem(key);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        if (age < 15 * 60 * 1000) {
            return data;
        }
    }
    return null;
};

const setCachedPosts = (key, data) => {
    const seenIds = new Set();
    const uniquePosts = data.posts
        ? { ...data, posts: data.posts.filter(post => !seenIds.has(post._id) && seenIds.add(post._id)) }
        : data;
    localStorage.setItem(key, JSON.stringify({ data: uniquePosts, timestamp: Date.now() }));
};

const clearCombinedCache = () => {
    Object.keys(localStorage)
        .filter((key) => key.startsWith("combined:"))
        .forEach((key) => localStorage.removeItem(key));
};

export const uploadToDrive = async (formData) => {
    const session = await getSession();
    const url = `${API_BASE_URL}/api/posts/upload-to-drive`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                ...(session?.accessToken && { Authorization: `Bearer ${session.accessToken}` }),
                "Cache-Control": "no-cache",
            },
            body: formData,
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API error:", errorText);
            throw new Error(`Có lỗi khi tải ảnh lên: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("uploadToDrive error:", error);
        throw error;
    }
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
            throw new Error(` personally, I think there's an error fetching posts: ${response.status} - ${errorText}`);
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
                mainContents: postData.mainContents || [],
                category: postData.category,
                contentOrder: postData.contentOrder || [],
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API error:", errorText);
            throw new Error(`Có lỗi khi đăng bài: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        Object.keys(localStorage)
            .filter((key) => key.startsWith("posts:") || key.startsWith("post:"))
            .forEach((key) => localStorage.removeItem(key));
        clearCombinedCache();
        window.dispatchEvent(new CustomEvent('newPostCreated', { detail: data }));
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

export const getCombinedPostData = async (id, refresh = false) => {
    const cacheKey = `combined:${id}`;
    if (!refresh) {
        const cached = getCachedPosts(cacheKey);
        if (cached) {
            return cached;
        }
    }

    const actualId = id.includes('-') ? id.split('-').pop() : id;
    const url = `${API_BASE_URL}/api/posts/combined/${actualId}`;
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
            throw new Error(`Có lỗi khi lấy dữ liệu bài viết: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        setCachedPosts(cacheKey, data);
        return data;
    } catch (error) {
        console.error("getCombinedPostData error:", error);
        throw error;
    }
};

export const getCategories = async () => {
    const url = `${API_BASE_URL}/api/posts/categories`;
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Cache-Control": "no-cache",
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Có lỗi khi lấy danh sách danh mục: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        return data.categories;
    } catch (error) {
        console.error("getCategories error:", error);
        throw error;
    }
};