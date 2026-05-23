/**
 * 光鸭盘 API 模块
 */
import { smartFetch } from "../utils/smartFetch";
import type { bodyDataType } from './dto/request'

// 查询请求资源详情原图接口
export const getFileDetail = async (fileId: string): Promise<string> => {
    let url = `https://api.guangyapan.com/userres/v1/file/get_file_detail`;
    let bodyData = {fileId}
    try {
        const response = await smartFetch(url, {
        method: 'POST',
        body: JSON.stringify(bodyData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching file detail:', error);
    throw new Error('Failed to fetch file detail');
  }
};

// 查询视频详情接口
export const getVideoOriginalUrl = async (fileId: string, gcid: string): Promise<string> => {
    let url = `https://api.guangyapan.com/userres/v1/file/get_vod_download_url`
    let bodyData = { fileId: fileId, gcid: gcid }
    try {
        const response = await smartFetch(url, {
            method: 'POST',
            body: JSON.stringify(bodyData)
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching video original URL:', error);
        throw new Error('Failed to fetch video original URL');
    }
};

// 查询文档详情接口
export const getDocumentOriginalUrl = async (fileId: string): Promise<string> => {
    let url = `https://api.guangyapan.com/userres/v1/get_res_download_url`
    let bodyData = { fileId: fileId }
    try {
        const response = await smartFetch(url, {
            method: 'POST',
            body: JSON.stringify(bodyData)
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching document original URL:', error);
        throw new Error('Failed to fetch document original URL');
    }
};

// 获取文件列表接口
export const getFileList = async (id: string = '', page: number = 1,pageSize: number = 12): Promise<string> => {
    let url = `https://api.guangyapan.com/userres/v1/file/get_file_list`
    let bodyData = {
        "orderBy": 1,
        "pageSize": pageSize,
        "parentId": id,
        "sortType": 1
        } as bodyDataType
    if(page !== 1){
        bodyData.page = page - 1
    }
    try {
        const response = await smartFetch(url, {
            method: 'POST',
            body: JSON.stringify(bodyData),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching file list:', error);
        throw new Error('Failed to fetch file list');
    }
};  

// 删除文件接口
export const deleteFile = async (fileIds: string[]): Promise<string> => {
    let url = `https://api.guangyapan.com/userres/v1/file/delete_file`;
    let bodyData = {fileIds: [...fileIds]}
    try {    
        const response = await smartFetch(url, {
        method: 'POST',
        body: JSON.stringify(bodyData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
};