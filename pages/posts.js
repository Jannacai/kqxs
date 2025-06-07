import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createPost, getPosts } from "../pages/api/post/index";
import styles from "../styles/createPost.module.css";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { debounce } from 'lodash';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const postSchema = z.object({
    title: z
        .string()
        .min(5, "Tiêu đề phải có ít nhất 5 ký tự")
        .max(100, "Tiêu đề không được dài quá 100 ký tự")
        .nonempty("Tiêu đề không được để trống"),
    description: z
        .string()
        .min(20, "Nội dung phải có ít nhất 20 ký tự")
        .nonempty("Nội dung không được để trống"),
    img: z
        .string()
        .url("Vui lòng nhập một URL hợp lệ")
        .optional()
        .or(z.literal("")),
    caption: z
        .string()
        .max(100, "Chú thích không được dài quá 100 ký tự")
        .optional()
        .or(z.literal("")),
    img2: z
        .string()
        .url("Vui lòng nhập một URL hợp lệ")
        .optional()
        .or(z.literal("")),
    caption2: z
        .string()
        .max(100, "Chú thích không được dài quá 100 ký tự")
        .optional()
        .or(z.literal("")),
    category: z.enum(["Thể thao", "Đời sống"], {
        required_error: "Vui lòng chọn một chủ đề"
    })
});

const CreatePost = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewUrl2, setPreviewUrl2] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm({
        resolver: zodResolver(postSchema),
        defaultValues: {
            title: "",
            description: "",
            img: "",
            caption: "",
            img2: "",
            caption2: "",
            category: "Thể thao"
        },
    });

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    if (status === "loading") {
        return <p>Đang tải session...</p>;
    }

    if (status === "unauthenticated") {
        return null;
    }

    if (session?.user?.role !== "ADMIN") {
        return <p>Bạn không có quyền đăng bài. Chỉ quản trị viên (ADMIN) được phép.</p>;
    }

    const handleImageChange = debounce((event, isSecondImage = false) => {
        const url = event.target.value;
        if (isSecondImage) {
            setPreviewUrl2(url || "");
        } else {
            setPreviewUrl(url || "");
        }
    }, 300);

    const onSubmit = async (data) => {
        try {
            const postData = {
                title: data.title,
                description: data.description,
                img: data.img || "",
                caption: data.caption || "",
                img2: data.img2 || "",
                caption2: data.caption2 || "",
                category: data.category
            };
            console.log("Sending postData:", postData);
            const response = await createPost(postData);
            console.log("Create post response:", response);
            reset();
            setPreviewUrl("");
            setPreviewUrl2("");
            toast.success("Đăng bài thành công!", {
                position: "top-right",
                autoClose: 3000,
            });
            try {
                const updatedPosts = await getPosts(null, 1, 10);
                router.push('/posts');
            } catch (error) {
                console.error("Error refreshing posts:", error);
                toast.error("Không thể làm mới danh sách bài viết", {
                    position: "top-right",
                    autoClose: 5000,
                });
            }
        } catch (error) {
            console.error("Submit error:", error);
            if (error.message.includes("Invalid token")) {
                await signOut({ redirect: false });
                router.push("/login");
                return;
            }
            toast.error(error.message || "Đã có lỗi xảy ra khi đăng bài", {
                position: "top-right",
                autoClose: 5000,
            });
        }
    };

    return (
        <div className={styles.container}>
            <ToastContainer />
            <div className={styles.header}>
                <h1 className={styles.Create_postTitle}>Đăng Bài Tin Tức</h1>
            </div>
            <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
                <form onSubmit={handleSubmit(onSubmit)} className={styles.formGroup} aria-label="Form đăng bài">
                    <div className={styles.Group}>
                        <label htmlFor="title" className={styles.labelGroup}>
                            <span className={styles.titleGroup}>Tiêu đề bài viết</span>
                            <input
                                id="title"
                                {...register("title")}
                                type="text"
                                className={styles.inputGroup_title}
                                aria-describedby="title-error"
                            />
                            {errors.title && (
                                <span id="title-error" className={styles.error}>{errors.title.message}</span>
                            )}
                        </label>
                    </div>

                    <div className={styles.Group}>
                        <label htmlFor="description" className={styles.labelGroup}>
                            <span className={styles.titleGroup}>Nội dung bài viết</span>
                            <textarea
                                id="description"
                                {...register("description")}
                                className={styles.inputGroup_desc}
                                rows={10}
                                aria-describedby="description-error"
                            />
                            {errors.description && (
                                <span id="description-error" className={styles.error}>{errors.description.message}</span>
                            )}
                        </label>
                    </div>

                    <div className={styles.Group}>
                        <span className={styles.titleGroup}>Chủ đề</span>
                        <div className={styles.checkboxGroup}>
                            <label>
                                <input
                                    type="radio"
                                    value="Thể thao"
                                    {...register("category")}
                                    defaultChecked
                                />
                                Thể thao
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    value="Đời sống"
                                    {...register("category")}
                                />
                                Đời sống
                            </label>
                            {errors.category && (
                                <span id="category-error" className={styles.error}>{errors.category.message}</span>
                            )}
                        </div>
                    </div>

                    <div className={styles.Group}>
                        <span className={styles.titleGroup}>URL Hình Ảnh 1 (Nếu Có)</span>
                        <input
                            id="imageInput"
                            {...register("img")}
                            type="text"
                            placeholder="Nhập URL hình ảnh 1"
                            className={styles.inputGroup_title}
                            onChange={(e) => handleImageChange(e, false)}
                            aria-describedby="img-error"
                        />
                        {errors.img && (
                            <span id="img-error" className={styles.error}>{errors.img.message}</span>
                        )}
                        <label htmlFor="caption" className={styles.labelGroup}>
                            <span className={styles.titleGroup}>Chú thích Hình Ảnh 1</span>
                            <input
                                id="caption"
                                {...register("caption")}
                                type="text"
                                placeholder="Nhập chú thích cho hình ảnh 1"
                                className={styles.inputGroup_title}
                                aria-describedby="caption-error"
                            />
                            {errors.caption && (
                                <span id="caption-error" className={styles.error}>{errors.caption.message}</span>
                            )}
                        </label>
                        {previewUrl && (
                            <img
                                id="imagePreview"
                                src={previewUrl}
                                alt="Xem trước hình ảnh bài viết 1"
                                className={styles.labelGroupIMG}
                                loading="lazy"
                                onError={(e) => { e.target.src = "/placeholder.png"; }}
                            />
                        )}
                    </div>

                    <div className={styles.Group}>
                        <span className={styles.titleGroup}>URL Hình Ảnh 2 (Nếu Có)</span>
                        <input
                            id="imageInput2"
                            {...register("img2")}
                            type="text"
                            placeholder="Nhập URL hình ảnh 2"
                            className={styles.inputGroup_title}
                            onChange={(e) => handleImageChange(e, true)}
                            aria-describedby="img2-error"
                        />
                        {errors.img2 && (
                            <span id="img2-error" className={styles.error}>{errors.img2.message}</span>
                        )}
                        <label htmlFor="caption2" className={styles.labelGroup}>
                            <span className={styles.titleGroup}>Chú thích Hình Ảnh 2</span>
                            <input
                                id="caption2"
                                {...register("caption2")}
                                type="text"
                                placeholder="Nhập chú thích cho hình ảnh 2"
                                className={styles.inputGroup_title}
                                aria-describedby="caption2-error"
                            />
                            {errors.caption2 && (
                                <span id="caption2-error" className={styles.error}>{errors.caption2.message}</span>
                            )}
                        </label>
                        {previewUrl2 && (
                            <img
                                id="imagePreview2"
                                src={previewUrl2}
                                alt="Xem trước hình ảnh bài viết 2"
                                className={styles.labelGroupIMG}
                                loading="lazy"
                                onError={(e) => { e.target.src = "/placeholder.png"; }}
                            />
                        )}
                    </div>

                    <button className={styles.submitForm} type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Đang đăng..." : "Hoàn Thành"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreatePost;