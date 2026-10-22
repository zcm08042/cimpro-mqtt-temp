# 详细使用文档

## 目录

1. [前置准备](#前置准备)
2. [CIMPro 组件配置](#cimpro-组件配置)
3. [代码配置详解](#代码配置详解)
4. [Mock 模式测试](#mock-模式测试)
5. [切换到真实 MQTT](#切换到真实-mqtt)
6. [调试与排错](#调试与排错)
7. [自定义扩展](#自定义扩展)

---

## 前置准备

### 软件要求

- **CIMPro 孪大师** v6.5 或更高版本
- **MQTT Broker**（可选，Mock 模式不需要）
  - 推荐：EMQX、Mosquitto、HiveMQ
  - 必须启用 WebSocket 协议支持
  - 默认 WebSocket 端口：8083（WS）或 8084（WSS）

### 网络要求

- 如果使用真实 MQTT，确保 CIMPro 客户端能访问 Broker 地址
- 检查防火墙是否放行了 WebSocket 端口
- 跨域问题：Broker 需要配置 CORS 允许 CIMPro 域名

---

## CIMPro 组件配置

### 创建温度显示组件

1. 打开 CIMPro 孪大师
2. 进入你的项目 → UI 编辑器（pi-vis）
3. 从左侧组件库拖入一个**文本组件**
4. 在画布上调整位置和大小
5. 选中组件 → 右侧面板「基础设置」
6. 复制**组件 ID**（例如 `text-001`）

### 创建设备名称组件（可选）

重复上述步骤，再创建一个文本组件用于显示设备名称。

### 创建状态显示组件（可选）

再创建一个文本组件用于显示设备运行状态。

### 组件布局建议

```
┌─────────────────────────────┐
│  1号车间温控                  │ ← 设备名称组件
│                             │
│       26.5°C                │ ← 温度显示组件（大字号）
│                             │
│      ● 运行中               │ ← 状态组件
└─────────────────────────────┘
```

---

## 代码配置详解

打开 `mqtt-temperature.js`，顶部配置区需要修改的部分：

### 基础配置

```javascript
// Mock 模式开关
const USE_MOCK = true;  // true = 用假数据测试，false = 连真实 MQTT

// 组件 ID（从 CIMPro 属性面板复制）
const TEMP_DISPLAY_ID = '⭐temp-display';    // 必须：温度显示组件
const DEVICE_NAME_ID = '⭐device-name';      // 可选：设备名称组件
const STATUS_ID = '⭐device-status';         // 可选：状态组件
```

**注意**：
- 组件 ID 大小写敏感，务必从 CIMPro 属性面板直接复制
- 如果不需要设备名称或状态显示，可以删除对应的常量

### MQTT 配置（真实模式）

```javascript
const MQTT_CONFIG = {
  broker: '⭐mqtt.example.com',    // MQTT Broker IP 或域名
  port: 8083,                       // WebSocket 端口
  path: '/mqtt',                    // WebSocket 路径
  topic: '⭐factory/device/+/data'  // 订阅主题（+ 是通配符）
};
```

**主题通配符说明**：
- `+` 表示单层通配（匹配一个层级）
- `#` 表示多层通配（匹配所有层级）
- 示例：`factory/device/+/data` 匹配 `factory/device/001/data`、`factory/device/002/data`

---

## Mock 模式测试

### 启动 Mock 模式

1. 确保 `USE_MOCK = true`
2. 将代码粘贴到 CIMPro 脚本编辑器
3. 保存并切换到预览模式
4. 打开浏览器控制台（F12）

### 预期效果

控制台输出：
```
[Mock 模式] 每 3 秒模拟一条 MQTT 消息
[Mock] 收到消息 #1: {"deviceId":"001","deviceName":"1号车间温控","temperature":26.5,...}
```

大屏显示：
- 温度数字每 3 秒变化一次
- 温度 < 30°C 时显示青色
- 温度 30-35°C 时显示黄色
- 温度 > 35°C 时显示红色
- 设备名称和状态同步更新

### 自定义 Mock 数据

编辑 `mockMessages` 数组：

```javascript
const mockMessages = [
  {
    topic: 'factory/device/001/data',
    payload: '{"deviceId":"001","deviceName":"你的设备名","temperature":25.0,"status":1}'
  },
  // 添加更多...
];
```

修改间隔时间：

```javascript
// 在 startMock() 函数中
mockTimer = setInterval(() => {
  // ...
}, 3000);  // ⭐ 改这里的数字（毫秒），3000 = 3 秒
```

---

## 切换到真实 MQTT

### 第一步：确认 Broker 信息

你需要知道：
- Broker 地址（IP 或域名）
- WebSocket 端口（通常 8083 或 8084）
- 是否需要用户名/密码
- 要订阅的主题

### 第二步：修改配置

```javascript
const USE_MOCK = false;  // 关闭 Mock

const MQTT_CONFIG = {
  broker: '192.168.1.100',        // 你的 Broker IP
  port: 8083,                      // WebSocket 端口
  path: '/mqtt',
  topic: 'factory/device/+/data'   // 你的主题
};
```

### 第三步：引入 Paho MQTT 库

CIMPro 脚本编辑器默认不包含 MQTT 库，需要手动引入：

1. 下载 Paho MQTT.js：https://www.eclipse.org/paho/
2. 将 `paho-mqtt.js` 放到 CIMPro 项目的资源目录
3. 在 UI 编辑器中引用该脚本

或者使用 CDN（需要网络访问）：

```html
<script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>
```

### 第四步：测试连接

1. 保存代码
2. 切换到预览模式
3. 打开控制台，应该看到：

```
[MQTT] 连接成功，订阅: factory/device/+/data
[MQTT] 收到: factory/device/001/data {"deviceId":"001",...}
```

如果连接失败，检查：
- Broker 地址是否正确
- 端口是否开放（防火墙）
- WebSocket 协议是否启用
- 是否需要认证

---

## 调试与排错

### 控制台调试命令

```javascript
// 检查组件是否存在
function debugElement(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.error(`❌ 元素不存在: #${id}`);
    console.log('可用元素:', document.querySelectorAll('[id]'));
    return;
  }
  console.log(`✅ 元素 #${id}:`, {
    text: el.innerText,
    style: el.style.cssText,
    classList: [...el.classList]
  });
}

// 使用
debugElement('⭐temp-display');
```

### 常见问题排查

| 问题 | 可能原因 | 解决方法 |
|------|---------|---------|
| 温度不显示 | 组件 ID 错误 | 从属性面板重新复制 ID |
| Mock 数据不更新 | 代码未保存 | 点击「保存」后刷新预览 |
| MQTT 连接失败 | Broker 地址错误 | 检查 IP、端口、网络连通性 |
| 数据解析失败 | JSON 格式错误 | 检查 MQTT 推送的数据格式 |
| 颜色不变 | 温度未达阈值 | 检查温度值，或修改阈值逻辑 |

### 查看网络请求

1. F12 打开开发者工具
2. 切换到 Network 面板
3. 筛选 WS（WebSocket）
4. 查看 MQTT 连接状态和消息收发

---

## 自定义扩展

### 修改温度阈值

```javascript
// 在 handleMQTTData() 函数中
if (temp >= 40) {        // ⭐ 改为 40°C
  tempEl.style.color = '#ff4444';
} else if (temp >= 35) { // ⭐ 改为 35°C
  tempEl.style.color = '#ffaa00';
} else {
  tempEl.style.color = '#00ffff';
}
```

### 添加湿度显示

```javascript
// 在配置区添加
const HUMIDITY_ID = '⭐humidity-display';

// 在 handleMQTTData() 中添加
if (HUMIDITY_ID) {
  const humEl = document.getElementById(HUMIDITY_ID);
  if (humEl) humEl.innerText = data.humidity + '%';
}
```

### 添加声音告警

```javascript
// 温度超过阈值时播放声音
if (temp >= 35) {
  const audio = new Audio('⭐alarm.mp3');  // 替换为你的告警音效
  audio.play();
}
```

### 记录历史数据

```javascript
// 在 handleMQTTData() 中添加
const history = JSON.parse(localStorage.getItem('⭐temp-history') || '[]');
history.push({
  time: new Date().toISOString(),
  temp: data.temperature,
  device: data.deviceName
});
// 只保留最近 100 条
if (history.length > 100) history.shift();
localStorage.setItem('⭐temp-history', JSON.stringify(history));
```

---

## 技术支持

- CIMPro 官方文档：https://cloud-docs.picimos.com/
- 开发社区：https://forum.picimos.com/
- AI 技能工具箱：https://github.com/zcm08042/cimpro.skill

遇到问题可以在社区互助小组发帖提问。
