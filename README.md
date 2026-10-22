# CIMPro MQTT 温度数据大屏显示

从 MQTT Broker 接收实时温度数据，显示在 CIMPro 孪大师大屏上，支持温度变色、设备状态显示、Mock 数据测试。

---

## 功能特性

| 功能 | 说明 |
|------|------|
| MQTT 实时接收 | 通过 MQTT over WebSocket 接收温度数据 |
| 温度变色 | < 30°C 青色，30-35°C 黄色，> 35°C 红色 |
| 设备名称显示 | 自动显示设备名称 |
| 状态指示 | 停止=灰色，运行=绿色，告警=红色 |
| Mock 模式 | 内置假数据，无需真实 MQTT 即可测试 |
| 自动重连 | MQTT 断线后 5 秒自动重连 |
| 内存安全 | 组件销毁时自动清理连接和定时器 |

---

## 快速开始

### 第一步：创建大屏组件

在 CIMPro 孪大师中：

1. 打开 UI 编辑器（pi-vis）
2. 拖入一个**文本组件**，用于显示温度
3. 在右侧属性面板「基础设置」中复制组件 ID（例如 `text-001`）
4. （可选）再拖入两个文本组件，分别显示设备名称和状态

### 第二步：配置代码

打开脚本编辑器，粘贴 `mqtt-temperature.js` 的内容，修改配置区：

```javascript
// ⭐ 必须修改：你的组件 ID
const TEMP_DISPLAY_ID = 'text-001';      // 温度显示组件
const DEVICE_NAME_ID = 'text-002';       // 设备名称组件（可选）
const STATUS_ID = 'text-003';            // 状态显示组件（可选）

// ⭐ 先用 Mock 模式测试
const USE_MOCK = true;
```

### 第三步：运行测试

1. 点击脚本编辑器的「保存」
2. 切换到预览模式
3. 打开控制台（F12），你会看到：

```
[Mock 模式] 每 3 秒模拟一条 MQTT 消息
[Mock] 收到消息 #1: {"deviceId":"001","temperature":26.5,...}
[Mock] 收到消息 #2: {"deviceId":"002","temperature":32.8,...}
```

4. 大屏上的温度数字每 3 秒自动变化，颜色随温度改变

### 第四步：切换到真实 MQTT

测试通过后，修改配置：

```javascript
const USE_MOCK = false;  // 关闭 Mock

const MQTT_CONFIG = {
  broker: '192.168.1.100',    // ⭐ 你的 MQTT Broker IP
  port: 8083,                  // ⭐ WebSocket 端口
  path: '/mqtt',
  topic: 'factory/device/+/data'  // ⭐ 你的主题
};
```

---

## 数据格式

MQTT 推送的 JSON 格式：

```json
{
  "deviceId": "001",
  "deviceName": "1号车间温控",
  "temperature": 26.5,
  "humidity": 45,
  "status": 1,
  "timestamp": "2026-10-22 15:30:00"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| deviceId | string | 设备唯一标识 |
| deviceName | string | 设备名称 |
| temperature | number | 温度值（摄氏度） |
| humidity | number | 湿度（可选） |
| status | number | 状态：0=停止，1=运行，2=告警 |
| timestamp | string | 时间戳 |

---

## 文件说明

```
cimpro-mqtt-temp/
├── README.md              ← 本文件（项目说明）
├── USAGE.md               ← 详细使用文档
├── mqtt-temperature.js    ← 主代码（粘贴到 CIMPro 脚本编辑器）
└── mock-data.json         ← Mock 数据示例
```

---

## 环境要求

- CIMPro 孪大师 v6.5+
- MQTT Broker 需启用 WebSocket 支持（端口通常为 8083 或 8084）
- 如果使用真实 MQTT，需要 Paho MQTT.js 库

---

## 常见问题

### Q: Mock 模式下温度不变？
检查控制台是否有报错，确认组件 ID 是否正确（大小写敏感）。

### Q: 真实 MQTT 连接失败？
1. 确认 Broker 地址和端口正确
2. 确认 Broker 启用了 WebSocket 协议
3. 检查网络是否可达（在浏览器控制台测试）
4. 确认主题权限（是否需要认证）

### Q: 温度颜色不变？
温度变色逻辑：
- < 30°C → 青色 `#00ffff`
- 30-35°C → 黄色 `#ffaa00`
- > 35°C → 红色 `#ff4444`

可以在代码中修改阈值。

### Q: 如何修改 Mock 数据？
编辑 `mqtt-temperature.js` 中的 `mockMessages` 数组，添加或修改模拟数据。

---

## 相关资源

- [CIMPro 官网](https://cimpro.cn/)
- [CIMPro API 文档](https://cloud-docs.picimos.com/)
- [CIMPro 开发社区](https://forum.picimos.com/)
- [CIMPro AI 技能工具箱](https://github.com/zcm08042/cimpro.skill)

---

## 许可证

MIT License - 仅供学习与工作使用。
