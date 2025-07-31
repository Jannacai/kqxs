"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import styles from '../../styles/quydinh.module.css';



const Quydinh = () => {

    return (
        <div className={styles.Quydinh}>
            <h1 className={styles.title}>Quy Định</h1>
            <h2 className={styles.subtitle}>1. QUY ĐỊNH VỀ NỘI DUNG</h2>
            <p className={styles.des}> Nội dung hoạt động của diễn đàn xsmb.win/diendan là thảo luận, phân tích, dự đoán xổ sổ (bao gồm loto, đặc biệt...) Việt Nam.</p>
            <p className={styles.des}> Mọi nội dung thảo luận, phân tích, dự đoán đều mang tính chất tham khảo, không mang tính định hướng cho người tham khảo.</p>
            <p className={styles.des}> Không được đưa ra những nhận định kiểu như chắn chắn sẽ ra, 100% sẽ ra, không ra trả lại tiền... cho dù theo cảm tính hay phương pháp nghiên cứu.</p>
            <p className={styles.des}> Không thảo luận, phân tích những vấn đề ngoài xổ số như:về chính trị, văn hóa, an ninh, quốc phòng, tín ngưỡng, tôn giáo, dân tộc, những vấn đề liên quan đến chính quyền, đường lối, chủ trương của Đảng và Nhà nước.</p>
            <p className={styles.des}> Không bàn luận những vấn đề mang tính phân biệt, kỳ thị có thể dẫn đến mâu thuẫn, chia rẽ đoàn kết diễn đàn.</p>
            <p className={styles.des}> Thành viên chịu trách nhiệm hoàn toàn với những nội dung của mình đưa lên, diễn đàn không chịu trách nhiệm về tính xác thực của thông tin thành viên đưa lên.</p>
            <h2 className={styles.subtitle}>2. QUY ĐỊNH ĐẶT TÊN NICK</h2>
            <p className={styles.des}> Nick (nickname, username, tài khoản, tài khoản người dùng) là tên hiển thị mà thành viên sử dụng khi tham gia thảo luận trên diễn đàn.</p>
            <p className={styles.des}> Nick chỉ được sử dụng các ký tự chữ cái tiếng Anh (a-z, A-Z) và các ký tự chữ số (0-9) với độ dài từ 3 đến 20 ký tự. </p>
            <p className={styles.des}> Không được đặt nick trùng với tên các lãnh đạo, doanh nhân văn hóa Việt Nam và thế giới.</p>
            <p className={styles.des}> Không được đặt nick trùng với tên những phần tử khủng bố, tội phạm quốc tế, tội phạm chiến tranh.</p>
            <p className={styles.des}> Không được đặt nick mang ý nghĩa hoặc ám chỉ ngôn bất lịch sự, gây hiểu lầm, tranh cãi, mất đoàn kết.</p>
            <h2 className={styles.subtitle}>3. QUY ĐỊNH VỀ BÀI VIẾT</h2>

            <p className={styles.des}> Ngôn ngữ sử dụng trên diễn đàn là tiếng Việt có dấu.</p>
            <p className={styles.des}> Thành viên không được đưa vào bài viết, tin nhắn, chữ ký, đăng lên tường, chatbox những nội dung sau:</p>
            <p className={styles.des}> Tên trang web hoặc đường link trang web khác, đặc biệt là những trang web về xổ số.</p>
            <p className={styles.des}> Hình ảnh, video có chứa tên trang web hoặc đường link trang web khác, đặc biệt là những trang web về xổ số.</p>
            <p className={styles.des}> Số điện thoại, nhóm hội zalo, nhóm hội facebook YouTubo xổ số... các nhóm hội khác nói chung (để tránh mục đích lôi kéo thành viên rời khỏi diễn đàn để tham gia vào những nhóm hội khác).</p>
            <p className={styles.des}> Quảng cáo, rao bán phần mềm, công cụ, con số... liên quan đến xổ số.</p>
            <p className={styles.des}> Nếu muốn hỏi số điện thoại, nhóm để giao lưu thì chỉ được trao đổi bằng tin nhắn riêng, cấm trao đổi trên chatbox, tường cá nhân, bài viết.</p>
            <h2 className={styles.subtitle}>4. QUY ĐỊNH XỬ LÝ VI PHẠM</h2>

            <p className={styles.des}> Nếu anh chị em có bất kỳ thắc mắc, ý kiến, đề nghị hỗ trợ gì thì vào Box Hướng dẫn, ý kiến, hỏi đáp viết bài nói rõ nội dung để được hỗ trợ. Những ý kiến, thắc mắc đưa lên chatbox thường sẽ không được hỗ trợ vì đó không phải là nơi quy định giải quyết ý kiến, thắc mắc, hơn nữa nhiều lúc anh chị em tham gia chatbox nhiều thì ý kiến đưa lên đó sẽ bị trôi, các Mod hay Admin không biết để hỗ trợ cho anh chị em.</p>
            <p className={styles.des}> Trước hết, anh chị em cần phản ánh liên quan đến thành tích thảo luận, chốt số với Mod quản lý Box trước, nếu Mod không giải quyết được hoặc anh chị em thấy giải quyết không hợp tình hợp lý thì mới có ý kiến với Admin. Chỉ những vấn đề liên quan đến quản lý chung hoặc các vấn đề về lỗi kỹ thuật, sự cố kỹ thuật thì anh chị em nên có ý kiến trực tiếp với Admin.</p>
            <p className={styles.des}> Trong mọi trường hợp, quyết định của Admin là quyết định cuối cùng.</p>
            {/* <p className={styles.des}></p> */}





            <h2 className={styles.title}>Hướng Dẫn</h2>

        </div>
    );
};

export default Quydinh;