# Module Protocol Explorer

面向光模块研发、测试、驱动和交换机适配的交互式协议解析站。当前主体为 CMIS 5.3，并在 CMIS 明确引用公共编码的位置结合 SFF-8024。

## 已覆盖

- CMIS 核心机制、状态机和完整初始化流程
- Page / Bank / Byte / Bit 寄存器地图
- 字段值正向解析与声明值反向生成
- Application Descriptor、DPConfig、ExplicitControl 与 SI 控制
- Page 00h 身份、ASCII、枚举、数值、位图、校验和 Custom 区域
- 标准能力、Reserved、Restricted 与厂商自定义边界

## 本地运行

```bash
npm ci
npm run dev
```

## GitHub Pages

`main` 分支更新后，GitHub Actions 会生成纯静态页面并部署。站点不需要账号、Cookie 或服务端数据库。

## 内容边界

网页是工程化辅助阅读工具，不替代规范版权文本。字段位置和行为以 OIF CMIS 5.3 为主；Identifier、Connector、Host/Media Interface ID 等公共枚举以对应版本的 SFF-8024 为准。厂商私有区只解释 CMIS 规定的边界，内部语义必须结合厂商文档。

## License

Source code is released under the MIT License. Protocol names and specifications remain the property of their respective owners.
