// ============================================================
// CIMPro MQTT 温度数据大屏显示
// 从 MQTT Broker 接收实时温度数据，显示在 CIMPro 大屏上
// 
// 作者：zcm08042
// 仓库：https://github.com/zcm08042/cimpro.skill
// 文档：详见 README.md 和 USAGE.md
// ============================================================

// ============================================================
// ⭐ 配置区 —— 只需要改这里
// ============================================================

// 开关：true = 用假数据测试，false = 连真实 MQTT
const USE_MOCK = true;

// ⭐ 大屏上显示温度的组件 ID（从 CIMPro 属性面板复制）
const TEMP_DISPLAY_ID = '⭐temp-display';

// ⭐ 大屏上显示设备名称的组件 ID（可选，没有就删掉这行）
const DEVICE_NAME_ID = '⭐device-name';

// ⭐ 大屏上显示状态的组件 ID（可选）
const STATUS_ID = '⭐device-status';

// MQTT 配置（USE_MOCK = false 时生效）
const MQTT_CONFIG = {
  broker: '⭐mqtt.example.com',    // ⭐ 你的 MQTT Broker 地址
  port: 8083,                       // ⭐ WebSocket 端口
  path: '/mqtt',                    // WebSocket 路径
  topic: '⭐factory/device/+/data'  // ⭐ 订阅的主题（+ 是通配符）
};

// ============================================================
// Mock 数据（模拟 MQTT 推送的 JSON 格式）
// ============================================================
const mockMessages = [
  { topic: 'factory/device/001/data', payload: '{"deviceId":"001","deviceName":"1号车间温控","temperature":26.5,"humidity":45,"status":1,"timestamp":"2026-10-22 15:30:00"}' },
  { topic: 'factory/device/002/data', payload: '{"deviceId":"002","deviceName":"2号车间温控","temperature":32.8,"humidity":52,"status":1,"timestamp":"2026-10-22 15:30:05"}' },
  { topic: 'factory/device/003/data', payload: '{"deviceId":"003","deviceName":"3号车间温控","temperature":18.2,"humidity":38,"status":0,"timestamp":"2026-10-22 15:30:10"}' },
  { topic: 'factory/device/001/data', payload: '{"deviceId":"001","deviceName":"1号车间温控","temperature":27.1,"humidity":44,"status":1,"timestamp":"2026-10-22 15:30:15"}' },
  { topic: 'factory/device/002/data', payload: '{"deviceId":"002","deviceName":"2号车间温控","temperature":35.2,"humidity":55,"status":2,"timestamp":"2026-10-22 15:30:20"}' }
];

// ============================================================
// 核心逻辑 —— 不用改下面
// ============================================================

let mqttClient = null;
let mockIndex = 0;
let mockTimer = null;

// 组件渲染前：启动数据接收
function vnodeBeforeMount() {
  if (USE_MOCK) {
    console.log('[Mock 模式] 每 3 秒模拟一条 MQTT 消息');
    startMock();
  } else {
    connectMQTT();
  }
}

// 组件渲染后：初始化样式
function vnodeMounted() {
  // 给温度显示加个大数字样式
  const tempEl = document.getElementById(TEMP_DISPLAY_ID);
  if (tempEl) {
    Object.assign(tempEl.style, {
      fontSize: '48px',
      fontWeight: 'bold',
      fontFamily: 'DIN Alternate, Arial',
      color: '#00ffff',
      textShadow: '0 0 20px rgba(0,255,255,0.5)',
      textAlign: 'center'
    });
    tempEl.innerText = '--°C';
  }
}

// 组件更新后：保持样式不被覆盖
function vnodeUpdated() {
  const tempEl = document.getElementById(TEMP_DISPLAY_ID);
  if (tempEl) {
    Object.assign(tempEl.style, {
      fontSize: '48px',
      fontWeight: 'bold',
      color: '#00ffff'
    });
  }
}

// 组件销毁前：清理连接和定时器
function vnodeBeforeUpdate() {
  if (mockTimer) {
    clearInterval(mockTimer);
    mockTimer = null;
  }
  if (mqttClient && mqttClient.isConnected()) {
    mqttClient.disconnect();
  }
}

// ============================================================
// Mock 模式：定时模拟 MQTT 消息
// ============================================================
function startMock() {
  mockTimer = setInterval(() => {
    const msg = mockMessages[mockIndex % mockMessages.length];
    console.log(`[Mock] 收到消息 #${mockIndex + 1}:`, msg.payload);
    handleMQTTData(msg.topic, msg.payload);
    mockIndex++;
  }, 3000);
}

// ============================================================
// 真实 MQTT 连接（USE_MOCK = false 时使用）
// ============================================================
function connectMQTT() {
  if (typeof Paho === 'undefined') {
    console.error('[MQTT] 未找到 Paho MQTT 库，请先引入');
    console.log('[提示] 在 CIMPro 项目中添加 paho-mqtt.js 脚本引用');
    return;
  }

  const clientId = 'cimpro_' + Math.random().toString(16).substr(2, 8);
  mqttClient = new Paho.MQTT.Client(
    MQTT_CONFIG.broker,
    MQTT_CONFIG.port,
    MQTT_CONFIG.path,
    clientId
  );

  mqttClient.onConnectionLost = (responseObject) => {
    console.error('[MQTT] 连接丢失:', responseObject.errorMessage);
    // 5 秒后自动重连
    setTimeout(connectMQTT, 5000);
  };

  mqttClient.onMessageArrived = (message) => {
    console.log('[MQTT] 收到:', message.destinationName, message.payloadString);
    handleMQTTData(message.destinationName, message.payloadString);
  };

  mqttClient.connect({
    onSuccess: () => {
      console.log('[MQTT] 连接成功，订阅:', MQTT_CONFIG.topic);
      mqttClient.subscribe(MQTT_CONFIG.topic);
    },
    onFailure: (err) => {
      console.error('[MQTT] 连接失败:', err.errorMessage);
    }
  });
}

// ============================================================
// 数据处理：解析 JSON 并更新大屏组件
// ============================================================
function handleMQTTData(topic, payload) {
  try {
    const data = JSON.parse(payload);

    // 更新温度显示
    const tempEl = document.getElementById(TEMP_DISPLAY_ID);
    if (tempEl) {
      const temp = data.temperature;
      tempEl.innerText = temp + '°C';

      // 根据温度值变色：正常=青色，警告=黄色，危险=红色
      if (temp >= 35) {
        tempEl.style.color = '#ff4444';
        tempEl.style.textShadow = '0 0 20px rgba(255,68,68,0.6)';
      } else if (temp >= 30) {
        tempEl.style.color = '#ffaa00';
        tempEl.style.textShadow = '0 0 20px rgba(255,170,0,0.6)';
      } else {
        tempEl.style.color = '#00ffff';
        tempEl.style.textShadow = '0 0 20px rgba(0,255,255,0.5)';
      }
    }

    // 更新设备名称（可选）
    if (DEVICE_NAME_ID) {
      const nameEl = document.getElementById(DEVICE_NAME_ID);
      if (nameEl) nameEl.innerText = data.deviceName || '未知设备';
    }

    // 更新状态（可选）
    if (STATUS_ID) {
      const statusEl = document.getElementById(STATUS_ID);
      if (statusEl) {
        const statusMap = { 0: '已停止', 1: '运行中', 2: '告警' };
        const colorMap = { 0: '#888888', 1: '#00ff88', 2: '#ff4444' };
        statusEl.innerText = statusMap[data.status] || '未知';
        statusEl.style.color = colorMap[data.status] || '#888888';
      }
    }

  } catch (e) {
    console.error('[数据处理] JSON 解析失败:', e, '原始数据:', payload);
  }
}
