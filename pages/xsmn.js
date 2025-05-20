
import KQXS from '../pages/xsmn/index';
import Calendar from '../component/caledar';
import ThongKe from '../component/thongKe';
import ListXSMT from '../component/listXSMT';
import ListXSMB from '../component/listXSMB';
import ListXSMN from '../component/listXSMN';
import PostList from './post/list';
import TableDate from '../component/tableDateKQXS'
const XSMN = () => {
    return (
        <div>
            <div className='container'>
                <div className='navigation'>
                    <Calendar></Calendar>
                    <ListXSMB></ListXSMB>
                    <ListXSMT></ListXSMT>
                    <ListXSMN></ListXSMN>
                </div>

                <div>
                    <TableDate></TableDate>
                    <KQXS>{"Miền Nam"}</KQXS>
                </div>

                <ThongKe></ThongKe>
            </div>
            <div className='container'>
                <PostList></PostList>
            </div>
        </div>
    );
}
export default XSMN;


