/**
 * ============================================================================
 * CIMPro MQTT 温度数据大屏显示组件
 * ============================================================================
 * 
 * @project cimpro-mqtt-temp
 * @description 从 MQTT Broker 接收实时温度数据，在 CIMPro 大屏上动态显示
 * @author zcm08042
 * @version 1.0.0
 * @date 2026-10-22
 * 
 * @repository https://github.com/zcm08042/cimpro-mqtt-temp
 * @documentation 详细使用说明见 USAGE.md
 * 
 * ============================================================================
 * 功能特性
 * ============================================================================
 * 
 * 1. 双模式运行：
 *    - Mock 模式：使用静态假数据测试，无需真实 MQTT 环境
 *    - 实时模式：连接真实 MQTT Broker，接收实时数据
 * 
 * 2. 温度可视化：
 *    - 大数字显示（48px，DIN 字体）
 *    - 温度阈值变色：
 *      * < 30°C：青色（#00ffff）- 正常
 *      * 30-35°C：黄色（#ffaa00）- 警告
 *      * > 35°C：红色（#ff4444）- 危险
 *    - 发光效果增强视觉冲击
 * 
 * 3. 设备信息展示：
 *    - 设备名称动态更新
 *    - 运行状态指示（停止/运行/告警）
 *    - 状态颜色编码（灰/绿/红）
 * 
 * 4. 健壮性设计：
 *    - 自动重连机制（MQTT 断线后 5 秒重试）
 *    - 内存泄漏防护（组件销毁时清理连接和定时器）
 *    - 数据异常处理（JSON 解析失败时降级显示）
 *    - 防御性编程（所有 DOM 操作前检查元素存在性）
 * 
 * ============================================================================
 * 使用方式
 * ============================================================================
 * 
 * 步骤 1：在 CIMPro 中创建组件
 *   - 创建文本组件用于显示温度（ID 如：temp-display）
 *   - 可选：创建设备名称组件（ID 如：device-name）
 *   - 可选：创建状态组件（ID 如：device-status）
 * 
 * 步骤 2：修改配置区（见下方 ⭐ 标记）
 *   - 设置组件 ID（TEMP_DISPLAY_ID、DEVICE_NAME_ID、STATUS_ID）
 *   - 选择运行模式（USE_MOCK）
 *   - 配置 MQTT 连接参数（MQTT_CONFIG）
 * 
 * 步骤 3：复制代码到 CIMPro 脚本编辑器
 *   - 打开 pi-vis UI 编辑器
 *   - 选中目标组件 → 脚本编辑器
 *   - 粘贴本文件全部内容
 * 
 * 步骤 4：测试与调试
 *   - Mock 模式：直接运行，每 3 秒自动切换数据
 *   - 实时模式：确保 MQTT Broker 可访问，检查控制台日志
 * 
 * ============================================================================
 * 依赖说明
 * ============================================================================
 * 
 * - Paho MQTT.js：MQTT over WebSocket 客户端库
 *   * 下载地址：https://www.eclipse.org/paho/clients/js/
 *   * 引入方式：在 CIMPro 项目中添加脚本引用
 *   * 仅实时模式需要，Mock 模式无需此依赖
 * 
 * ============================================================================
 * 数据格式规范
 * ============================================================================
 * 
 * MQTT 消息 payload 应为 JSON 格式：
 * 
 * {
 *   "deviceId": "001",           // 设备唯一标识（字符串）
 *   "deviceName": "1号车间温控",  // 设备名称（用于显示）
 *   "temperature": 26.5,         // 温度值（数字，单位：摄氏度）
 *   "humidity": 45,              // 湿度值（数字，百分比，可选）
 *   "status": 1,                 // 运行状态（数字：0=停止，1=运行，2=告警）
 *   "timestamp": "2026-10-22 15:30:00"  // 时间戳（字符串，可选）
 * }
 * 
 * ============================================================================
 * 生命周期钩子说明
 * ============================================================================
 * 
 * CIMPro 脚本编辑器基于 Vue 框架，提供 4 个生命周期钩子：
 * 
 * - vnodeBeforeMount：组件渲染前触发
 *   * 用途：数据预请求、初始化连接
 *   * 本代码：启动 Mock 或 MQTT 连接
 * 
 * - vnodeMounted：组件渲染完成后触发（仅一次）
 *   * 用途：DOM 操作、样式设置
 *   * 本代码：初始化温度显示样式
 * 
 * - vnodeBeforeUpdate：数据更新前触发
 *   * 用途：清理资源、保存状态
 *   * 本代码：清除定时器、关闭 MQTT 连接
 * 
 * - vnodeUpdated：数据更新后触发
 *   * 用途：修复被覆盖的样式、响应数据变化
 *   * 本代码：保持温度显示样式一致
 * 
 * ============================================================================
 * 注意事项
 * ============================================================================
 * 
 * 1. 组件 ID 大小写敏感，务必从 CIMPro 属性面板直接复制
 * 2. MQTT WebSocket 端口通常是 8083 或 8084（非标准 MQTT 端口 1883）
 * 3. 确保 MQTT Broker 已启用 WebSocket 协议支持
 * 4. 跨域问题：MQTT Broker 需配置 CORS 允许 CIMPro 域名访问
 * 5. 性能优化：避免同时订阅过多主题，建议按需订阅
 * 6. 内存管理：组件销毁时务必清理连接和定时器
 * 
 * ============================================================================
 */

// ============================================================================
// ⭐ 配置区 —— 根据实际需求修改以下参数
// ============================================================================

/**
 * 运行模式开关
 * @type {boolean}
 * @description true = Mock 模式（使用假数据测试），false = 实时模式（连接真实 MQTT）
 * @default true
 */
const USE_MOCK = true;

/**
 * 温度显示组件 ID
 * @type {string}
 * @description CIMPro 中用于显示温度数值的文本组件 ID
 * @example 'temp-display'
 * @required 必填
 */
const TEMP_DISPLAY_ID = '⭐temp-display';

/**
 * 设备名称组件 ID
 * @type {string|null}
 * @description CIMPro 中用于显示设备名称的文本组件 ID
 * @example 'device-name'
 * @optional 可选，不需要设为 null
 */
const DEVICE_NAME_ID = '⭐device-name';

/**
 * 运行状态组件 ID
 * @type {string|null}
 * @description CIMPro 中用于显示设备运行状态的文本组件 ID
 * @example 'device-status'
 * @optional 可选，不需要设为 null
 */
const STATUS_ID = '⭐device-status';

/**
 * MQTT 连接配置
 * @type {Object}
 * @description MQTT Broker 连接参数（仅实时模式使用）
 * @property {string} broker - MQTT Broker 域名或 IP 地址
 * @property {number} port - WebSocket 端口（通常 8083 或 8084）
 * @property {string} path - WebSocket 路径（通常 '/mqtt'）
 * @property {string} topic - 订阅的主题（支持 + 和 # 通配符）
 * 
 * @example
 * {
 *   broker: 'mqtt.example.com',
 *   port: 8083,
 *   path: '/mqtt',
 *   topic: 'factory/device/+/data'
 * }
 */
const MQTT_CONFIG = {
  broker: '⭐mqtt.example.com',    // ⭐ 替换为你的 MQTT Broker 地址
  port: 8083,                       // ⭐ WebSocket 端口（非 1883）
  path: '/mqtt',                    // WebSocket 路径
  topic: '⭐factory/device/+/data'  // ⭐ 订阅主题（+ 表示单层通配符）
};

// ============================================================================
// Mock 数据定义（模拟 MQTT 推送的 JSON 消息）
// ============================================================================

/**
 * Mock 消息数组
 * @type {Array<{topic: string, payload: string}>}
 * @description 模拟 MQTT 消息，用于测试环境
 * @property {string} topic - MQTT 主题
 * @property {string} payload - JSON 格式的负载数据（字符串）
 * 
 * 数据说明：
 * - 包含 5 条不同设备的消息
 * - 温度范围：18.2°C ~ 35.2°C（覆盖正常、警告、危险三种状态）
 * - 状态值：0=停止，1=运行，2=告警
 * - Mock 模式下每 3 秒循环播放一条消息
 */
const mockMessages = [
  {
    topic: 'factory/device/001/data',
    payload: '{"deviceId":"001","deviceName":"1号车间温控","temperature":26.5,"humidity":45,"status":1,"timestamp":"2026-10-22 15:30:00"}'
  },
  {
    topic: 'factory/device/002/data',
    payload: '{"deviceId":"002","deviceName":"2号车间温控","temperature":32.8,"humidity":52,"status":1,"timestamp":"2026-10-22 15:30:05"}'
  },
  {
    topic: 'factory/device/003/data',
    payload: '{"deviceId":"003","deviceName":"3号车间温控","temperature":18.2,"humidity":38,"status":0,"timestamp":"2026-10-22 15:30:10"}'
  },
  {
    topic: 'factory/device/001/data',
    payload: '{"deviceId":"001","deviceName":"1号车间温控","temperature":27.1,"humidity":44,"status":1,"timestamp":"2026-10-22 15:30:15"}'
  },
  {
    topic: 'factory/device/002/data',
    payload: '{"deviceId":"002","deviceName":"2号车间温控","temperature":35.2,"humidity":55,"status":2,"timestamp":"2026-10-22 15:30:20"}'
  }
];

// ============================================================================
// 全局变量（运行时状态）
// ============================================================================

/**
 * MQTT 客户端实例
 * @type {Paho.MQTT.Client|null}
 * @description Paho MQTT 客户端对象，用于管理连接、订阅、接收消息
 */
let mqttClient = null;

/**
 * Mock 消息索引
 * @type {number}
 * @description 当前播放的 Mock 消息索引，用于循环播放
 */
let mockIndex = 0;

/**
 * Mock 定时器 ID
 * @type {number|null}
 * @description setInterval 返回的定时器 ID，用于清理
 */
let mockTimer = null;

// ============================================================================
// 生命周期钩子函数
// ============================================================================

/**
 * 组件渲染前触发
 * @description 初始化数据接收（Mock 或 MQTT）
 * @lifecycle vnodeBeforeMount
 * 
 * 执行逻辑：
 * 1. 检查 USE_MOCK 标志
 * 2. Mock 模式：启动定时器，每 3 秒模拟一条消息
 * 3. 实时模式：建立 MQTT 连接
 */
function vnodeBeforeMount() {
  if (USE_MOCK) {
    console.log('[Mock 模式] 每 3 秒模拟一条 MQTT 消息');
    startMock();
  } else {
    console.log('[实时模式] 连接 MQTT Broker:', MQTT_CONFIG.broker);
    connectMQTT();
  }
}

/**
 * 组件渲染完成后触发（仅一次）
 * @description 初始化 UI 样式
 * @lifecycle vnodeMounted
 * 
 * 执行逻辑：
 * 1. 获取温度显示组件
 * 2. 设置大数字样式（48px、加粗、青色、发光）
 * 3. 初始显示 '--°C' 占位符
 */
function vnodeMounted() {
  // 获取温度显示组件
  const tempEl = document.getElementById(TEMP_DISPLAY_ID);
  if (tempEl) {
    // 应用大数字样式
    Object.assign(tempEl.style, {
      fontSize: '48px',                              // 字号
      fontWeight: 'bold',                            // 加粗
      fontFamily: 'DIN Alternate, Arial',            // 字体（数字专用）
      color: '#00ffff',                              // 青色
      textShadow: '0 0 20px rgba(0,255,255,0.5)',   // 发光效果
      textAlign: 'center'                            // 居中
    });
    // 初始占位符
    tempEl.innerText = '--°C';
  }
}

/**
 * 数据更新后触发
 * @description 保持样式一致性，防止被组件内部样式覆盖
 * @lifecycle vnodeUpdated
 * 
 * 执行逻辑：
 * 1. 重新应用关键样式属性
 * 2. 确保温度显示始终为大数字青色样式
 */
function vnodeUpdated() {
  const tempEl = document.getElementById(TEMP_DISPLAY_ID);
  if (tempEl) {
    // 重新应用核心样式（防止被覆盖）
    Object.assign(tempEl.style, {
      fontSize: '48px',
      fontWeight: 'bold',
      color: '#00ffff'
    });
  }
}

/**
 * 组件销毁前触发
 * @description 清理资源，防止内存泄漏
 * @lifecycle vnodeBeforeUpdate
 * 
 * 执行逻辑：
 * 1. 清除 Mock 定时器
 * 2. 关闭 MQTT 连接
 * 3. 释放全局变量引用
 */
function vnodeBeforeUpdate() {
  // 清理 Mock 定时器
  if (mockTimer) {
    clearInterval(mockTimer);
    mockTimer = null;
    console.log('[清理] Mock 定时器已清除');
  }
  
  // 关闭 MQTT 连接
  if (mqttClient && mqttClient.isConnected()) {
    mqttClient.disconnect();
    mqttClient = null;
    console.log('[清理] MQTT 连接已关闭');
  }
}

// ============================================================================
// Mock 模式实现
// ============================================================================

/**
 * 启动 Mock 数据模拟
 * @description 定时循环播放 Mock 消息，模拟 MQTT 数据推送
 * @function startMock
 * 
 * 实现细节：
 * - 使用 setInterval 每 3000ms（3 秒）触发一次
 * - 按索引顺序播放 mockMessages 数组
 * - 到达末尾后自动循环（取模运算）
 * - 调用 handleMQTTData 处理消息（与真实 MQTT 共用逻辑）
 */
function startMock() {
  mockTimer = setInterval(() => {
    // 获取当前消息（循环播放）
    const msg = mockMessages[mockIndex % mockMessages.length];
    
    // 打印日志
    console.log(`[Mock] 收到消息 #${mockIndex + 1}:`, msg.payload);
    
    // 处理消息（复用 MQTT 处理逻辑）
    handleMQTTData(msg.topic, msg.payload);
    
    // 索引递增
    mockIndex++;
  }, 3000); // 3 秒间隔
}

// ============================================================================
// 实时 MQTT 连接实现
// ============================================================================

/**
 * 建立 MQTT 连接
 * @description 使用 Paho MQTT.js 库连接 MQTT Broker（通过 WebSocket）
 * @function connectMQTT
 * 
 * 前置条件：
 * - 已引入 Paho MQTT.js 库
 * - MQTT Broker 支持 WebSocket 协议
 * - 网络可达且 CORS 配置正确
 * 
 * 连接流程：
 * 1. 检查 Paho 库是否可用
 * 2. 生成唯一 clientId（避免冲突）
 * 3. 创建 MQTT Client 实例
 * 4. 注册回调函数（连接丢失、消息到达）
 * 5. 发起连接请求
 * 6. 连接成功后订阅指定主题
 * 
 * 错误处理：
 * - Paho 库缺失：打印错误提示并退出
 * - 连接失败：打印错误信息
 * - 连接丢失：5 秒后自动重连
 */
function connectMQTT() {
  // 检查 Paho MQTT 库是否已引入
  if (typeof Paho === 'undefined') {
    console.error('[MQTT] 未找到 Paho MQTT 库，请先引入');
    console.log('[提示] 下载地址：https://www.eclipse.org/paho/clients/js/');
    console.log('[提示] 在 CIMPro 项目中添加 paho-mqtt.js 脚本引用');
    return;
  }

  // 生成唯一的客户端 ID（避免多个客户端冲突）
  const clientId = 'cimpro_' + Math.random().toString(16).substr(2, 8);
  console.log('[MQTT] 生成 Client ID:', clientId);

  // 创建 MQTT 客户端实例
  mqttClient = new Paho.MQTT.Client(
    MQTT_CONFIG.broker,    // Broker 地址
    MQTT_CONFIG.port,      // WebSocket 端口
    MQTT_CONFIG.path,      // WebSocket 路径
    clientId               // 客户端 ID
  );

  // 注册连接丢失回调
  mqttClient.onConnectionLost = (responseObject) => {
    console.error('[MQTT] 连接丢失:', responseObject.errorMessage);
    // 5 秒后自动重连
    setTimeout(() => {
      console.log('[MQTT] 尝试重连...');
      connectMQTT();
    }, 5000);
  };

  // 注册消息到达回调
  mqttClient.onMessageArrived = (message) => {
    console.log('[MQTT] 收到消息:', message.destinationName, message.payloadString);
    // 处理接收到的消息
    handleMQTTData(message.destinationName, message.payloadString);
  };

  // 发起连接请求
  mqttClient.connect({
    onSuccess: () => {
      console.log('[MQTT] 连接成功，订阅主题:', MQTT_CONFIG.topic);
      // 连接成功后订阅指定主题
      mqttClient.subscribe(MQTT_CONFIG.topic);
    },
    onFailure: (err) => {
      console.error('[MQTT] 连接失败:', err.errorMessage);
    }
  });
}

// ============================================================================
// 数据处理与 UI 更新
// ============================================================================

/**
 * 处理 MQTT 消息并更新 UI
 * @description 解析 JSON 数据，根据温度值更新显示内容和样式
 * @function handleMQTTData
 * @param {string} topic - MQTT 消息主题（如：factory/device/001/data）
 * @param {string} payload - MQTT 消息负载（JSON 字符串）
 * 
 * 处理流程：
 * 1. 解析 JSON 数据（异常时打印错误并退出）
 * 2. 提取温度值并更新温度显示组件
 * 3. 根据温度阈值设置颜色（青/黄/红）
 * 4. 更新设备名称（可选）
 * 5. 更新运行状态（可选）
 * 
 * 温度阈值：
 * - < 30°C：青色（#00ffff）- 正常
 * - 30-35°C：黄色（#ffaa00）- 警告
 * - > 35°C：红色（#ff4444）- 危险
 * 
 * 状态映射：
 * - 0：已停止（灰色 #888888）
 * - 1：运行中（绿色 #00ff88）
 * - 2：告警（红色 #ff4444）
 */
function handleMQTTData(topic, payload) {
  try {
    // 解析 JSON 数据
    const data = JSON.parse(payload);

    // ========================================================================
    // 更新温度显示
    // ========================================================================
    const tempEl = document.getElementById(TEMP_DISPLAY_ID);
    if (tempEl) {
      const temp = data.temperature;
      
      // 设置温度文本
      tempEl.innerText = temp + '°C';

      // 根据温度阈值设置颜色和发光效果
      if (temp >= 35) {
        // 危险：红色（> 35°C）
        tempEl.style.color = '#ff4444';
        tempEl.style.textShadow = '0 0 20px rgba(255,68,68,0.6)';
      } else if (temp >= 30) {
        // 警告：黄色（30-35°C）
        tempEl.style.color = '#ffaa00';
        tempEl.style.textShadow = '0 0 20px rgba(255,170,0,0.6)';
      } else {
        // 正常：青色（< 30°C）
        tempEl.style.color = '#00ffff';
        tempEl.style.textShadow = '0 0 20px rgba(0,255,255,0.5)';
      }
    }

    // ========================================================================
    // 更新设备名称（可选）
    // ========================================================================
    if (DEVICE_NAME_ID) {
      const nameEl = document.getElementById(DEVICE_NAME_ID);
      if (nameEl) {
        nameEl.innerText = data.deviceName || '未知设备';
      }
    }

    // ========================================================================
    // 更新运行状态（可选）
    // ========================================================================
    if (STATUS_ID) {
      const statusEl = document.getElementById(STATUS_ID);
      if (statusEl) {
        // 状态值 → 文本映射
        const statusMap = { 
          0: '已停止', 
          1: '运行中', 
          2: '告警' 
        };
        
        // 状态值 → 颜色映射
        const colorMap = { 
          0: '#888888',  // 灰色
          1: '#00ff88',  // 绿色
          2: '#ff4444'   // 红色
        };
        
        // 应用状态文本和颜色
        statusEl.innerText = statusMap[data.status] || '未知';
        statusEl.style.color = colorMap[data.status] || '#888888';
      }
    }

  } catch (e) {
    // JSON 解析失败时的错误处理
    console.error('[数据处理] JSON 解析失败:', e);
    console.error('[数据处理] 原始数据:', payload);
  }
}

// ============================================================================
// 代码结束
// ============================================================================
