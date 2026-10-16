<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <router-view v-slot="{ Component }">
    <keep-alive>
      <component :is="Component" :key="route.matched[0]?.name?.toString() ?? route.path" />
    </keep-alive>
  </router-view>
</template>
