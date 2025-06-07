import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createPost } from "../pages/api/post/index";
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
    image: z
        .string()
        .url("Vui lòng nhập một URL hợp lệ")
        .optional()
        .or(z.literal("")),
});

const CreatePost = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [previewUrl, setPreviewUrl] = useState("");

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
            image: "",
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

    if (session.user.role !== "ADMIN") {
        return <p>Bạn không có quyền đăng bài. Chỉ quản trị viên (ADMIN) được phép.</p>;
    }

    const handleImageChange = debounce((event) => {
        const url = event.target.value;
        setPreviewUrl(url || "");
    }, 300);

    const onSubmit = async (data) => {
        try {
            const postData = {
                title: data.title,
                description: data.description,
                img: data.image || "",
            };
            console.log("Submitting postData:", postData);
            await createPost(postData);
            reset();
            setPreviewUrl("");
            toast.success("Đăng bài thành công!");
        } catch (error) {
            console.error("Submit error:", error);
            if (error.message.includes("Invalid token")) {
                await signOut({ redirect: false });
                router.push("/login");
                return;
            }
            toast.error(error.message || "Đã có lỗi xảy ra khi đăng bài");
        }
    };

    return (
        <div className={styles.container}>
            <ToastContainer />
            <div className={styles.header}>
                <h1 className={styles.Create_postTitle}>Đăng Bài Tin Tức Thể Thao</h1>
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
                        <span className={styles.titleGroup}>URL Hình Ảnh (Nếu Có)</span>
                        <input
                            id="imageInput"
                            {...register("image")}
                            type="text"
                            placeholder="Nhập URL hình ảnh"
                            className={styles.inputGroup_title}
                            onChange={handleImageChange}
                            aria-describedby="image-error"
                        />
                        {errors.image && (
                            <span id="image-error" className={styles.error}>{errors.image.message}</span>
                        )}
                        {previewUrl && (
                            <img
                                id="imagePreview"
                                src={previewUrl}
                                alt="Xem trước hình ảnh bài viết"
                                className={styles.labelGroupIMG}
                                onError={(e) => { e.target.src = ""; }}
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