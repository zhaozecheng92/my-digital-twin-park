<template>
  <div class="wrap">
    <h1>403</h1>
    <p>当前角色没有访问该页面的权限。</p>
    <el-button type="primary" @click="$router.push('/')">返回工作台</el-button>
  </div>
</template>

<style scoped>
.wrap {
  min-height: 100vh;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
}
</style>
