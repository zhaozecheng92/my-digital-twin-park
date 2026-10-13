<template>
  <div class="wrap">
    <h1>404</h1>
    <p>页面不存在。</p>
    <el-button type="primary" @click="$router.push('/')">返回工作台</el-button>
  </div>
</template>

<style scoped>
.wrap {
  min-height: 60vh;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
}
</style>
