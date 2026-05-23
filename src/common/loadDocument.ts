import type { FileItem } from './dto/file';
import type { ResponseData } from './dto/response';
import { getDocumentOriginalUrl, getFileDetail } from './guangyaapi';

// 导入所需的库
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ... 省略之前的 detectEncoding, decodeText, highlightText 函数 ...
// 安全的编码检测
async function detectEncoding(buffer: ArrayBuffer): Promise<string> {
  const view = new Uint8Array(buffer.slice(0, Math.min(1024, buffer.byteLength)));
  
  // 1. 检查BOM标记
  // UTF-8 BOM: EF BB BF
  if (view.length >= 3 && view[0] === 0xEF && view[1] === 0xBB && view[2] === 0xBF) {
    return 'utf-8';
  }
  
  // UTF-16 LE BOM: FF FE
  if (view.length >= 2 && view[0] === 0xFF && view[1] === 0xFE) {
    return 'utf-16le';
  }
  
  // UTF-16 BE BOM: FE FF
  if (view.length >= 2 && view[0] === 0xFE && view[1] === 0xFF) {
    return 'utf-16be';
  }
  
  // UTF-32 LE BOM: FF FE 00 00
  if (view.length >= 4 && view[0] === 0xFF && view[1] === 0xFE && view[2] === 0x00 && view[3] === 0x00) {
    return 'utf-16le'; // 近似处理
  }
  
  // 2. 尝试常见编码
  const encodings = [
    'utf-8',      // 最常用
    'gbk',        // 简体中文
    'gb2312',     // 简体中文
    'gb2312',     // 简体中文
    'gb18030',    // 简体中文国家标准
    'big5',       // 繁体中文
    'windows-1252', // 西欧
    'iso-8859-1'  // Latin-1
  ];
  
  // 3. 首先尝试无错误的解码
  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: false });
      const testStr = decoder.decode(view.slice(0, Math.min(100, view.length)));
      
      // 检查是否包含中文字符
      const hasChinese = /[\u4e00-\u9fa5]/.test(testStr);
      const hasValidChars = testStr.length > 0 && !testStr.includes('�');
      
      // 如果有中文字符且没有乱码符号，很可能就是这个编码
      if (hasChinese && hasValidChars) {
        return encoding;
      }
      
      // 如果没有乱码符号，也考虑
      if (hasValidChars && testStr.trim().length > 0) {
        return encoding;
      }
    } catch (e) {
      // 跳过这个编码
      continue;
    }
  }
  
  // 4. 回退策略：尝试判断是否为纯英文
  let isLikelyAscii = true;
  for (let i = 0; i < Math.min(view.length, 100); i++) {
    if (view[i] > 127) {
      isLikelyAscii = false;
      break;
    }
  }
  
  if (isLikelyAscii) {
    return 'utf-8'; // ASCII兼容UTF-8
  }
  
  // 5. 对于包含高位字节的文件，优先尝试中文编码
  for (const encoding of ['gbk', 'gb18030', 'gb2312']) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: false });
      decoder.decode(view.slice(0, Math.min(50, view.length)));
      return encoding;
    } catch (e) {
      continue;
    }
  }
  
  // 6. 默认返回utf-8
  return 'utf-8';
}

// 安全的解码函数
function decodeText(buffer: Uint8Array, encoding: string): string {
  try {
    // 先尝试无错误模式
    const decoder = new TextDecoder(encoding, { fatal: false });
    return decoder.decode(buffer);
  } catch (error) {
    console.warn(`解码失败 (${encoding})，尝试回退:`, error);
    
    // 回退编码列表
    const fallbackEncodings = [
      'utf-8',
      'gbk',
      'gb18030',
      'windows-1252',
      'iso-8859-1'
    ];
    
    for (const fallback of fallbackEncodings) {
      if (fallback === encoding) continue;
      
      try {
        const decoder = new TextDecoder(fallback, { fatal: false });
        return decoder.decode(buffer);
      } catch (e) {
        continue;
      }
    }
    
    // 如果都失败了，使用Latin-1（不会失败）
    const safeDecoder = new TextDecoder('iso-8859-1', { fatal: false });
    return safeDecoder.decode(buffer);
  }
}

// 高亮文本
function highlightText(element: HTMLElement, searchText: string): void {
  if (!searchText.trim()) {
    const highlighted = element.querySelectorAll('.search-highlight');
    highlighted.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
      }
    });
    return;
  }
  
  const text = element.textContent || '';
  const regex = new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const html = text.replace(regex, '<mark class="search-highlight">$1</mark>');
  
  const scrollTop = element.scrollTop;
  const scrollLeft = element.scrollLeft;
  
  element.innerHTML = html;
  
  element.scrollTop = scrollTop;
  element.scrollLeft = scrollLeft;
  
  const firstHighlight = element.querySelector('.search-highlight');
  if (firstHighlight) {
    firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// 创建显示元素 - 修改为支持多种文件类型
function createDisplayElement(fileName: string, fileType: 'txt' | 'pdf' | 'doc' | 'excel' | 'office' | 'other' = 'txt'): HTMLDivElement {
  const existing = document.getElementById('display-area') as HTMLDivElement;
  if (existing) {
    existing.remove(); // 直接移除旧的
  }
  
  const container = document.createElement('div');
  container.id = 'display-area';
  container.style.cssText = `
    max-height: 80vh;
    overflow: hidden;
    border: 1px solid #ccc;
    padding: 15px;
    font-family: 'Microsoft YaHei', '微软雅黑', 'SimHei', '黑体', 'Consolas', 'Monaco', monospace;
    white-space: pre-wrap;
    background: white;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 1200px;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
  `;
  
  // 顶部工具栏
  const toolbar = document.createElement('div');
  toolbar.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
  `;
  
  // 标题
  const title = document.createElement('div');
  title.textContent = fileName;
  title.style.cssText = `
    font-weight: bold;
    font-size: 16px;
    color: #333;
    max-width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  
  // 文件类型标签
  const fileTypeLabel = document.createElement('span');
  fileTypeLabel.id = 'file-type-label';
  fileTypeLabel.style.cssText = `
    font-size: 12px;
    color: #666;
    background: #e9ecef;
    padding: 2px 8px;
    border-radius: 12px;
    margin-left: 8px;
  `;
  
  const fileTypeMap = {
    'txt': '文本',
    'pdf': 'PDF',
    'doc': '文档',
    'excel': '表格',
    'office': 'office',
    'other': '文件'
  };
  fileTypeLabel.textContent = fileTypeMap[fileType];
  title.appendChild(fileTypeLabel);
  
  // 编码显示（仅对txt文件显示）
  const encodingLabel = document.createElement('span');
  encodingLabel.id = 'encoding-label';
  encodingLabel.style.cssText = `
    font-size: 12px;
    color: #666;
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 3px;
    margin-left: 8px;
    ${fileType !== 'txt' ? 'display: none;' : ''}
  `;
  encodingLabel.textContent = fileType === 'txt' ? '检测编码中...' : '';
  title.appendChild(encodingLabel);
  
  // 工具栏右侧按钮组
  const buttonGroup = document.createElement('div');
  buttonGroup.style.cssText = 'display: flex; gap: 8px;';
  
  // 下载按钮（所有文件类型）
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = '下载';
  downloadBtn.className = 'download-btn';
  downloadBtn.style.cssText = `
    padding: 6px 12px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  `;
  
  // 复制按钮（仅对txt和doc文件显示）
  const copyBtn = document.createElement('button');
  copyBtn.textContent = '复制';
  copyBtn.style.cssText = `
    padding: 6px 12px;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    color: #333;
    ${!['txt', 'doc'].includes(fileType) ? 'display: none;' : ''}
  `;
  copyBtn.onclick = () => {
    const contentElement = container.querySelector('.file-content') as HTMLElement;
    if (contentElement) {
      const text = contentElement.textContent || contentElement.innerText || '';
      navigator.clipboard.writeText(text)
        .then(() => {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = '已复制!';
          setTimeout(() => copyBtn.textContent = originalText, 2000);
        })
        .catch(err => {
          console.error('复制失败:', err);
          copyBtn.textContent = '复制失败';
        });
    }
  };
  
  // PDF控件组
  const pdfControls = document.createElement('div');
  pdfControls.className = 'pdf-controls';
  pdfControls.style.cssText = `
    display: ${fileType === 'pdf' ? 'flex' : 'none'};
    gap: 8px;
    align-items: center;
    margin-left: auto;
  `;
  
  const pdfPrevBtn = document.createElement('button');
  pdfPrevBtn.textContent = '上一页';
  pdfPrevBtn.className = 'pdf-prev-btn';
  pdfPrevBtn.style.cssText = `
    padding: 6px 12px;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  `;
  
  const pdfPageInfo = document.createElement('span');
  pdfPageInfo.className = 'pdf-page-info';
  pdfPageInfo.textContent = '1 / 1';
  pdfPageInfo.style.cssText = 'font-size: 13px; color: #666;';
  
  const pdfNextBtn = document.createElement('button');
  pdfNextBtn.textContent = '下一页';
  pdfNextBtn.className = 'pdf-next-btn';
  pdfNextBtn.style.cssText = `
    padding: 6px 12px;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  `;
  
  pdfControls.appendChild(pdfPrevBtn);
  pdfControls.appendChild(pdfPageInfo);
  pdfControls.appendChild(pdfNextBtn);
  
  // 编码选择下拉框（仅对txt文件显示）
  const encodingSelect = document.createElement('select');
  encodingSelect.id = 'encoding-select';
  encodingSelect.style.cssText = `
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    ${fileType !== 'txt' ? 'display: none;' : ''}
  `;
  
  const encodings = [
    { value: 'utf-8', label: 'UTF-8' },
    { value: 'gbk', label: 'GBK (简体中文)' },
    { value: 'gb2312', label: 'GB2312' },
    { value: 'gb18030', label: 'GB18030' },
    { value: 'big5', label: 'Big5 (繁体)' },
    { value: 'windows-1252', label: 'Windows-1252' },
    { value: 'iso-8859-1', label: 'ISO-8859-1' }
  ];
  
  encodings.forEach(enc => {
    const option = document.createElement('option');
    option.value = enc.value;
    option.textContent = enc.label;
    encodingSelect.appendChild(option);
  });
  
  // 重载按钮（仅对txt文件显示）
  const reloadBtn = document.createElement('button');
  reloadBtn.textContent = '重载编码';
  reloadBtn.className = 'reload-btn';
  reloadBtn.style.cssText = `
    padding: 6px 12px;
    background: #4dabf7;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    ${fileType !== 'txt' ? 'display: none;' : ''}
  `;
  
  // 关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '× 关闭';
  closeBtn.style.cssText = `
    padding: 6px 12px;
    background: #ff6b6b;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  `;
  closeBtn.onclick = () => container.remove();
  
  // 搜索框容器（仅对txt文件显示）
  const searchContainer = document.createElement('div');
  searchContainer.style.cssText = `
    margin-bottom: 15px;
    display: flex;
    gap: 8px;
    align-items: center;
    ${fileType !== 'txt' ? 'display: none;' : ''}
  `;
  
  // 搜索框
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = '搜索文本...';
  searchInput.style.cssText = `
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 13px;
  `;
  searchInput.oninput = () => {
    const contentElement = container.querySelector('.file-content') as HTMLElement;
    if (contentElement) {
      highlightText(contentElement, searchInput.value);
    }
  };
  
  // 清空搜索按钮
  const clearSearchBtn = document.createElement('button');
  clearSearchBtn.textContent = '清除';
  clearSearchBtn.style.cssText = `
    padding: 8px 12px;
    background: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    color: #333;
  `;
  clearSearchBtn.onclick = () => {
    searchInput.value = '';
    const contentElement = container.querySelector('.file-content') as HTMLElement;
    if (contentElement) {
      highlightText(contentElement, '');
    }
  };
  
  // 内容区域
  const contentArea = document.createElement('div');
  contentArea.className = 'file-content';
  contentArea.style.cssText = `
    flex: 1;
    overflow-y: auto;
    background: #f8f9fa;
    padding: 15px;
    border-radius: 4px;
    font-size: 13px;
    line-height: 1.5;
  `;
  
  // Excel表格容器
  const excelContainer = document.createElement('div');
  excelContainer.className = 'excel-container';
  excelContainer.style.cssText = `
    display: ${fileType === 'excel' ? 'block' : 'none'};
    overflow: auto;
    max-height: 400px;
  `;
  
  // PDF页面容器
  const pdfContainer = document.createElement('div');
  pdfContainer.className = 'pdf-pages-container';
  pdfContainer.style.cssText = `
    display: ${fileType === 'pdf' ? 'flex' : 'none'};
    flex-direction: column;
    align-items: center;
    gap: 20px;
    overflow-y: auto;
    max-height: 400px;
  `;
  
  // 进度条容器（仅对txt文件显示）
  const progressContainer = document.createElement('div');
  progressContainer.style.cssText = `
    margin-top: 10px;
    ${fileType !== 'txt' ? 'display: none;' : ''}
  `;
  
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    width: 100%;
    height: 4px;
    background: #e0e0e0;
    border-radius: 2px;
    overflow: hidden;
  `;
  
  const progressFill = document.createElement('div');
  progressFill.style.cssText = `
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #4dabf7, #339af0);
    transition: width 0.3s ease;
  `;
  
  const progressText = document.createElement('div');
  progressText.style.cssText = `
    font-size: 12px;
    color: #666;
    margin-top: 4px;
    text-align: center;
  `;
  
  progressBar.appendChild(progressFill);
  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(progressText);
  
  // 加载状态
  const loadingText = document.createElement('div');
  loadingText.textContent = '正在加载文件...';
  loadingText.className = 'loading-text';
  loadingText.style.cssText = `
    color: #666;
    font-style: italic;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  // 添加加载动画
  const loadingSpinner = document.createElement('div');
  loadingSpinner.style.cssText = `
    width: 16px;
    height: 16px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .search-highlight {
      background-color: #fff3cd;
      color: #856404;
      padding: 0 2px;
      border-radius: 2px;
    }
    .pdf-page {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .excel-table {
      border-collapse: collapse;
      width: 100%;
      font-family: Arial, sans-serif;
    }
    .excel-table th, .excel-table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    .excel-table th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .excel-table tr:nth-child(even) {
      background-color: #f9f9f9;
    }
  `;
  document.head.appendChild(style);
  
  loadingText.appendChild(loadingSpinner);
  
  // 编码工具组（仅对txt文件显示）
  const encodingToolbar = document.createElement('div');
  encodingToolbar.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 10px;
    ${fileType !== 'txt' ? 'display: none;' : ''}
  `;
  
  encodingToolbar.appendChild(encodingSelect);
  encodingToolbar.appendChild(reloadBtn);
  
  // 组装元素
  if (['txt', 'doc'].includes(fileType)) {
    buttonGroup.appendChild(copyBtn);
  }
  if (fileType === 'pdf') {
    buttonGroup.appendChild(pdfControls);
  }
  buttonGroup.appendChild(downloadBtn);
  buttonGroup.appendChild(closeBtn);
  toolbar.appendChild(title);
  toolbar.appendChild(buttonGroup);
  
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(clearSearchBtn);
  
  container.appendChild(toolbar);
  if (fileType === 'txt') {
    container.appendChild(encodingToolbar);
    container.appendChild(searchContainer);
  }
  container.appendChild(loadingText);
  container.appendChild(contentArea);
  container.appendChild(excelContainer);
  container.appendChild(pdfContainer);
  if (fileType === 'txt') {
    container.appendChild(progressContainer);
  }
  
  document.body.appendChild(container);
  
  return container;
}

// 流式加载文本
function _loadtxt(url: string, fileName: string, forceEncoding?: string): void {
  const container = createDisplayElement(fileName, 'txt');
  const contentArea = container.querySelector('.file-content') as HTMLElement;
  const loadingText = container.querySelector('.file-content')?.previousElementSibling as HTMLElement;
  const progressFill = container.querySelector('div[style*="width: 0%"]') as HTMLDivElement;
  const progressText = progressFill?.parentElement?.nextElementSibling as HTMLDivElement;
  const encodingSelect = container.querySelector('#encoding-select') as HTMLSelectElement;
  const encodingLabel = container.querySelector('#encoding-label') as HTMLSpanElement;
  const reloadBtn = container.querySelector('.reload-btn') as HTMLButtonElement;
  
  // 保存当前URL用于重载
  if (reloadBtn) {
    reloadBtn.dataset.currentUrl = url;
    reloadBtn.dataset.fileName = fileName;
  }
  
  // 设置重载按钮事件
  if (reloadBtn) {
    const reloadHandler = () => {
      console.log('重载文件:', reloadBtn.dataset.currentUrl);
      const currentUrl = reloadBtn.dataset.currentUrl;
      const currentFileName = reloadBtn.dataset.fileName;
      if (currentUrl && currentFileName) {
        const select = container.querySelector('#encoding-select') as HTMLSelectElement;
        const newEncoding = select.value;
        _loadtxt(currentUrl, currentFileName, newEncoding);
      }
    };
    
    // 移除旧的事件监听器，添加新的
    reloadBtn.replaceWith(reloadBtn.cloneNode(true));
    const newReloadBtn = container.querySelector('.reload-btn') as HTMLButtonElement;
    newReloadBtn.onclick = reloadHandler;
  }
  
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`);
      }
      
      const totalSize = parseInt(response.headers.get('Content-Length') || '0', 10);
      let loadedSize = 0;
      let detectedEncoding = forceEncoding || 'utf-8';
      let buffer: Uint8Array[] = [];
      
      if (!response.body) {
        // 回退到普通加载
        return response.arrayBuffer().then(async arrayBuffer => {
          try {
            if (!forceEncoding) {
              detectedEncoding = await detectEncoding(arrayBuffer);
            }
            
            if (encodingSelect && detectedEncoding) {
              encodingSelect.value = detectedEncoding;
            }
            if (encodingLabel) {
              encodingLabel.textContent = `编码: ${detectedEncoding.toUpperCase()}`;
            }
            
            const text = decodeText(new Uint8Array(arrayBuffer), detectedEncoding);
            
            if (loadingText) loadingText.remove();
            if (progressFill && progressText) {
              progressFill.style.width = '100%';
              progressText.textContent = '加载完成';
            }
            if (contentArea) {
              contentArea.textContent = text;
            }
          } catch (e) {
            console.error('解码失败:', e);
            if (contentArea) {
              contentArea.textContent = '解码文件失败，请尝试手动选择编码';
            }
            if (loadingText) loadingText.remove();
          }
        });
      }
      
      const reader = response.body.getReader();
      
      // 流式读取
      function readStream(): Promise<void> {
        return reader.read()
          .then(async ({ done, value }) => {
            if (done) {
              if (loadingText) loadingText.remove();
              if (progressFill && progressText) {
                progressFill.style.width = '100%';
                progressText.textContent = '加载完成';
              }
              return;
            }
            
            loadedSize += value.length;
            buffer.push(value);
            
            // 如果是第一次读取，检测编码
            if (buffer.length === 1 && !forceEncoding) {
              try {
                detectedEncoding = await detectEncoding(value.buffer);
                console.log('检测到编码:', detectedEncoding);
                
                if (encodingSelect && detectedEncoding) {
                  encodingSelect.value = detectedEncoding;
                }
                if (encodingLabel) {
                  encodingLabel.textContent = `编码: ${detectedEncoding.toUpperCase()}`;
                }
              } catch (e) {
                console.warn('编码检测失败，使用默认UTF-8:', e);
                detectedEncoding = 'utf-8';
              }
            }
            
            // 解码并显示当前块
            try {
              const text = decodeText(value, detectedEncoding);
              if (contentArea) {
                contentArea.textContent += text;
                
                // 自动滚动到底部
                contentArea.scrollTop = contentArea.scrollHeight;
              }
            } catch (e) {
              console.warn('解码块失败:', e);
              // 继续处理下一块
            }
            
            // 更新进度
            if (totalSize > 0 && progressFill && progressText) {
              const percent = (loadedSize / totalSize) * 100;
              progressFill.style.width = `${percent}%`;
              const loadedMB = (loadedSize / 1024 / 1024).toFixed(2);
              const totalMB = (totalSize / 1024 / 1024).toFixed(2);
              progressText.textContent = `${loadedMB}MB / ${totalMB}MB (${percent.toFixed(1)}%)`;
            }
            
            if (loadingText) {
              loadingText.textContent = `正在加载... ${loadedSize} 字节`;
            }
            
            // 继续读取下一块
            return readStream();
          })
          .catch(error => {
            console.error('读取流失败:', error);
            if (contentArea) {
              contentArea.textContent += `\n\n加载中断: ${error.message}`;
            }
            if (loadingText) loadingText.remove();
            if (progressFill && progressText) {
              progressFill.style.backgroundColor = '#dc3545';
              progressText.textContent = `加载失败: ${error.message}`;
              progressText.style.color = '#dc3545';
            }
          });
      }
      
      return readStream();
    })
    .catch(error => {
      console.error('请求失败:', error);
      if (contentArea) {
        contentArea.textContent = `加载失败: ${error.message}`;
      }
      if (loadingText) loadingText.remove();
    });
}

// 预览PDF文件
async function previewPDF(url: string, fileName: string): Promise<void> {
  const container = createDisplayElement(fileName, 'pdf');
  const loadingText = container.querySelector('.loading-text') as HTMLElement;
  const pdfContainer = container.querySelector('.pdf-pages-container') as HTMLElement;
  const downloadBtn = container.querySelector('.download-btn') as HTMLButtonElement;
  const pdfPrevBtn = container.querySelector('.pdf-prev-btn') as HTMLButtonElement;
  const pdfNextBtn = container.querySelector('.pdf-next-btn') as HTMLButtonElement;
  const pdfPageInfo = container.querySelector('.pdf-page-info') as HTMLSpanElement;
  
  // 设置下载按钮
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
    };
  }
  
  let pdfDoc: any = null;
  let currentPage = 1;
  let scale = 1.5;
  
  try {
    // 加载PDF文档
    loadingText.textContent = '正在加载PDF...';
    
    const loadingTask = pdfjsLib.getDocument(url);
    pdfDoc = await loadingTask.promise;
    
    const totalPages = pdfDoc.numPages;
    pdfPageInfo.textContent = `1 / ${totalPages}`;
    
    // 移除加载提示
    loadingText.remove();
    
    // 渲染第一页
    await renderPDFPage(pdfDoc, 1, pdfContainer, scale);
    
    // 设置翻页按钮事件
    if (pdfPrevBtn) {
      pdfPrevBtn.onclick = async () => {
        if (currentPage > 1) {
          currentPage--;
          pdfPageInfo.textContent = `${currentPage} / ${totalPages}`;
          await renderPDFPage(pdfDoc, currentPage, pdfContainer, scale);
        }
      };
    }
    
    if (pdfNextBtn) {
      pdfNextBtn.onclick = async () => {
        if (currentPage < totalPages) {
          currentPage++;
          pdfPageInfo.textContent = `${currentPage} / ${totalPages}`;
          await renderPDFPage(pdfDoc, currentPage, pdfContainer, scale);
        }
      };
    }
    
  } catch (error) {
    console.error('加载PDF失败:', error);
    loadingText.textContent = `加载失败: ${error instanceof Error ? error.message : '未知错误'}`;
    loadingText.style.color = '#dc3545';
  }
}

// 渲染PDF页面
async function renderPDFPage(pdfDoc: any, pageNum: number, container: HTMLElement, scale: number): Promise<void> {
  try {
    container.innerHTML = '';
    
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.className = 'pdf-page';
    canvas.style.cssText = `
      display: block;
      margin: 0 auto;
      max-width: 100%;
    `;
    
    container.appendChild(canvas);
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
  } catch (error) {
    console.error('渲染PDF页面失败:', error);
    container.innerHTML = `<div style="color: red; text-align: center;">渲染页面失败</div>`;
  }
}

// 预览Excel文件
async function previewExcel(url: string, fileName: string): Promise<void> {
  const container = createDisplayElement(fileName, 'excel');
  const excelContainer = container.querySelector('.excel-container') as HTMLElement;
  const loadingText = container.querySelector('.loading-text') as HTMLElement;
  const downloadBtn = container.querySelector('.download-btn') as HTMLButtonElement;
  
  // 设置下载按钮
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
    };
  }
  
  try {
    loadingText.textContent = '正在加载Excel文件...';
    
    // 获取文件内容
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // 使用SheetJS读取Excel
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // 移除加载提示
    loadingText.remove();
    
    // 显示所有工作表
    excelContainer.innerHTML = '';
    
    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      
      // 转换为HTML表格
      const html = XLSX.utils.sheet_to_html(worksheet, {
        editable: false,
        header: '',
        footer: ''
      });
      
      // 创建工作表标签页
      const sheetTab = document.createElement('div');
      sheetTab.style.cssText = `
        margin-bottom: 15px;
        background: white;
        border-radius: 4px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      `;
      
      const sheetHeader = document.createElement('div');
      sheetHeader.style.cssText = `
        background: #f8f9fa;
        padding: 10px 15px;
        border-bottom: 1px solid #dee2e6;
        font-weight: bold;
        color: #495057;
      `;
      sheetHeader.textContent = `${sheetName} (工作表 ${index + 1})`;
      
      const sheetContent = document.createElement('div');
      sheetContent.style.cssText = 'overflow: auto;';
      sheetContent.innerHTML = html;
      
      // 添加表格样式
      const table = sheetContent.querySelector('table');
      if (table) {
        table.className = 'excel-table';
        table.style.cssText = 'min-width: 100%;';
      }
      
      sheetTab.appendChild(sheetHeader);
      sheetTab.appendChild(sheetContent);
      excelContainer.appendChild(sheetTab);
    });
    
  } catch (error) {
    console.error('加载Excel失败:', error);
    loadingText.textContent = `预览失败: ${error instanceof Error ? error.message : '未知错误'}`;
    loadingText.style.color = '#dc3545';
    
    // 显示下载链接
    excelContainer.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 48px; color: #6c757d; margin-bottom: 20px;">📊</div>
        <h3 style="color: #495057; margin-bottom: 10px;">预览失败</h3>
        <p style="color: #6c757d; margin-bottom: 20px;">${error instanceof Error ? error.message : '未知错误'}</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <a href="${url}" 
             download="${fileName}" 
             style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">
            下载文件
          </a>
        </div>
      </div>
    `;
  }
}

// Office Online 预览函数
function previewWithOfficeOnline(url: string, fileName: string): void {
  const container = createDisplayElement(fileName, 'office');
  const contentArea = container.querySelector('.file-content') as HTMLElement;
  const loadingText = container.querySelector('.loading-text') as HTMLElement;
  const downloadBtn = container.querySelector('.download-btn') as HTMLButtonElement;
  
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
    };
  }
  
  loadingText.remove();
  
  const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
  
  contentArea.innerHTML = `
    <div style="width: 100%; height: 700px; position: relative;">
      <iframe 
        src="${officeViewerUrl}"
        style="width: 100%; height: 100%; border: none;"
        frameborder="0"
        title="Microsoft Office Online 预览 - ${fileName}"
        allow="fullscreen"
      ></iframe>
      <div style="
        position: absolute;
        bottom: 10px;
        right: 10px;
        background: rgba(255,255,255,0.9);
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 12px;
        color: #666;
        border: 1px solid #ddd;
      ">
        由 Microsoft Office Online 提供预览
      </div>
    </div>
  `;
}
// 专门处理 .docx 的函数
async function previewDOCXWithMammoth(url: string, fileName: string): Promise<void> {
  const container = createDisplayElement(fileName, 'doc');
  const contentArea = container.querySelector('.file-content') as HTMLElement;
  const loadingText = container.querySelector('.loading-text') as HTMLElement;
  const downloadBtn = container.querySelector('.download-btn') as HTMLButtonElement;
  
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
    };
  }
  
  try {
    loadingText.textContent = '正在解析Word文档...';
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // 检查是否是 ZIP 文件
    const view = new Uint8Array(arrayBuffer.slice(0, 8));
    const isZip = view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04;
    
    if (!isZip) {
      // 如果不是 ZIP，可能是 .doc 格式
      loadingText.textContent = '检测到 .doc 格式，使用 Office Online 预览...';
      setTimeout(() => {
        previewWithOfficeOnline(url, fileName);
      }, 100);
      return;
    }
    
    const result = await mammoth.convertToHtml({ arrayBuffer });
    
    loadingText.remove();
    contentArea.innerHTML = `
      <div style="
        font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
        line-height: 1.6;
        color: #333;
        padding: 20px;
        background: white;
        border-radius: 4px;
      ">
        ${result.value}
      </div>
    `;
    
  } catch (error) {
    console.error('Mammoth 解析失败，回退到 Office Online:', error);
    // Mammoth 失败时回退到 Office Online
    previewWithOfficeOnline(url, fileName);
  }
}
// 加载其他文件类型
function loadOtherFile(url: string, fileName: string, ext: string): void {
  const normalizedExt = ext.toLowerCase();
  
  if (normalizedExt === '.pdf') {
    previewPDF(url, fileName);
  } else if (normalizedExt === '.docx') {
    // .docx 可以尝试用 Mammoth
    previewDOCXWithMammoth(url, fileName);
  } else if (normalizedExt === '.doc') {
    // .doc 使用 Office Online
    previewWithOfficeOnline(url, fileName);
  } else if (normalizedExt === '.csv') {

  } else if (normalizedExt === '.xlsx' || normalizedExt === '.xls') {
    // Excel 文件
    previewExcel(url, fileName);
  } else if (normalizedExt === '.ppt' || normalizedExt === '.pptx') {
    // PowerPoint 文件
    previewWithOfficeOnline(url, fileName);
  } else if (normalizedExt === '.txt' || normalizedExt === '.md' || normalizedExt === '.json' || normalizedExt === '.xml') {
    // 纯文本文件
    
  } else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(normalizedExt)) {
    // 压缩文件
    
  } else {
    // 其他不支持的文件
    const container = createDisplayElement(fileName, 'other');
    const contentArea = container.querySelector('.file-content') as HTMLElement;
    
    if (contentArea) {
      contentArea.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 48px; color: #6c757d; margin-bottom: 20px;">📄</div>
          <h3 style="color: #495057; margin-bottom: 10px;">不支持在线预览 ${ext.toUpperCase()} 文件</h3>
          <p style="color: #6c757d; margin-bottom: 20px;">文件类型 ${ext} 需要在本地应用中打开</p>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <a href="${url}" 
               download="${fileName}" 
               style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">
              下载文件
            </a>
            <button onclick="window.open('${url}', '_blank')" 
                    style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
              在新窗口打开
            </button>
          </div>
        </div>
      `;
    }
  }
}

// 主函数
export default function loadDocument(value: FileItem): void {
  getFileDetail(value.fileId)
    .then((raw: string) => {
      let data: ResponseData<any>;
      try {
        data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        console.log('文档信息获取成功:', data);
        
        const fileInfo = data.data.fileInfo;
        getDocumentOriginalUrl(fileInfo.fileId)
          .then((raw: string) => {
            let filedata: ResponseData<any>;
            try {
              filedata = typeof raw === 'string' ? JSON.parse(raw) : raw;
              console.log('文档原始链接获取成功:', filedata);
              
              const signedURL = filedata.data.signedURL;
              const ext = fileInfo.ext?.toLowerCase() || '';
              
              if (ext === '.txt') {
                _loadtxt(signedURL, fileInfo.fileName || '未知文件.txt');
              } else if (ext === '.pdf') {
                loadOtherFile(signedURL, fileInfo.fileName || '未知文件.pdf', ext);
              } else if (ext === '.docx' || ext === '.doc') {
                loadOtherFile(signedURL, fileInfo.fileName || '未知文件.docx', ext);
              } else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
                loadOtherFile(signedURL, fileInfo.fileName || '未知文件.xlsx', ext);
              } else {
                loadOtherFile(signedURL, fileInfo.fileName || '未知文件', ext);
              }
            } catch (e) {
              console.error('文档原始链接解析失败:', e);
              alert('获取文件链接失败');
            }
          })
          .catch(error => {
            console.error('获取文档原始链接失败:', error);
            alert('获取文件链接失败');
          });
      } catch (e) {
        console.error('文档信息解析失败:', e);
        alert('获取文件信息失败');
      }
    })
    .catch(error => {
      console.error('获取文件详情失败:', error);
      alert('获取文件详情失败');
    });
}