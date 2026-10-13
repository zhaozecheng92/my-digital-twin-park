<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: 'admin',
  password: '123456',
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.login(form)
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.push(redirect)
  } catch {
    // The Axios response interceptor displays the login error.
  } finally {
    loading.value = false
  }
}

function fillAccount(username: string) {
  form.username = username
  form.password = '123456'
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-head">
        <p class="eyebrow">Digital Twin Park</p>
        <h1>园区运维后台</h1>
        <p class="hint">账号密码登录，Token 写入 localStorage，按角色动态生成菜单。</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" size="large" placeholder="账号">
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            size="large"
            type="password"
            show-password
            placeholder="密码"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-button type="primary" size="large" class="submit" :loading="loading" @click="handleLogin">
          登录
        </el-button>
      </el-form>

      <div class="accounts">
        <button type="button" @click="fillAccount('admin')">管理员 admin / 123456</button>
        <button type="button" @click="fillAccount('visitor')">访客 visitor / 123456</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(34, 211, 238, 0.18), transparent 32%),
    linear-gradient(160deg, #07111f 0%, #0f172a 48%, #082f49 100%);
}

.login-card {
  width: min(420px, 100%);
  padding: 32px 28px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.86);
  border: 1px solid rgba(34, 211, 238, 0.18);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  color: #e2e8f0;
}

.login-head h1 {
  margin: 6px 0 8px;
  font-size: 28px;
}

.eyebrow {
  margin: 0;
  color: #22d3ee;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 12px;
}

.hint {
  margin: 0 0 24px;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.6;
}

.submit {
  width: 100%;
}

.accounts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 18px;
}

.accounts button {
  border: 1px dashed rgba(148, 163, 184, 0.35);
  background: transparent;
  color: #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
}

.accounts button:hover {
  border-color: #22d3ee;
  color: #22d3ee;
}

:deep(.el-input__wrapper) {
  background: #0b1220;
  box-shadow: 0 0 0 1px #1e293b inset;
}

:deep(.el-input__inner) {
  color: #e2e8f0;
}
</style>
