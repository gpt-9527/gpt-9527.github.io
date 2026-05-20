/**
 * @description: 文件类型定义
 */

/**
 * 文件类型常量数组，使用 as const 保证类型推断
 */

export const IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/png',
    'image/webp',
] as const;

export const VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/mpeg',
    'video/mpegts',
    'application/octet-stream',
    'video/x-matroska',
    'video/x-msvideo',
] as const;

export const DOCUMENT_TYPES = [
    'text/plain; charset=utf-8',
    'application/zip',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/pdf',
] as const;

export const SHOW_IMAGE_TYPES = [
    ...IMAGE_TYPES,
    'video/mp4',
    'video/x-matroska',
    'video/x-msvideo',
    'video/mpegts',
] as const;

export const SHOW_VIDEO_TYPES = [
    'video/webm',
    'video/ogg',
    'video/mpeg',
    'application/octet-stream',
] as const;

export const SHOW_DOCUMENT_TYPES = [
    ...DOCUMENT_TYPES,
] as const;

/**
 * 文件类型枚举
 */
export type FileType = 'video' | 'image' | 'document' | 'other';

/**
 * 文件类型常量
 */
export const FILE_TYPE = {
    VIDEO: 'video',
    IMAGE: 'image',
    DOCUMENT: 'document',
    OTHER: 'other',
} as const;

export const fileTypes = {
    0: '',
    1: '图片',
    2: '视频',
    4: '文档',
}