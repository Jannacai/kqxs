// pages/posts.js
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createPost } from "../pages/api/post/index"; // Đảm bảo đường dẫn này đúng
import styles from "../styles/createPost.module.css"; // Đảm bảo đường dẫn này đúng
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react"; // Import useState

// Schema validation (Giữ nguyên như code gốc của bạn)
const postSchema = z.object({
    title: z
        .string()
        .min(5, "Tiêu đề phải có ít nhất 5 ký tự")
        .max(100, "Tiêu đề không được dài quá 100 ký tự")
        .nonempty("Tiêu đề không được để trống"),
    description: z // Trường này là nội dung chính trong code gốc
        .string()
        .min(20, "Nội dung phải có ít nhất 20 ký tự")
        .nonempty("Nội dung không được để trống"),
    image: z
        .any()
        .optional()
        .refine( /* ... các refine rules như cũ ... */
            (files) => {
                if (!files || !(files instanceof FileList) || files.length === 0) return true;
                return files[0] instanceof File;
            }, { message: "Vui lòng chọn một file hợp lệ" }
        )
        .refine(
            (files) => {
                if (!files || !(files instanceof FileList) || files.length === 0) return true;
                return files[0].size <= 5 * 1024 * 1024;
            }, { message: "Hình ảnh phải nhỏ hơn 5MB" }
        )
        .refine(
            (files) => {
                if (!files || !(files instanceof FileList) || files.length === 0) return true;
                return ["image/jpeg", "image/png"].includes(files[0].type); // Giữ nguyên type gốc
            }, { message: "Chỉ chấp nhận file JPEG hoặc PNG" }
        ),
});

const CreatePost = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    // Bỏ state liên quan user info nếu không dùng trực tiếp
    // const [userInfo, setUserInfo] = useState(null);
    // const [isLoadingUser, setIsLoadingUser] = useState(true);
    // const [fetchError, setFetchError] = useState(null);

    // --- THÊM STATE CHO ẢNH PREVIEW ---
    // const defaultImageUrl = "https://th.bing.com/th/id/OIP.l0ai3Gemc84mnwkfBwywrAHaHa?rs=1&pid=ImgDetMain";
    const defaultImageUrl = "";
    const [previewUrl, setPreviewUrl] = useState("");
    // ------------------------------------

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        // Không cần watch hay setValue nếu chỉ sửa preview
    } = useForm({
        resolver: zodResolver(postSchema),
        defaultValues: {
            title: "",
            description: "", // Giữ nguyên field này cho nội dung
            image: undefined,
        },
    });

    // --- THÊM useEffect DỌN DẸP OBJECT URL ---
    useEffect(() => {
        // Hàm cleanup sẽ chạy khi component unmount hoặc previewUrl thay đổi
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);
    // ---------------------------------------

    // Bỏ useEffect fetchUserInfo nếu không cần
    // useEffect(() => { ... }, [status, session, router]);

    // --- Kiểm tra trạng thái session (Giữ nguyên) ---
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
    // ---------------------------------------------

    // --- THÊM HÀM XỬ LÝ IMAGE CHANGE ---
    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            const newPreviewUrl = URL.createObjectURL(file);
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(newPreviewUrl);
        } else {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(defaultImageUrl);
        }
    };
    // ------------------------------------

    // onSubmit giữ nguyên cấu trúc gửi dữ liệu như code gốc của bạn
    // Chỉ thêm phần reset ảnh preview
    const onSubmit = async (data) => {
        console.log("Form submitted with data:", data);
        try {
            // Giữ nguyên cấu trúc postData như ban đầu của bạn
            const postData = {
                title: data.title,
                description: data.description, // Nội dung chính theo code gốc
                img: data.image && data.image.length > 0 ? data.image[0] : undefined, // Gửi đối tượng File
                token: session.accessToken,
            };
            console.log("Sending postData (Original Structure):", postData);

            // Lưu ý: Hàm createPost của bạn cần xử lý được việc nhận đối tượng File trong postData.img
            // Nếu createPost chỉ nhận URL, bạn cần upload ảnh lên đâu đó (ví dụ Cloudinary) *trước khi* gọi createPost
            // và gửi URL ảnh thay vì đối tượng File. Tuy nhiên, để "không sửa gì thêm", ta giữ nguyên việc gửi File object.
            const result = await createPost(postData);
            console.log("API response:", result);

            reset(); // Reset trường text
            // --- THÊM reset ảnh preview ---
            setPreviewUrl(defaultImageUrl);
            // Cần reset cả input file value để có thể chọn lại cùng file
            const fileInput = document.getElementById('imageInput'); // Dùng ID đã sửa
            if (fileInput) {
                fileInput.value = ''; // Cách đơn giản để reset input file
            }
            // ---------------------------

            alert("Đăng bài thành công!");
            // Có thể thêm chuyển hướng nếu muốn
            // router.push('/posts/list');
        } catch (error) {
            // ... (Error handling giữ nguyên như code gốc) ...
            console.error("Error in onSubmit:", error.message);
            if (error.message.includes("Invalid token")) {
                await signOut({ redirect: false });
                router.push("/login");
                return;
            }
            alert(error.message || "Đã có lỗi xảy ra khi đăng bài");
        }
    };

    // ... (handleLogout nếu cần) ...

    return (
        // Bỏ class styles.authenticated nếu không dùng
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.Create_postTitle}>Đăng Bài Tin Tức Thể Thao</h1>
            </div>
            <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className={styles.formGroup}
                    // Giữ lại encType nếu hàm createPost của bạn xử lý multipart/form-data truyền thống
                    encType="multipart/form-data"
                >
                    {/* Input Tiêu đề (Giữ nguyên) */}
                    <div className={styles.Group}>
                        <label htmlFor="title" className={styles.labelGroup}>
                            <span className={styles.titleGroup}>Tiêu đề bài viết</span>
                            <input
                                id="title"
                                {...register("title")}
                                type="text"
                                className={styles.inputGroup_title}
                            />
                            {errors.title && <span className={styles.error}>{errors.title.message}</span>}
                        </label>
                    </div>

                    {/* Input Nội dung (Giữ nguyên là description) */}
                    <div className={styles.Group}>
                        <label htmlFor="description" className={styles.labelGroup}>
                            <span className={styles.titleGroup}>Nội dung bài viết</span>
                            <textarea
                                id="description"
                                {...register("description")}
                                className={styles.inputGroup_desc}
                                rows={10} // Tăng số dòng nếu muốn
                            />
                            {errors.description && (
                                <span className={styles.error}>{errors.description.message}</span>
                            )}
                        </label>
                    </div>

                    {/* Input Hình Ảnh và Preview (Đã sửa logic) */}
                    <div className={styles.Group}>
                        <span className={styles.titleGroup}>Thêm Hình Ảnh (Nếu Có)</span>

                        {(() => {

                            const { onChange: rhfOnChange, ...restRegister } = register("image");
                            return (
                                <input
                                    hidden
                                    id="imageInput" // Sửa ID
                                    type="file"
                                    {...restRegister}
                                    onChange={(e) => {
                                        rhfOnChange(e); // Gọi hàm của react-hook-form
                                        handleImageChange(e); // Gọi hàm xử lý preview
                                    }}
                                    // Giữ class cũ
                                    accept="image/jpeg,image/png" // Giữ accept cũ
                                />
                            );
                        })()}
                        {/* -------------------- */}
                        {errors.image && <span className={styles.error}>{errors.image.message}</span>}

                        {/* --- SỬA LABEL VÀ IMG --- */}
                        <label htmlFor="imageInput">
                            <div className={styles.groupIcon}>
                                <span className={styles.icon}>Thêm Hình Ảnh Tại Đây <i class="fa-solid fa-download"></i></span>
                            </div>
                            <img
                                id="imagePreview" // Sửa ID
                                src={previewUrl} // Sử dụng state previewUrl
                                alt=""
                                className={styles.labelGroupIMG}
                            />
                        </label>
                        {/* ----------------------- */}
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