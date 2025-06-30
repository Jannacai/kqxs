"use client";

import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createPost, uploadToDrive } from "./api/post/index";
import styles from "../styles/createPost.module.css";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import imageCompression from "browser-image-compression";

const VALID_CATEGORIES = ["Tin hot", "Thể thao", "Đời sống", "Giải trí"];

const postSchema = z.object({
    title: z
        .string()
        .min(5, "Tiêu đề phải có ít nhất 5 ký tự")
        .max(200, "Tiêu đề không được dài quá 200 ký tự")
        .nonempty("Tiêu đề không được để trống"),
    mainContents: z
        .array(
            z.object({
                h2: z
                    .string()
                    .min(5, "Tiêu đề phụ phải có ít nhất 5 ký tự")
                    .max(200, "Tiêu đề phụ không được dài quá 200 ký tự")
                    .optional()
                    .or(z.literal("")),
                description: z
                    .string()
                    .min(20, "Nội dung phải có ít nhất 20 ký tự")
                    .optional()
                    .or(z.literal("")),
                img: z
                    .string()
                    .url("Vui lòng nhập một URL hợp lệ")
                    .optional()
                    .or(z.literal("")),
                imgFile: z.any().optional(),
                caption: z
                    .string()
                    .max(200, "Chú thích không được dài quá 200 ký tự")
                    .optional()
                    .or(z.literal("")),
                isImageFirst: z.boolean().optional(),
                imageSource: z.enum(["url", "upload"]).optional(),
            })
        )
        .optional(),
    category: z
        .array(z.enum(VALID_CATEGORIES))
        .min(1, "Vui lòng chọn ít nhất một chủ đề"),
    contentOrder: z.array(
        z.object({
            type: z.literal("mainContent"),
            index: z.number().optional(),
        })
    ),
});

const CreatePost = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [previewUrls, setPreviewUrls] = useState({});
    const [mainContentFields, setMainContentFields] = useState({});
    const [isUploading, setIsUploading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        control,
        getValues,
        setValue,
    } = useForm({
        resolver: zodResolver(postSchema),
        defaultValues: {
            title: "",
            mainContents: [],
            category: ["Tin hot"],
            contentOrder: [],
        },
    });

    const { fields: mainContents, append: appendMainContent, remove: removeMainContent } = useFieldArray({
        control,
        name: "mainContents",
    });

    const { fields: contentOrder, append: appendContentOrder, remove: removeContentOrder, move: moveContentOrder } = useFieldArray({
        control,
        name: "contentOrder",
    });

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    const handleImageChange = useCallback(
        (index) => (event) => {
            const url = event.target.value;
            setPreviewUrls((prev) => ({
                ...prev,
                [`mainContent-${index}`]: url || "",
            }));
        },
        []
    );

    const handleFileChange = useCallback(
        (index) => async (event) => {
            const file = event.target.files[0];
            if (file) {
                try {
                    const compressedFile = await imageCompression(file, {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1200,
                        useWebWorker: true,
                    });
                    setValue(`mainContents[${index}].imgFile`, compressedFile);
                    const fileUrl = URL.createObjectURL(compressedFile);
                    setPreviewUrls((prev) => ({
                        ...prev,
                        [`mainContent-${index}`]: fileUrl || "",
                    }));
                } catch (error) {
                    console.error("Lỗi khi nén ảnh:", error);
                    toast.error("Lỗi khi nén ảnh. Vui lòng thử lại.", {
                        position: "top-right",
                        autoClose: 5000,
                    });
                }
            }
        },
        [setValue]
    );

    const addMainContent = () => {
        const newIndex = mainContents.length;
        appendMainContent({ h2: "", description: "", img: "", imgFile: null, caption: "", isImageFirst: false, imageSource: "url" });
        appendContentOrder({ type: "mainContent", index: newIndex });
        setMainContentFields((prev) => ({
            ...prev,
            [newIndex]: { showH2: false },
        }));
    };

    const toggleH2 = (index) => {
        setMainContentFields((prev) => ({
            ...prev,
            [index]: {
                ...prev[index],
                showH2: !prev[index]?.showH2,
            },
        }));
        if (!mainContentFields[index]?.showH2) {
            setValue(`mainContents[${index}].h2`, "");
        } else {
            setValue(`mainContents[${index}].h2`, "");
        }
    };

    const toggleImageSource = useCallback(
        (index) => (source) => {
            setValue(`mainContents[${index}].imageSource`, source);
            setValue(`mainContents[${index}].img`, "");
            setValue(`mainContents[${index}].imgFile`, null);
            setPreviewUrls((prev) => ({
                ...prev,
                [`mainContent-${index}`]: "",
            }));
        },
        [setValue]
    );

    const removeContent = (index, contentIndex) => {
        removeMainContent(contentIndex);
        setPreviewUrls((prev) => {
            const newUrls = { ...prev };
            delete newUrls[`mainContent-${contentIndex}`];
            return newUrls;
        });
        setMainContentFields((prev) => {
            const newFields = { ...prev };
            delete newFields[contentIndex];
            return newFields;
        });
        removeContentOrder(index);
    };

    const moveItem = (index, direction) => {
        if (direction === "up" && index > 0) {
            moveContentOrder(index, index - 1);
        } else if (direction === "down" && index < contentOrder.length - 1) {
            moveContentOrder(index, index + 1);
        }
    };

    const onSubmit = async (data) => {
        setIsUploading(true);
        try {
            const postData = {
                title: data.title,
                mainContents: [],
                category: data.category,
                contentOrder: data.contentOrder,
            };

            const uploadPromises = data.mainContents.map(async (content, i) => {
                let imgUrl = content.img;
                if (content.imageSource === "upload" && content.imgFile) {
                    const formData = new FormData();
                    formData.append("file", content.imgFile);
                    const uploadResponse = await uploadToDrive(formData);
                    imgUrl = uploadResponse.url;
                }
                return {
                    h2: content.h2 || "",
                    description: content.description || "",
                    img: imgUrl || "",
                    caption: content.caption || "",
                    isImageFirst: content.isImageFirst || false,
                };
            });

            postData.mainContents = await Promise.all(uploadPromises);

            const response = await createPost(postData);
            reset();
            setPreviewUrls({});
            setMainContentFields({});
            toast.success("Đăng bài thành công!", {
                position: "top-right",
                autoClose: 3000,
            });
            router.push(`/tin-tuc/${response.slug}-${response._id}`);
        } catch (error) {
            console.error("Lỗi khi đăng bài:", error);
            let errorMessage = "Lỗi không xác định. Vui lòng thử lại.";
            if (error.message.includes("Invalid token")) {
                await signOut({ redirect: false });
                router.push("/ui");
                errorMessage = "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.";
            } else if (error.message.includes("Invalid data")) {
                errorMessage = "Dữ liệu không hợp lệ. Vui lòng kiểm tra tiêu đề, URL hình ảnh, và nội dung.";
            } else if (error.message.includes("Failed to save post")) {
                errorMessage = "Lỗi hệ thống khi lưu bài viết. Vui lòng liên hệ quản trị viên.";
            } else if (error.message.includes("Failed to upload to Cloudinary")) {
                errorMessage = "Lỗi khi tải ảnh lên Cloudinary. Vui lòng kiểm tra file ảnh.";
            }
            toast.error(errorMessage, {
                position: "top-right",
                autoClose: 5000,
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleCloseModal = () => {
        router.push("/");
    };

    if (status === "loading") {
        return <p>Đang tải session...</p>;
    }

    if (status === "unauthenticated") {
        return null;
    }

    if (session?.user?.role !== "ADMIN") {
        return (
            <div className={styles.modalOverlay}>
                <div className={styles.container}>
                    <div className={styles.formGroup}>
                        <button className={styles.closeButton} onClick={handleCloseModal} aria-label="Đóng modal">
                            ✕
                        </button>
                        <div className={styles.errorModal}>
                            <span className={styles.errorModalIcon}>⚠️</span>
                            <p className={styles.errorModalMessage}>
                                Bạn không có quyền đăng bài. Chỉ quản trị viên (ADMIN) được phép.
                            </p>
                            <div className={styles.buttonGroup}>
                                <button className={styles.submitForm} onClick={handleCloseModal}>
                                    Về trang chủ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.container}>
                <div className={styles.formGroup}>
                    {isUploading && (
                        <div className={styles.loadingSpinner}>
                            <p>Đang tải ảnh và đăng bài...</p>
                        </div>
                    )}
                    <button className={styles.closeButton} onClick={handleCloseModal} aria-label="Đóng modal">
                        ✕
                    </button>
                    <ToastContainer />
                    <div className={styles.header}>
                        <h1 className={styles.Create_postTitle}>Đăng Bài Tin Tức</h1>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className={styles.formGroupInner} aria-label="Form đăng bài">
                        <div className={styles.Group}>
                            <label htmlFor="title" className={styles.labelGroup}>
                                <span className={styles.titleGroup}>Tiêu đề bài viết</span>
                                <input
                                    id="title"
                                    {...register("title")}
                                    type="text"
                                    className={styles.inputGroup_title}
                                    autoComplete="off"
                                    aria-describedby="title-error"
                                />
                                {errors.title && (
                                    <span id="title-error" className={styles.error}>{errors.title.message}</span>
                                )}
                            </label>
                        </div>
                        {contentOrder.map((item, index) => (
                            <div key={`mainContent-${item.index}`} className={styles.orderableGroup}>
                                <div className={styles.orderHeader}>
                                    <span className={styles.orderNumber}>Thứ tự: {index + 1}</span>
                                    <div className={styles.orderButtons}>
                                        <button
                                            type="button"
                                            className={styles.orderButton}
                                            onClick={() => moveItem(index, "up")}
                                            disabled={index === 0}
                                            aria-label="Di chuyển lên"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.orderButton}
                                            onClick={() => moveItem(index, "down")}
                                            disabled={index === contentOrder.length - 1}
                                            aria-label="Di chuyển xuống"
                                        >
                                            ↓
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.removeButton}
                                            onClick={() => removeContent(index, item.index)}
                                            aria-label="Xóa nhóm nội dung"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                                <div className={styles.Group}>
                                    <h3 className={styles.subTitle}>Nhóm nội dung chính {item.index + 1}</h3>
                                    <div className={styles.mainContentGroup}>
                                        {mainContentFields[item.index]?.showH2 && (
                                            <label htmlFor={`mainContents[${item.index}].h2`} className={styles.labelGroup}>
                                                <span className={styles.titleGroup}>Tiêu đề phụ</span>
                                                <input
                                                    id={`mainContents[${item.index}].h2`}
                                                    {...register(`mainContents[${item.index}].h2`)}
                                                    type="text"
                                                    className={styles.inputGroup_title}
                                                    autoComplete="off"
                                                    aria-describedby={`h2-${item.index}-error`}
                                                />
                                                {errors.mainContents?.[item.index]?.h2 && (
                                                    <span id={`h2-${item.index}-error`} className={styles.error}>
                                                        {errors.mainContents[item.index].h2.message}
                                                    </span>
                                                )}
                                            </label>
                                        )}
                                        <button
                                            type="button"
                                            className={styles.addButton}
                                            onClick={() => toggleH2(item.index)}
                                            aria-label={mainContentFields[item.index]?.showH2 ? "Ẩn tiêu đề phụ" : "Thêm tiêu đề phụ"}
                                        >
                                            {mainContentFields[item.index]?.showH2 ? "- Ẩn tiêu đề phụ" : "+ Thêm tiêu đề phụ"}
                                        </button>
                                        <label htmlFor={`mainContents[${item.index}].description`} className={styles.labelGroup}>
                                            <span className={styles.titleGroup}>Nội dung chính</span>
                                            <textarea
                                                id={`mainContents[${item.index}].description`}
                                                {...register(`mainContents[${item.index}].description`)}
                                                className={styles.inputGroup_desc}
                                                rows={8}
                                                autoComplete="off"
                                                aria-describedby={`mainContent-${item.index}-description-error`}
                                            />
                                            {errors.mainContents?.[item.index]?.description && (
                                                <span id={`mainContent-${item.index}-description-error`} className={styles.error}>
                                                    {errors.mainContents[item.index].description.message}
                                                </span>
                                            )}
                                        </label>
                                        <div className={styles.imageGroup}>
                                            <div className={styles.imageSourceToggle}>
                                                <label>
                                                    <input
                                                        type="radio"
                                                        name={`mainContents[${item.index}].imageSource`}
                                                        value="url"
                                                        checked={getValues(`mainContents[${item.index}].imageSource`) === "url"}
                                                        onChange={() => toggleImageSource(item.index)("url")}
                                                    />
                                                    Nhập URL
                                                </label>
                                                <label>
                                                    <input
                                                        type="radio"
                                                        name={`mainContents[${item.index}].imageSource`}
                                                        value="upload"
                                                        checked={getValues(`mainContents[${item.index}].imageSource`) === "upload"}
                                                        onChange={() => toggleImageSource(item.index)("upload")}
                                                    />
                                                    Tải file lên
                                                </label>
                                            </div>
                                            {getValues(`mainContents[${item.index}].imageSource`) === "url" ? (
                                                <label htmlFor={`mainContents[${item.index}].img`} className={styles.labelGroup}>
                                                    <span className={styles.titleGroup}>URL Hình ảnh</span>
                                                    <input
                                                        id={`mainContents[${item.index}].img`}
                                                        {...register(`mainContents[${item.index}].img`)}
                                                        type="text"
                                                        placeholder="Nhập URL hình ảnh"
                                                        className={styles.inputGroup_title}
                                                        autoComplete="off"
                                                        onChange={handleImageChange(item.index)}
                                                        aria-describedby={`mainContent-${item.index}-img-error`}
                                                    />
                                                    {errors.mainContents?.[item.index]?.img && (
                                                        <span id={`mainContent-${item.index}-img-error`} className={styles.error}>
                                                            {errors.mainContents[item.index].img.message}
                                                        </span>
                                                    )}
                                                </label>
                                            ) : (
                                                <label htmlFor={`mainContents[${item.index}].imgFile`} className={styles.labelGroup}>
                                                    <span className={styles.titleGroup}>Tải ảnh lên</span>
                                                    <input
                                                        id={`mainContents[${item.index}].imgFile`}
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                                        className={styles.inputGroup_title}
                                                        onChange={handleFileChange(index)}
                                                        aria-describedby={`mainContent-${item.index}-imgFile-error`}
                                                    />
                                                    {errors.mainContents?.[item.index]?.imgFile && (
                                                        <span id={`mainContent-${item.index}-imgFile-error`} className={styles.error}>
                                                            {errors.mainContents[item.index].imgFile?.message || "Lỗi khi chọn file"}
                                                        </span>
                                                    )}
                                                </label>
                                            )}
                                            <label htmlFor={`mainContents[${item.index}].caption`} className={styles.labelGroup}>
                                                <span className={styles.titleGroup}>Chú thích Hình ảnh</span>
                                                <input
                                                    id={`mainContents[${item.index}].caption`}
                                                    {...register(`mainContents[${item.index}].caption`)}
                                                    type="text"
                                                    placeholder="Nhập chú thích cho hình ảnh"
                                                    className={styles.inputGroup_title}
                                                    autoComplete="off"
                                                    aria-describedby={`mainContent-${item.index}-caption-error`}
                                                />
                                                {errors.mainContents?.[item.index]?.caption && (
                                                    <span id={`mainContent-${item.index}-caption-error`} className={styles.error}>
                                                        {errors.mainContents[item.index].caption.message}
                                                    </span>
                                                )}
                                            </label>
                                            {previewUrls[`mainContent-${item.index}`] ? (
                                                <img
                                                    id={`imagePreview-main-${item.index}`}
                                                    src={previewUrls[`mainContent-${item.index}`]}
                                                    alt={`Xem trước hình ảnh chính ${item.index + 1}`}
                                                    className={styles.labelGroupIMG}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <p className={styles.noImageText}>Không có hình ảnh</p>
                                            )}
                                        </div>
                                        <div className={styles.positionToggle}>
                                            <span className={styles.titleGroup}>Vị trí hình ảnh</span>
                                            <div className={styles.radioGroup}>
                                                <label>
                                                    <input
                                                        type="radio"
                                                        name={`mainContents[${item.index}].isImageFirst`}
                                                        value="true"
                                                        checked={getValues(`mainContents[${item.index}].isImageFirst`) === true}
                                                        onChange={() => setValue(`mainContents[${item.index}].isImageFirst`, true)}
                                                        aria-label="Hình trên"
                                                    />
                                                    Hình trên
                                                </label>
                                                <label>
                                                    <input
                                                        type="radio"
                                                        name={`mainContents[${item.index}].isImageFirst`}
                                                        value="false"
                                                        checked={getValues(`mainContents[${item.index}].isImageFirst`) === false}
                                                        onChange={() => setValue(`mainContents[${item.index}].isImageFirst`, false)}
                                                        aria-label="Hình dưới"
                                                    />
                                                    Hình dưới
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className={styles.Group}>
                            <button
                                type="button"
                                className={styles.addButton}
                                onClick={addMainContent}
                                aria-label="Thêm nhóm nội dung chính"
                            >
                                + Nhóm nội dung chính
                            </button>
                        </div>
                        <div className={styles.Group}>
                            <h3 className={styles.subTitle}>Chọn chủ đề *</h3>
                            <div className={styles.checkboxGroup}>
                                <Controller
                                    name="category"
                                    control={control}
                                    render={({ field }) => (
                                        <>
                                            {VALID_CATEGORIES.map((cat) => (
                                                <label key={cat}>
                                                    <input
                                                        type="checkbox"
                                                        value={cat}
                                                        checked={field.value.includes(cat)}
                                                        onChange={(e) => {
                                                            const updatedCategories = e.target.checked
                                                                ? [...field.value, cat]
                                                                : field.value.filter((c) => c !== cat);
                                                            field.onChange(updatedCategories);
                                                        }}
                                                    />
                                                    {cat}
                                                </label>
                                            ))}
                                        </>
                                    )}
                                />
                                {errors.category && (
                                    <span id="category-error" className={styles.error}>{errors.category.message}</span>
                                )}
                            </div>
                        </div>
                        <div className={styles.buttonGroup}>
                            <button className={styles.submitForm} type="submit" disabled={isSubmitting || isUploading}>
                                {isSubmitting || isUploading ? "Đang đăng..." : "Hoàn Thành"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreatePost;