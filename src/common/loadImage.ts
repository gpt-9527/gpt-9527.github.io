/**
 * @description: 图片加载工具函数
 * 图片处理方式
 */
import type { FileItem } from './dto/file';
import type { ResponseData } from './dto/response';
import { getFileDetail } from './guangyaapi';

/**
 * 通用图片预览工具
 * @param value 文件对象
 * @param viewerApi 可选，图片预览API（如 v-viewer 的 $viewerApi）
 */
export default function loadImage(value: FileItem, viewerApi?: (args: any) => any): void {
    getFileDetail(value.fileId)
        .then((raw: string) => {
            let data: ResponseData<any>;
            try {
                data = typeof raw === 'string' ? JSON.parse(raw) : raw;
            } catch (e) {
                console.error('图片原始链接解析失败:', e);
                return;
            }
            if (data.msg === 'success' && data.data?.picInfo) {
                const imageUrl = data.data.picInfo.previewUrl;
                const image = {
                    src: `${imageUrl}&w=1920&h=1080`,
                    alt: value.fileName,
                    title: value.fileName
                };
                if (viewerApi) {
                    const viewer = viewerApi({
                        images: [image],
                        options: {
                            title: true,
                            toolbar: true,
                            navbar: false,
                            scalable: false,
                            zoomable: true,
                            rotatable: false,
                            transition: false,
                            zIndex: 9999
                        }
                    });
                    viewer && viewer.show && viewer.show();
                } else {
                    // 兜底：直接新窗口打开图片
                    window.open(image.src, '_blank');
                }
            } else {
                console.error('获取图片原始链接失败: 无效的响应数据');
            }
        })
        .catch(err => {
            console.error('获取图片原始链接失败:', err);
        });
}