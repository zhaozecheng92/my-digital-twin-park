# 数字孪生园区后台

一个用于练习企业后台开发的 Vue 3 + TypeScript 项目，包含 Pinia、Vue Router、Element Plus、Axios 和 Mock.js。

## 本地运行

```bash
npm install
npm run dev
```

打开终端输出的本地地址即可。生产构建使用 `npm run build`。

## 演示账号

| 角色 | 账号 | 密码 | 权限 |
| --- | --- | --- | --- |
| 管理员 | `admin` | `123456` | 工作台、设备查询、新增、编辑、删除、角色权限说明 |
| 访客 | `visitor` | `123456` | 工作台、设备只读查询 |

## 已实现功能

- 登录成功后将 Mock Token 存入 `localStorage`；刷新页面后恢复会话，退出时清除 Token。
- 根据用户角色过滤 `meta.roles` 动态路由，通过 `router.addRoute` 注册授权路由，并从授权路由生成侧边栏菜单。
- Pinia 保存用户信息、角色与权限；页面指令控制新增、编辑、删除操作，Mock API 也会校验设备写入权限。
- 设备列表支持设备名、状态筛选及分页；点击设备名可查看设备详情，并支持新增、编辑、二次确认删除。
- 工作台可进入园区可视化大屏，使用 ECharts 展示能耗趋势、设备状态和楼栋设备分布，图表模拟数据每 3 秒刷新。
- 表单使用正则校验设备名、型号和所属区域。
- Axios 请求拦截器自动附加 Authorization 认证头；响应拦截器统一检查 `code`，并处理错误与过期登录。
- Mock.js 在浏览器本地生成设备数据，CRUD 无需后端服务。

## 代码入口

- `src/router/routes.ts`：常驻路由、角色路由及权限元数据。
- `src/router/permission.ts`：按用户角色过滤路由。
- `src/stores/user.ts`：Pinia 登录状态与动态路由状态。
- `src/mock/index.ts`：本地登录、设备列表及 CRUD Mock 接口。
- `src/utils/request.ts`：Axios 实例、拦截器和 Mock adapter。
- `src/views/device/index.vue`：设备查询与 CRUD 表单。

> 这是前端学习用 Mock 项目。演示账号、Token 与权限校验均在浏览器端模拟，真实企业系统仍须由服务端验证身份和权限。
