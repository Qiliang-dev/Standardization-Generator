# Standardization Generator

本项目是一个纯前端的文档生成器，可快速输出标准化的测试问题 Markdown。

## 使用
1. 双击 `index.html` 直接在浏览器打开（离线可用，无需安装依赖）。
2. 左上选择模式：`Bug Report` 或 `Test Doku`，表单随之切换。
3. 左侧填写表单，右侧实时预览最终格式；常用字段自动保存在浏览器本地存储，下方建议卡片可复用。
4. 功能按钮：
   - “填充示例” 了解当前模式的样例
   - “复制 Jira 富文本” 复制带样式内容，直接粘贴到 Jira 描述区
   - “复制 Markdown” 复制纯 Markdown
   - “导出 .md” 下载文件
   - “导入粘贴” 将已有描述粘贴后自动解析填入各字段（Bug / Test Doku 均可）
   - “清空” 重置当前表单

## 功能概览
- 实时预览：输入即更新。
- 历史记忆：每个字段独立保存最近 15 条内容。
- 结构化模板：支持 Bug Report 与 Test Doku；Test Doku 覆盖 CW / Resources / Test Task / Platform / VIN / SW 细节 / New findings 等字段。
- 离线运行：无构建步骤，打开即可使用。
