// 权限常量定义（使用二进制字面量）
const PERMISSIONS = {
  MANAGE_USERS:       0b00000001,      // 1: 管理用户
  MANAGE_PERMISSIONS: 0b00000010, // 2: 管理权限
  MANAGE_EVENTS:      0b00000100,     // 4: 管理事件
  CREATE_EVENTS:      0b00001000,     // 8: 创建事件
  READ_OWN_EVENTS:    0b00010000,   // 16: 读取自己的事件
  READ_PUBLIC_EVENTS: 0b00100000, // 32: 读取公共事件
  UPLOAD_FILES:       0b01000000, // 64: 读取公共事件
};

    // 定义默认权限配置
const defaultPermissionConfigs = {
      admin: PERMISSIONS.MANAGE_USERS | 
             PERMISSIONS.MANAGE_PERMISSIONS | 
             PERMISSIONS.MANAGE_EVENTS |
             PERMISSIONS.CREATE_EVENTS |
             PERMISSIONS.READ_OWN_EVENTS |
             PERMISSIONS.UPLOAD_FILES|
             PERMISSIONS.READ_PUBLIC_EVENTS,
      
      user: PERMISSIONS.CREATE_EVENTS |
            PERMISSIONS.READ_OWN_EVENTS |
            PERMISSIONS.UPLOAD_FILES |
            PERMISSIONS.READ_PUBLIC_EVENTS,
      
      guest: PERMISSIONS.READ_PUBLIC_EVENTS
};

module.exports = {
    PERMISSIONS,
    defaultPermissionConfigs
}
