<script setup lang="ts">
const rows = [
  { role: '管理员 admin', menus: '工作台 / 设备管理 / 系统管理', actions: '新增、编辑、删除' },
  { role: '访客 visitor', menus: '工作台 / 设备查看', actions: '仅查看列表与搜索' },
]
</script>

<template>
  <el-card shadow="never">
    <template #header>RBAC 权限说明</template>
    <p class="desc">
      登录后根据用户 <code>roles</code> 过滤 <code>asyncRoutes</code>，再用
      <code>router.addRoute</code> 注入。侧边栏只渲染当前角色有权访问的菜单。
    </p>
    <el-table :data="rows" border>
      <el-table-column prop="role" label="角色" width="180" />
      <el-table-column prop="menus" label="可见菜单" />
      <el-table-column prop="actions" label="设备权限" width="220" />
    </el-table>
  </el-card>
</template>

<style scoped>
.desc {
  margin: 0 0 16px;
  color: #64748b;
  line-height: 1.7;
}

code {
  padding: 2px 6px;
  border-radius: 4px;
  background: #eef2ff;
  color: #3730a3;
}
</style>
